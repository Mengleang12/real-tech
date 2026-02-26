<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Traits\LogsAdminActivity;
use Illuminate\Http\Request;

class CategoryController extends Controller
{
    use LogsAdminActivity;

    public function index()
    {
        $categories = Category::orderBy('sort_order')->get();
        return response()->json(['categories' => $categories]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
        ]);

        $category = Category::create($request->only(['name', 'name_km', 'slug', 'description', 'icon_url', 'sort_order', 'is_active']));

        $this->logActivity($request, 'category_create', ['category_id' => $category->id, 'name' => $category->name]);

        return response()->json(['success' => true, 'category' => $category], 201);
    }

    public function update(Request $request, $id)
    {
        $category = Category::findOrFail($id);
        $category->update($request->only(['name', 'name_km', 'slug', 'description', 'icon_url', 'sort_order', 'is_active']));

        $this->logActivity($request, 'category_update', ['category_id' => $category->id, 'name' => $category->name]);

        return response()->json(['success' => true, 'category' => $category]);
    }

    public function destroy(Request $request, $id)
    {
        $category = Category::findOrFail($id);
        $name = $category->name;
        $category->delete();

        $this->logActivity($request, 'category_delete', ['category_id' => $id, 'name' => $name]);

        return response()->json(['success' => true, 'message' => 'Category deleted']);
    }
}

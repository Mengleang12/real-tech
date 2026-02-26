<?php

namespace App\Http\Controllers;

use App\Models\Brand;
use App\Traits\LogsAdminActivity;
use Illuminate\Http\Request;

class BrandController extends Controller
{
    use LogsAdminActivity;

    public function index()
    {
        $brands = Brand::orderBy('name')->get();
        return response()->json(['brands' => $brands]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
        ]);

        $brand = Brand::create($request->only(['name', 'slug', 'logo_url', 'is_active']));

        $this->logActivity($request, 'brand_create', ['brand_id' => $brand->id, 'name' => $brand->name]);

        return response()->json(['success' => true, 'brand' => $brand], 201);
    }

    public function update(Request $request, $id)
    {
        $brand = Brand::findOrFail($id);
        $brand->update($request->only(['name', 'slug', 'logo_url', 'is_active']));

        $this->logActivity($request, 'brand_update', ['brand_id' => $brand->id, 'name' => $brand->name]);

        return response()->json(['success' => true, 'brand' => $brand]);
    }

    public function destroy(Request $request, $id)
    {
        $brand = Brand::findOrFail($id);
        $name = $brand->name;
        $brand->delete();

        $this->logActivity($request, 'brand_delete', ['brand_id' => $id, 'name' => $name]);

        return response()->json(['success' => true, 'message' => 'Brand deleted']);
    }
}

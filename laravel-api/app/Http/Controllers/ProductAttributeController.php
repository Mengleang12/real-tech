<?php

namespace App\Http\Controllers;

use App\Models\ProductAttribute;
use App\Traits\LogsAdminActivity;
use Illuminate\Http\Request;

class ProductAttributeController extends Controller
{
    use LogsAdminActivity;

    public function index()
    {
        $attributes = ProductAttribute::orderBy('sort_order')->get();
        return response()->json(['attributes' => $attributes]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'required|in:text,number,select,boolean',
        ]);

        $data = $request->only(['name', 'name_km', 'icon', 'type', 'options', 'is_required', 'sort_order', 'is_active']);
        if (isset($data['options']) && is_array($data['options'])) {
            $data['options'] = $data['options'];
        }

        $attribute = ProductAttribute::create($data);

        $this->logActivity($request, 'attribute_create', ['attribute_id' => $attribute->id, 'name' => $attribute->name]);

        return response()->json(['success' => true, 'attribute' => $attribute], 201);
    }

    public function update(Request $request, $id)
    {
        $attribute = ProductAttribute::findOrFail($id);
        $data = $request->only(['name', 'name_km', 'icon', 'type', 'options', 'is_required', 'sort_order', 'is_active']);

        $attribute->update($data);

        $this->logActivity($request, 'attribute_update', ['attribute_id' => $attribute->id, 'name' => $attribute->name]);

        return response()->json(['success' => true, 'attribute' => $attribute]);
    }

    public function destroy(Request $request, $id)
    {
        $attribute = ProductAttribute::findOrFail($id);
        $name = $attribute->name;
        $attribute->delete();

        $this->logActivity($request, 'attribute_delete', ['attribute_id' => $id, 'name' => $name]);

        return response()->json(['success' => true, 'message' => 'Attribute deleted']);
    }
}

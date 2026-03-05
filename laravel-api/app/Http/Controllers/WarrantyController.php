<?php

namespace App\Http\Controllers;

use App\Models\Warranty;
use App\Traits\LogsAdminActivity;
use Illuminate\Http\Request;

class WarrantyController extends Controller
{
    use LogsAdminActivity;

    public function index()
    {
        $warranties = Warranty::orderBy('duration_days', 'asc')->get();
        return response()->json(['warranties' => $warranties]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:100',
            'duration_days' => 'required|integer|min:1|max:36500',
            'policy' => 'nullable|string|max:10000',
            'is_default' => 'nullable|boolean',
        ]);

        // If setting as default, unset others
        if ($request->boolean('is_default')) {
            Warranty::where('is_default', true)->update(['is_default' => false]);
        }

        $warranty = Warranty::create($request->only(['name', 'duration_days', 'policy', 'is_default']));

        $this->logActivity($request, 'admin_warranty_created', [
            'warranty_id' => $warranty->id,
            'name' => $warranty->name,
        ]);

        return response()->json(['warranty' => $warranty], 201);
    }

    public function update(Request $request, $id)
    {
        $warranty = Warranty::findOrFail($id);

        $request->validate([
            'name' => 'required|string|max:100',
            'duration_days' => 'required|integer|min:1|max:36500',
            'policy' => 'nullable|string|max:10000',
            'is_default' => 'nullable|boolean',
        ]);

        // If setting as default, unset others
        if ($request->boolean('is_default')) {
            Warranty::where('is_default', true)->where('id', '!=', $id)->update(['is_default' => false]);
        }

        $warranty->update($request->only(['name', 'duration_days', 'policy', 'is_default']));

        $this->logActivity($request, 'admin_warranty_updated', [
            'warranty_id' => $warranty->id,
            'name' => $warranty->name,
        ]);

        return response()->json(['warranty' => $warranty]);
    }

    public function destroy(Request $request, $id)
    {
        $warranty = Warranty::findOrFail($id);
        $name = $warranty->name;
        $warranty->delete();

        $this->logActivity($request, 'admin_warranty_deleted', [
            'warranty_id' => $id,
            'name' => $name,
        ]);

        return response()->json(['success' => true, 'message' => 'Warranty deleted']);
    }
}

<?php

namespace App\Http\Controllers;

use App\Models\Supplier;
use App\Traits\LogsAdminActivity;
use Illuminate\Http\Request;

class SupplierController extends Controller
{
    use LogsAdminActivity;

    public function index(Request $request)
    {
        $query = Supplier::orderBy('name');

        if ($request->has('q') && $request->q) {
            $q = $request->q;
            $query->where(function ($qb) use ($q) {
                $qb->where('name', 'like', "%{$q}%")
                   ->orWhere('phone', 'like', "%{$q}%");
            });
        }

        $suppliers = $query->get();
        return response()->json(['suppliers' => $suppliers]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:50',
            'address' => 'nullable|string|max:500',
        ]);

        $supplier = Supplier::create($request->only(['name', 'phone', 'address']));

        $this->logActivity($request, 'supplier_created', ['supplier_id' => $supplier->id, 'name' => $supplier->name]);

        return response()->json(['success' => true, 'supplier' => $supplier], 201);
    }

    public function update(Request $request, $id)
    {
        $supplier = Supplier::findOrFail($id);

        $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:50',
            'address' => 'nullable|string|max:500',
        ]);

        $supplier->update($request->only(['name', 'phone', 'address']));

        $this->logActivity($request, 'supplier_updated', ['supplier_id' => $supplier->id, 'name' => $supplier->name]);

        return response()->json(['success' => true, 'supplier' => $supplier]);
    }

    public function destroy(Request $request, $id)
    {
        $supplier = Supplier::findOrFail($id);
        $name = $supplier->name;
        $supplier->delete();

        $this->logActivity($request, 'supplier_deleted', ['supplier_id' => $id, 'name' => $name]);

        return response()->json(['success' => true]);
    }
}

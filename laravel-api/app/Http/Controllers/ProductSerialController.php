<?php

namespace App\Http\Controllers;

use App\Models\ProductSerial;
use App\Models\Product;
use App\Events\SerialChanged;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ProductSerialController extends Controller
{
    /**
     * List serials for a product (with optional filters).
     */
    public function index(Request $request)
    {
        $query = ProductSerial::with(['product:id,name,icon_url', 'variant:id,combination,sku,price_adjustment']);

        if ($request->product_id) {
            $query->where('product_id', $request->product_id);
        }
        if ($request->status && $request->status !== 'all') {
            $query->where('status', $request->status);
        }
        if ($request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('serial_number', 'LIKE', "%{$search}%")
                  ->orWhere('barcode', 'LIKE', "%{$search}%");
            });
        }

        $serials = $query->orderByDesc('created_at')->paginate($request->limit ?? 50);

        return response()->json([
            'serials' => $serials->items(),
            'pagination' => [
                'current_page' => $serials->currentPage(),
                'total_pages' => $serials->lastPage(),
                'total' => $serials->total(),
                'per_page' => $serials->perPage(),
            ],
        ]);
    }

    /**
     * Add serial numbers to a product (bulk or single).
     */
    public function store(Request $request)
    {
        $request->validate([
            'product_id' => 'required|integer|exists:products,id',
            'variant_id' => 'nullable|integer',
            'serials' => 'required|array|min:1',
            'serials.*.serial_number' => 'required|string|max:255',
            'serials.*.notes' => 'nullable|string',
        ]);

        // Check stock limit if variant specified
        if ($request->variant_id) {
            $variant = \App\Models\ProductVariant::find($request->variant_id);
            if ($variant) {
                $existingCount = ProductSerial::where('product_id', $request->product_id)
                    ->where('variant_id', $request->variant_id)
                    ->whereIn('status', ['available', 'reserved'])
                    ->count();
                $maxAllowed = $variant->stock_quantity - $existingCount;
                if (count($request->serials) > $maxAllowed) {
                    return response()->json([
                        'success' => false,
                        'message' => "Cannot add " . count($request->serials) . " serial(s). Only {$maxAllowed} slot(s) available (stock: {$variant->stock_quantity}, existing serials: {$existingCount}).",
                    ], 422);
                }
            }
        }

        $created = [];
        $duplicates = [];

        foreach ($request->serials as $item) {
            $sn = trim($item['serial_number']);
            if (!$sn) continue;

            // Check if serial already exists for this product
            $exists = ProductSerial::where('serial_number', $sn)
                ->where('product_id', $request->product_id)
                ->exists();

            if ($exists) {
                $duplicates[] = $sn;
                continue;
            }

            // Generate unique barcode (prefix + short code)
            $barcode = 'RT-' . strtoupper(Str::random(8));
            while (ProductSerial::where('barcode', $barcode)->exists()) {
                $barcode = 'RT-' . strtoupper(Str::random(8));
            }

            $serial = ProductSerial::create([
                'product_id' => $request->product_id,
                'variant_id' => $request->variant_id,
                'serial_number' => $sn,
                'barcode' => $barcode,
                'status' => 'available',
                'notes' => $item['notes'] ?? null,
            ]);

            $created[] = $serial;
        }

        $createdIds = array_map(fn($s) => $s->id, $created);
        try {
            event(new SerialChanged('added', $request->product_id, $request->variant_id, $createdIds));
        } catch (\Exception $e) {
            \Log::warning('SerialChanged broadcast failed: ' . $e->getMessage());
        }

        return response()->json([
            'success' => true,
            'message' => count($created) . ' serial(s) added' . (count($duplicates) > 0 ? ', ' . count($duplicates) . ' duplicate(s) skipped' : ''),
            'created' => $created,
            'duplicates' => $duplicates,
        ]);
    }

    /**
     * Update a serial record.
     */
    public function update(Request $request, $id)
    {
        $serial = ProductSerial::findOrFail($id);
        $serial->update($request->only(['serial_number', 'barcode', 'status', 'notes', 'variant_id']));
        try {
            event(new SerialChanged('updated', $serial->product_id, $serial->variant_id));
        } catch (\Exception $e) {
            \Log::warning('SerialChanged broadcast failed: ' . $e->getMessage());
        }
        return response()->json(['success' => true, 'serial' => $serial->fresh()]);
    }

    /**
     * Delete a serial record.
     */
    public function destroy($id)
    {
        $serial = ProductSerial::findOrFail($id);
        $productId = $serial->product_id;
        $variantId = $serial->variant_id;
        $serial->delete();
        try {
            event(new SerialChanged('deleted', $productId, $variantId));
        } catch (\Exception $e) {
            \Log::warning('SerialChanged broadcast failed: ' . $e->getMessage());
        }
        return response()->json(['success' => true]);
    }

    /**
     * Lookup by barcode/serial - used in quick scan during sale.
     */
    public function lookup(Request $request)
    {
        $code = trim($request->code);
        if (!$code) {
            return response()->json(['found' => false, 'message' => 'No code provided'], 400);
        }

        // Search by barcode first, then serial_number
        $serial = ProductSerial::with(['product:id,name,icon_url', 'variant:id,combination,sku,price_adjustment,stock_quantity'])
            ->where(function ($q) use ($code) {
                $q->where('barcode', $code)
                  ->orWhere('serial_number', $code);
            })
            ->first();

        if (!$serial) {
            return response()->json(['found' => false, 'message' => 'Serial/barcode not found']);
        }

        if ($serial->status === 'sold') {
            return response()->json([
                'found' => true,
                'status' => 'sold',
                'message' => 'This item has already been sold',
                'serial' => $serial,
            ]);
        }

        if ($serial->status === 'defective') {
            return response()->json([
                'found' => true,
                'status' => 'defective',
                'message' => 'This item is marked as defective',
                'serial' => $serial,
            ]);
        }

        // Load full product with all variants for cart
        $product = Product::with(['variants' => function ($q) {
            $q->where('is_active', true);
        }])->find($serial->product_id);

        return response()->json([
            'found' => true,
            'status' => 'available',
            'serial' => $serial,
            'product' => $product ? [
                'id' => $product->id,
                'name' => $product->name,
                'icon_url' => $product->icon_url,
                'variants' => $product->variants->map(fn($v) => [
                    'id' => $v->id,
                    'combination' => $v->combination,
                    'sku' => $v->sku,
                    'stock_quantity' => $v->stock_quantity,
                    'price_adjustment' => $v->price_adjustment,
                    'is_active' => $v->is_active,
                ]),
            ] : null,
        ]);
    }

    /**
     * Print labels for selected serials.
     */
    public function getForPrint(Request $request)
    {
        $ids = $request->ids ?? [];
        $serials = ProductSerial::with(['product:id,name', 'variant:id,combination,price_adjustment'])
            ->whereIn('id', $ids)
            ->get();

        return response()->json(['serials' => $serials]);
    }
}

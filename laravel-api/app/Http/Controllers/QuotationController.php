<?php

namespace App\Http\Controllers;

use App\Models\Quotation;
use App\Models\QuotationItem;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\SystemSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class QuotationController extends Controller
{
    public function index(Request $request)
    {
        $query = Quotation::with(['items', 'customer'])
            ->orderByDesc('created_at');

        if ($request->has('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->has('search') && $request->search) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('quotation_number', 'like', "%{$s}%")
                  ->orWhere('customer_name', 'like', "%{$s}%")
                  ->orWhere('customer_phone', 'like', "%{$s}%");
            });
        }

        $perPage = $request->get('limit', 20);
        $paginated = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'quotations' => $paginated->items(),
            'pagination' => [
                'current_page' => $paginated->currentPage(),
                'total_pages' => $paginated->lastPage(),
                'total' => $paginated->total(),
                'per_page' => $paginated->perPage(),
            ],
        ]);
    }

    public function show($id)
    {
        $quotation = Quotation::with(['items', 'customer'])->findOrFail($id);
        return response()->json(['success' => true, 'quotation' => $quotation]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|integer',
            'items.*.product_name' => 'required|string',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_price' => 'required|numeric|min:0',
        ]);

        return DB::transaction(function () use ($request) {
            $quotation = Quotation::create([
                'quotation_number' => Quotation::generateNumber(),
                'customer_id' => $request->customer_id,
                'customer_name' => $request->customer_name,
                'customer_phone' => $request->customer_phone,
                'customer_email' => $request->customer_email,
                'status' => $request->status ?? 'draft',
                'discount_amount' => $request->discount_amount ?? 0,
                'discount_type' => $request->discount_type,
                'currency' => $request->currency ?? 'USD',
                'valid_until' => $request->valid_until,
                'notes' => $request->notes,
                'terms' => $request->terms,
                'created_by' => $request->user()?->id,
            ]);

            $subtotal = 0;
            foreach ($request->items as $item) {
                $itemDiscount = $item['discount'] ?? 0;
                $discountType = $item['discount_type'] ?? null;
                $qty = $item['quantity'];
                $price = $item['unit_price'];

                if ($discountType === 'percent') {
                    $effectiveDiscount = $price * $qty * ($itemDiscount / 100);
                } else {
                    $effectiveDiscount = $itemDiscount;
                }

                $lineTotal = ($price * $qty) - $effectiveDiscount;

                QuotationItem::create([
                    'quotation_id' => $quotation->id,
                    'product_id' => $item['product_id'],
                    'variant_id' => $item['variant_id'] ?? null,
                    'product_name' => $item['product_name'],
                    'variant_label' => $item['variant_label'] ?? null,
                    'quantity' => $qty,
                    'unit_price' => $price,
                    'discount' => $itemDiscount,
                    'discount_type' => $discountType,
                    'line_total' => max(0, $lineTotal),
                ]);

                $subtotal += max(0, $lineTotal);
            }

            // Apply overall discount
            $overallDiscount = $request->discount_amount ?? 0;
            if ($request->discount_type === 'percent') {
                $overallDiscount = $subtotal * ($overallDiscount / 100);
            }

            $total = max(0, $subtotal - $overallDiscount);

            $quotation->update([
                'subtotal' => $subtotal,
                'total' => $total,
            ]);

            return response()->json([
                'success' => true,
                'quotation' => $quotation->load('items'),
            ], 201);
        });
    }

    public function update(Request $request, $id)
    {
        $quotation = Quotation::findOrFail($id);

        return DB::transaction(function () use ($request, $quotation) {
            // Update items if provided
            if ($request->has('items')) {
                $quotation->items()->delete();

                $subtotal = 0;
                foreach ($request->items as $item) {
                    $itemDiscount = $item['discount'] ?? 0;
                    $discountType = $item['discount_type'] ?? null;
                    $qty = $item['quantity'];
                    $price = $item['unit_price'];

                    if ($discountType === 'percent') {
                        $effectiveDiscount = $price * $qty * ($itemDiscount / 100);
                    } else {
                        $effectiveDiscount = $itemDiscount;
                    }

                    $lineTotal = ($price * $qty) - $effectiveDiscount;

                    QuotationItem::create([
                        'quotation_id' => $quotation->id,
                        'product_id' => $item['product_id'],
                        'variant_id' => $item['variant_id'] ?? null,
                        'product_name' => $item['product_name'],
                        'variant_label' => $item['variant_label'] ?? null,
                        'quantity' => $qty,
                        'unit_price' => $price,
                        'discount' => $itemDiscount,
                        'discount_type' => $discountType,
                        'line_total' => max(0, $lineTotal),
                    ]);

                    $subtotal += max(0, $lineTotal);
                }

                $discountAmount = $request->discount_amount ?? $quotation->discount_amount;
                $discountType = $request->discount_type ?? $quotation->discount_type;
                $overallDiscount = $discountAmount;
                if ($discountType === 'percent') {
                    $overallDiscount = $subtotal * ($discountAmount / 100);
                }

                $quotation->subtotal = $subtotal;
                $quotation->total = max(0, $subtotal - $overallDiscount);
            }

            $quotation->fill($request->only([
                'customer_id', 'customer_name', 'customer_phone', 'customer_email',
                'status', 'discount_amount', 'discount_type', 'currency',
                'valid_until', 'notes', 'terms',
            ]));

            $quotation->save();

            return response()->json([
                'success' => true,
                'quotation' => $quotation->load('items'),
            ]);
        });
    }

    public function updateStatus(Request $request, $id)
    {
        $request->validate(['status' => 'required|in:draft,sent,accepted,rejected,expired,converted']);

        $quotation = Quotation::findOrFail($id);
        $quotation->status = $request->status;
        $quotation->save();

        return response()->json(['success' => true, 'quotation' => $quotation]);
    }

    public function destroy($id)
    {
        $quotation = Quotation::findOrFail($id);
        $quotation->delete();

        return response()->json(['success' => true, 'message' => 'Quotation deleted']);
    }

    /**
     * Convert a quotation to a sale.
     */
    public function convertToSale($id)
    {
        $quotation = Quotation::with('items')->findOrFail($id);

        if ($quotation->status === 'converted') {
            return response()->json(['error' => 'Quotation already converted'], 400);
        }

        // Return the quotation data formatted for the sale creation dialog
        return response()->json([
            'success' => true,
            'sale_data' => [
                'customer_id' => $quotation->customer_id,
                'customer_name' => $quotation->customer_name,
                'items' => $quotation->items->map(function ($item) {
                    return [
                        'product_id' => $item->product_id,
                        'variant_id' => $item->variant_id,
                        'product_name' => $item->product_name,
                        'variant_label' => $item->variant_label,
                        'quantity' => $item->quantity,
                        'unit_price' => $item->unit_price,
                        'discount' => $item->discount,
                        'discount_type' => $item->discount_type,
                    ];
                }),
                'discount_amount' => $quotation->discount_amount,
                'discount_type' => $quotation->discount_type,
                'notes' => $quotation->notes,
                'currency' => $quotation->currency,
                'quotation_id' => $quotation->id,
            ],
        ]);
    }

    /**
     * Mark quotation as converted after sale is created.
     */
    public function markConverted(Request $request, $id)
    {
        $quotation = Quotation::findOrFail($id);
        $quotation->status = 'converted';
        $quotation->converted_sale_id = $request->sale_id;
        $quotation->save();

        return response()->json(['success' => true]);
    }

    /**
     * Public view for shared quotations.
     */
    public function publicView($number)
    {
        $quotation = Quotation::with('items')
            ->where('quotation_number', $number)
            ->firstOrFail();

        $branding = [
            'site_name' => SystemSetting::getValue('site_name', 'Realtech Computer'),
            'site_tagline' => SystemSetting::getValue('site_tagline', ''),
            'site_logo_url' => SystemSetting::getValue('site_logo_url', ''),
            'support_email' => SystemSetting::getValue('support_email', ''),
            'support_phone' => SystemSetting::getValue('support_phone', ''),
            'site_address' => SystemSetting::getValue('site_address', ''),
            'primary_color' => SystemSetting::getValue('primary_color', '#2563eb'),
        ];

        return response()->json([
            'success' => true,
            'quotation' => $quotation,
            'branding' => $branding,
        ]);
    }
}

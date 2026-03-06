<?php

namespace App\Http\Controllers;

use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\SalePayment;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Customer;
use App\Traits\LogsAdminActivity;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class SaleController extends Controller
{
    use LogsAdminActivity;

    /**
     * Create a sale from admin panel (POS-style)
     */
    public function createSale(Request $request)
    {
        $request->validate([
            'customer_type' => 'required|in:existing,new',
            'customer_id' => 'required_if:customer_type,existing|nullable|integer',
            'customer_name' => 'nullable|string|max:255',
            'customer_phone' => 'nullable|string|max:50',
            'customer_email' => 'nullable|email|max:255',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|integer',
            'items.*.variant_id' => 'nullable|integer',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.price' => 'required|numeric|min:0',
            'items.*.serial_numbers' => 'nullable|array',
            'items.*.serial_numbers.*' => 'nullable|string|max:255',
            'items.*.discount' => 'nullable|numeric|min:0',
            'items.*.discount_type' => 'nullable|in:amount,percent',
            'payment_status' => 'required|in:paid,pending,partial,unpaid',
            'sale_discount' => 'nullable|numeric|min:0',
            'sale_discount_type' => 'nullable|in:amount,percent',
            'notes' => 'nullable|string|max:500',
            'warranty_period' => 'nullable|string|max:100',
            'delivery_fee' => 'nullable|numeric|min:0',
            'paid_amount' => 'nullable|numeric|min:0',
            'paid_method' => 'nullable|string|max:50',
            'sale_date' => 'nullable|date',
        ]);

        DB::beginTransaction();

        try {
            // Resolve or create customer
            if ($request->customer_type === 'existing') {
                $customer = Customer::find($request->customer_id);
                if (!$customer) {
                    return response()->json(['error' => 'Customer not found'], 404);
                }
            } else {
                $customerName = $request->customer_name ?: 'Walk-in Customer';
                $isWalkin = $customerName === 'Walk-in Customer' && !$request->customer_email && !$request->customer_phone;

                if ($isWalkin) {
                    $customer = Customer::where('email', 'walkin@guest.local')->first();
                    if (!$customer) {
                        $customer = Customer::create([
                            'full_name' => 'Walk-in Customer',
                            'email' => 'walkin@guest.local',
                            'password_hash' => bcrypt(Str::random(32)),
                            'address' => $request->customer_address,
                        ]);
                    }
                } else {
                    $customer = Customer::create([
                        'full_name' => $customerName,
                        'phone' => $request->customer_phone,
                        'email' => $request->customer_email ?? 'walkin_' . Str::random(8) . '@guest.local',
                        'password_hash' => bcrypt(Str::random(32)),
                        'address' => $request->customer_address,
                    ]);
                }
            }

            $saleDiscount = $request->sale_discount ?? 0;
            $saleDiscountType = $request->sale_discount_type ?? 'amount';

            // First pass: compute subtotal for proportional sale discount
            $subtotal = 0;
            foreach ($request->items as $item) {
                $subtotal += $item['price'] * $item['quantity'];
            }

            $saleDiscountAmount = $saleDiscountType === 'percent'
                ? $subtotal * min($saleDiscount, 100) / 100
                : min($saleDiscount, $subtotal);

            $saleStatus = match ($request->payment_status) {
                'paid' => 'paid',
                'partial' => 'pending',
                'unpaid' => 'pending',
                default => 'pending',
            };

            // Validate stock availability first
            foreach ($request->items as $item) {
                $product = Product::find($item['product_id']);
                if (!$product) continue;

                $qty = $item['quantity'];
                $variant = isset($item['variant_id']) ? ProductVariant::find($item['variant_id']) : null;

                $availableStock = $variant ? ($variant->stock_quantity ?? 0) : ($product->stock_quantity ?? 0);

                if ($availableStock < $qty) {
                    $name = $product->name . ($variant ? ' (' . ($variant->sku ?? 'variant') . ')' : '');
                    return response()->json([
                        'error' => "Insufficient stock for {$name}. Available: {$availableStock}, Requested: {$qty}",
                    ], 422);
                }
            }

            // Collect all product names, serial numbers, and compute total
            $productNames = [];
            $allSerialNumbers = [];
            $deliveryFee = $request->delivery_fee ?? 0;
            $totalAmount = $subtotal - $saleDiscountAmount + $deliveryFee;
            $firstItemDiscount = 0;
            $firstItemDiscountType = null;
            $firstOriginalPrice = 0;
            $firstProductId = null;

            foreach ($request->items as $idx => $item) {
                $product = Product::find($item['product_id']);
                if (!$product) continue;

                $qty = $item['quantity'];
                $variant = isset($item['variant_id']) ? ProductVariant::find($item['variant_id']) : null;
                $originalPrice = $variant ? ($variant->price_adjustment ?? $product->price) : $product->price;

                // Collect product name (with quantity indicator)
                $productNames[] = $qty > 1 ? $product->name . ' ×' . $qty : $product->name;
                for ($i = 0; $i < $qty; $i++) {
                    $serialNumbers = $item['serial_numbers'] ?? [];
                    $allSerialNumbers[] = $serialNumbers[$i] ?? null;
                }

                // Keep first item's info for the sale record
                if ($idx === 0) {
                    $firstItemDiscount = $item['discount'] ?? 0;
                    $firstItemDiscountType = $item['discount_type'] ?? null;
                    $firstOriginalPrice = $originalPrice;
                    $firstProductId = $product->id;
                }

                // Deduct stock in bulk
                if ($variant) {
                    $variant->decrement('stock_quantity', $qty);
                } else {
                    $product->decrement('stock_quantity', $qty);
                    $product->refresh();
                    $product->updateStockStatus();
                }
            }

            // Build comma-separated serial numbers (filter out nulls)
            $serialNumberStr = collect($allSerialNumbers)->filter()->implode(',') ?: null;

            // Create a single sale record
            $saleDate = $request->sale_date ? $request->sale_date . ' ' . now()->format('H:i:s') : now()->toDateTimeString();

            $sale = new Sale([
                'customer_id' => $customer->id,
                'product_id' => $firstProductId,
                'product_name' => implode(', ', $productNames),
                'serial_number' => $serialNumberStr,
                'amount' => round($totalAmount, 2),
                'original_price' => $subtotal,
                'item_discount' => $firstItemDiscount,
                'item_discount_type' => $firstItemDiscountType,
                'sale_discount' => $saleDiscountAmount > 0 ? round($saleDiscountAmount, 2) : 0,
                'sale_discount_type' => $saleDiscount > 0 ? $saleDiscountType : null,
                'currency' => 'USD',
                'status' => $saleStatus,
                'paid_at' => $saleStatus === 'paid' ? now() : null,
                'notes' => $request->notes,
                'warranty_period' => $request->warranty_period,
                'delivery_fee' => $deliveryFee > 0 ? round($deliveryFee, 2) : 0,
            ]);
            $sale->created_at = $saleDate;
            $sale->updated_at = $saleDate;
            $sale->save();

            // Create sale_items for each item in the cart
            foreach ($request->items as $item) {
                $product = Product::find($item['product_id']);
                if (!$product) continue;

                $qty = $item['quantity'];
                $variant = isset($item['variant_id']) ? ProductVariant::find($item['variant_id']) : null;
                $unitPrice = $item['price'];
                $itemSerials = $item['serial_numbers'] ?? [];

                SaleItem::create([
                    'sale_id' => $sale->id,
                    'product_id' => $product->id,
                    'variant_id' => $variant?->id,
                    'product_name' => $product->name,
                    'quantity' => $qty,
                    'unit_price' => $unitPrice,
                    'total_price' => $unitPrice * $qty,
                    'discount' => $item['discount'] ?? 0,
                    'discount_type' => $item['discount_type'] ?? null,
                    'serial_numbers' => !empty($itemSerials) ? implode(',', array_filter($itemSerials)) : null,
                ]);

                // Mark serials as sold
                if (!empty($itemSerials)) {
                    $filteredSerials = array_filter($itemSerials);
                    if (!empty($filteredSerials)) {
                        \App\Models\ProductSerial::where('product_id', $product->id)
                            ->whereIn('serial_number', $filteredSerials)
                            ->update([
                                'status' => 'sold',
                                'sale_id' => $sale->id,
                            ]);
                    }
                }
            }

            // Create initial payment record
            if ($request->payment_status === 'paid') {
                SalePayment::create([
                    'sale_id' => $sale->id,
                    'amount' => round($totalAmount, 2),
                    'method' => 'cash',
                    'note' => 'Full payment',
                    'paid_at' => now(),
                ]);
            } elseif ($request->payment_status === 'partial') {
                $paidAmount = $request->paid_amount ?? 0;
                if ($paidAmount > 0) {
                    SalePayment::create([
                        'sale_id' => $sale->id,
                        'amount' => round($paidAmount, 2),
                        'method' => $request->paid_method ?? 'cash',
                        'note' => 'Initial partial payment',
                        'paid_at' => now(),
                    ]);
                }
            }


            $this->logActivity($request, 'admin_sale_created', [
                'customer_id' => $customer->id,
                'customer_name' => $customer->full_name,
                'customer_type' => $request->customer_type,
                'payment_status' => $request->payment_status,
                'total_amount' => round($totalAmount, 2),
                'items_count' => count($request->items),
                'notes' => $request->notes,
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Sale created successfully',
                'orders' => [$sale],
                'customer' => [
                    'id' => $customer->id,
                    'full_name' => $customer->full_name,
                    'email' => $customer->email,
                    'phone' => $customer->phone,
                ],
                'total_amount' => round($totalAmount, 2),
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'Failed to create sale: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Search customers for admin sale
     */
    public function searchCustomers(Request $request)
    {
        $search = $request->get('q', '');
        if (strlen($search) < 2) {
            return response()->json(['customers' => []]);
        }

        $customers = Customer::where(function ($q) use ($search) {
            $q->where('full_name', 'like', "%{$search}%")
              ->orWhere('email', 'like', "%{$search}%")
              ->orWhere('phone', 'like', "%{$search}%");
        })
        ->select('id', 'full_name', 'email', 'phone')
        ->limit(10)
        ->get();

        return response()->json(['customers' => $customers]);
    }

    /**
     * Search products for admin sale
     */
    public function searchProducts(Request $request)
    {
        $search = $request->get('q', '');

        $query = Product::with('variants');

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('name_km', 'like', "%{$search}%")
                  ->orWhere('id', $search)
                  ->orWhereHas('variants', function ($vq) use ($search) {
                      $vq->where('sku', 'like', "%{$search}%");
                  });
            });
        }

        $products = $query->select('id', 'name', 'name_km', 'icon_url')
            ->limit(20)
            ->get()
            ->map(function ($p) {
                return [
                    'id' => $p->id,
                    'name' => $p->name,
                    'icon_url' => $p->icon_url,
                    'variants' => $p->variants->where('is_active', true)->map(function ($v) {
                        return [
                            'id' => $v->id,
                            'combination' => $v->combination,
                            'sku' => $v->sku,
                            'stock_quantity' => $v->stock_quantity,
                            'price_adjustment' => $v->price_adjustment,
                            'purchase_price' => $v->purchase_price,
                        ];
                    })->values(),
                ];
            });

        return response()->json(['products' => $products]);
    }

    /**
     * Admin sales dashboard with comprehensive stats
     */
    public function dashboard(Request $request)
    {
        $days = $request->get('days', 30);
        $from = $request->get('from');
        $to = $request->get('to');

        $query = Sale::query();

        if ($from && $to) {
            $query->whereBetween('created_at', [$from, $to . ' 23:59:59']);
        } else {
            $query->where('created_at', '>=', now()->subDays($days));
        }

        $totalSales = (clone $query)->count();
        $paidSales = (clone $query)->where('status', 'paid')->count();
        $pendingSales = (clone $query)->where('status', 'pending')->count();
        $totalRevenue = (clone $query)->where('status', 'paid')->sum('amount');
        $avgSaleValue = $paidSales > 0 ? $totalRevenue / $paidSales : 0;

        $revenueByDate = (clone $query)->where('status', 'paid')
            ->select(DB::raw('DATE(paid_at) as date'), DB::raw('SUM(amount) as revenue'), DB::raw('COUNT(*) as orders'))
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        // Use sale_items for accurate per-product revenue attribution
        $topProductsQuery = SaleItem::join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->where('sales.status', 'paid');
        if ($from && $to) {
            $topProductsQuery->whereBetween('sales.created_at', [$from, $to . ' 23:59:59']);
        } else {
            $topProductsQuery->where('sales.created_at', '>=', now()->subDays($days));
        }
        $topProducts = $topProductsQuery
            ->select('sale_items.product_id', 'sale_items.product_name', DB::raw('SUM(sale_items.total_price) as revenue'), DB::raw('SUM(sale_items.quantity) as sales'))
            ->groupBy('sale_items.product_id', 'sale_items.product_name')
            ->orderByDesc('sales')
            ->limit(10)
            ->get();

        $recentSales = Sale::with('user:id,email,full_name,phone')
            ->where('status', 'paid')
            ->orderByDesc('paid_at')
            ->limit(10)
            ->get();

        $products = Product::with('variants')->get();
        $lowStockCount = 0;
        $outOfStockCount = 0;
        $totalStockValue = 0;

        foreach ($products as $product) {
            $variants = $product->variants->where('is_active', true);
            $totalStock = $variants->count() > 0
                ? $variants->sum('stock_quantity')
                : ($product->stock_quantity ?? 0);
            $threshold = $product->low_stock_threshold ?? 5;
            $price = $product->price ?? 0;

            $totalStockValue += $totalStock * $price;

            if ($totalStock <= 0) {
                $outOfStockCount++;
            } elseif ($totalStock <= $threshold) {
                $lowStockCount++;
            }
        }

        return response()->json([
            'success' => true,
            'stats' => [
                'total_orders' => $totalSales,
                'paid_orders' => $paidSales,
                'pending_orders' => $pendingSales,
                'total_revenue' => round($totalRevenue, 2),
                'avg_order_value' => round($avgSaleValue, 2),
                'low_stock_count' => $lowStockCount,
                'out_of_stock_count' => $outOfStockCount,
                'total_stock_value' => round($totalStockValue, 2),
            ],
            'revenue_by_date' => $revenueByDate,
            'top_products' => $topProducts,
            'recent_sales' => $recentSales,
        ]);
    }

    /**
     * Stock overview for all products with variants
     */
    public function stockOverview(Request $request)
    {
        $query = Product::with(['variants', 'categoryRelation', 'brand']);

        if ($request->has('stock_status')) {
            $status = $request->stock_status;
            if ($status === 'low_stock') {
                $query->where('stock_status', 'low_stock');
            } elseif ($status === 'out_of_stock') {
                $query->where('stock_status', 'out_of_stock');
            } elseif ($status === 'in_stock') {
                $query->where('stock_status', 'in_stock');
            }
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('name_km', 'like', "%{$search}%");
            });
        }

        $perPage = $request->get('limit', 20);
        $products = $query->orderBy('name')->paginate($perPage);

        $items = $products->getCollection()->map(function ($product) {
            $variants = $product->variants->where('is_active', true);
            $totalStock = $variants->count() > 0
                ? $variants->sum('stock_quantity')
                : ($product->stock_quantity ?? 0);
            $threshold = $product->low_stock_threshold ?? 5;

            return [
                'id' => $product->id,
                'name' => $product->name,
                'icon_url' => $product->icon_url,
                'price' => $product->price,
                'category' => $product->categoryRelation?->name ?? $product->category,
                'brand' => $product->brand?->name,
                'stock_quantity' => $product->stock_quantity,
                'low_stock_threshold' => $threshold,
                'stock_status' => $totalStock <= 0 ? 'out_of_stock' : ($totalStock <= $threshold ? 'low_stock' : 'in_stock'),
                'total_variant_stock' => $totalStock,
                'variants' => $variants->map(function ($v) {
                    return [
                        'id' => $v->id,
                        'combination' => $v->combination,
                        'sku' => $v->sku,
                        'stock_quantity' => $v->stock_quantity,
                        'price_adjustment' => $v->price_adjustment,
                        'is_active' => $v->is_active,
                    ];
                })->values(),
            ];
        });

        return response()->json([
            'success' => true,
            'products' => $items,
            'pagination' => [
                'current_page' => $products->currentPage(),
                'total_pages' => $products->lastPage(),
                'total' => $products->total(),
                'per_page' => $products->perPage(),
            ],
        ]);
    }

    /**
     * Update stock for a product or variant
     */
    public function updateStock(Request $request, $productId)
    {
        $request->validate([
            'variant_id' => 'nullable|integer',
            'stock_quantity' => 'required|integer|min:0',
            'reason' => 'nullable|string|max:255',
        ]);

        $product = Product::find($productId);
        if (!$product) {
            return response()->json(['error' => 'Product not found'], 404);
        }

        if ($request->variant_id) {
            $variant = ProductVariant::where('id', $request->variant_id)
                ->where('product_id', $productId)
                ->first();

            if (!$variant) {
                return response()->json(['error' => 'Variant not found'], 404);
            }

            $oldQty = $variant->stock_quantity;
            $variant->update(['stock_quantity' => $request->stock_quantity]);

            $this->logActivity($request, 'stock_update', [
                'product_id' => $productId,
                'product_name' => $product->name,
                'variant_id' => $variant->id,
                'variant_sku' => $variant->sku,
                'old_quantity' => $oldQty,
                'new_quantity' => $request->stock_quantity,
                'reason' => $request->reason,
            ]);
        } else {
            $oldQty = $product->stock_quantity;
            $product->update(['stock_quantity' => $request->stock_quantity]);
            $product->updateStockStatus();

            $this->logActivity($request, 'stock_update', [
                'product_id' => $productId,
                'product_name' => $product->name,
                'old_quantity' => $oldQty,
                'new_quantity' => $request->stock_quantity,
                'reason' => $request->reason,
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Stock updated successfully',
        ]);
    }

    /**
     * Bulk update stock for multiple products/variants
     */
    public function bulkUpdateStock(Request $request)
    {
        $request->validate([
            'updates' => 'required|array|min:1',
            'updates.*.product_id' => 'required|integer',
            'updates.*.variant_id' => 'nullable|integer',
            'updates.*.stock_quantity' => 'required|integer|min:0',
        ]);

        $updated = 0;

        foreach ($request->updates as $update) {
            if (!empty($update['variant_id'])) {
                $variant = ProductVariant::where('id', $update['variant_id'])
                    ->where('product_id', $update['product_id'])
                    ->first();
                if ($variant) {
                    $variant->update(['stock_quantity' => $update['stock_quantity']]);
                    $updated++;
                }
            } else {
                $product = Product::find($update['product_id']);
                if ($product) {
                    $product->update(['stock_quantity' => $update['stock_quantity']]);
                    $product->updateStockStatus();
                    $updated++;
                }
            }
        }

        $this->logActivity($request, 'bulk_stock_update', [
            'count' => $updated,
        ]);

        return response()->json([
            'success' => true,
            'message' => "{$updated} stock record(s) updated",
            'updated_count' => $updated,
        ]);
    }

    /**
     * Deduct stock when sale is paid (called internally)
     */
    public static function deductStock(Sale $sale, ?int $variantId = null): void
    {
        $product = Product::find($sale->product_id);
        if (!$product) return;

        if ($variantId) {
            $variant = ProductVariant::where('id', $variantId)
                ->where('product_id', $sale->product_id)
                ->first();
            if ($variant && $variant->stock_quantity > 0) {
                $variant->decrement('stock_quantity');
            }
        } else {
            if ($product->stock_quantity > 0) {
                $product->decrement('stock_quantity');
                $product->refresh();
                $product->updateStockStatus();
            }
        }
    }

    /**
     * Restore stock from sale_items when sale is deleted or cancelled
     */
    public static function restoreStock(Sale $sale): void
    {
        $saleItems = SaleItem::where('sale_id', $sale->id)->get();

        if ($saleItems->isEmpty()) {
            // Fallback for old sales without sale_items
            $product = Product::find($sale->product_id);
            if (!$product) return;

            $variants = ProductVariant::where('product_id', $sale->product_id)->where('is_active', true)->get();
            if ($variants->count() > 0) {
                $variant = $variants->first();
                if ($variant) {
                    $variant->increment('stock_quantity');
                }
            } else {
                $product->increment('stock_quantity');
                $product->refresh();
                $product->updateStockStatus();
            }
            return;
        }

        // Restore stock for each sale item
        foreach ($saleItems as $saleItem) {
            $product = Product::find($saleItem->product_id);
            if (!$product) continue;

            if ($saleItem->variant_id) {
                $variant = ProductVariant::where('id', $saleItem->variant_id)
                    ->where('product_id', $saleItem->product_id)
                    ->first();
                if ($variant) {
                    $variant->increment('stock_quantity', $saleItem->quantity);
                }
            } else {
                $product->increment('stock_quantity', $saleItem->quantity);
                $product->refresh();
                $product->updateStockStatus();
            }
        }
    }
}

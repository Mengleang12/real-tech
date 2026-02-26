<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
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
            'items.*.discount' => 'nullable|numeric|min:0',
            'items.*.discount_type' => 'nullable|in:amount,percent',
            'payment_status' => 'required|in:paid,pending,partial,unpaid',
            'sale_discount' => 'nullable|numeric|min:0',
            'sale_discount_type' => 'nullable|in:amount,percent',
            'notes' => 'nullable|string|max:500',
        ]);

        DB::beginTransaction();

        try {
            // Resolve or create customer
            if ($request->customer_type === 'existing') {
                $user = User::find($request->customer_id);
                if (!$user) {
                    return response()->json(['error' => 'Customer not found'], 404);
                }
            } else {
                $customerName = $request->customer_name ?: 'Walk-in Customer';
                $isWalkin = $customerName === 'Walk-in Customer' && !$request->customer_email && !$request->customer_phone;

                if ($isWalkin) {
                    // Reuse or create a shared walk-in user
                    $user = User::where('email', 'walkin@guest.local')->first();
                    if (!$user) {
                        $user = User::create([
                            'full_name' => 'Walk-in Customer',
                            'email' => 'walkin@guest.local',
                            'password_hash' => bcrypt(Str::random(32)),
                        ]);
                    }
                } else {
                    $user = User::create([
                        'full_name' => $customerName,
                        'phone' => $request->customer_phone,
                        'email' => $request->customer_email ?? 'walkin_' . Str::random(8) . '@guest.local',
                        'password_hash' => bcrypt(Str::random(32)),
                    ]);
                }
            }

            $orders = [];
            $totalAmount = 0;

            // Calculate sale-level discount ratio
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

            $saleDiscountRatio = $subtotal > 0 ? $saleDiscountAmount / $subtotal : 0;

            // Map payment_status to order status
            $orderStatus = match ($request->payment_status) {
                'paid' => 'paid',
                'partial' => 'pending',
                'unpaid' => 'pending',
                default => 'pending',
            };

            foreach ($request->items as $item) {
                $product = Product::find($item['product_id']);
                if (!$product) continue;

                $qty = $item['quantity'];
                $unitPrice = $item['price'];

                // Apply sale-level discount proportionally
                $finalUnitPrice = round($unitPrice * (1 - $saleDiscountRatio), 2);
                $totalAmount += $finalUnitPrice * $qty;

                for ($i = 0; $i < $qty; $i++) {
                    $order = Order::create([
                        'user_id' => $user->id,
                        'product_id' => $product->id,
                        'product_name' => $product->name,
                        'amount' => $finalUnitPrice,
                        'currency' => 'USD',
                        'status' => $orderStatus,
                        'paid_at' => $orderStatus === 'paid' ? now() : null,
                    ]);

                    // Deduct stock if paid
                    if ($orderStatus === 'paid') {
                        self::deductStock($order, $item['variant_id'] ?? null);
                    }

                    $orders[] = $order;
                }
            }

            $this->logActivity($request, 'admin_sale_created', [
                'customer_id' => $user->id,
                'customer_name' => $user->full_name,
                'customer_type' => $request->customer_type,
                'payment_status' => $request->payment_status,
                'total_amount' => $totalAmount,
                'items_count' => count($request->items),
                'notes' => $request->notes,
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Sale created successfully',
                'orders' => $orders,
                'customer' => [
                    'id' => $user->id,
                    'full_name' => $user->full_name,
                    'email' => $user->email,
                    'phone' => $user->phone,
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

        $customers = User::where(function ($q) use ($search) {
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
                  ->orWhere('name_km', 'like', "%{$search}%");
            });
        }

        $products = $query->select('id', 'name', 'name_km', 'icon_url', 'price', 'stock_quantity')
            ->limit(20)
            ->get()
            ->map(function ($p) {
                return [
                    'id' => $p->id,
                    'name' => $p->name,
                    'icon_url' => $p->icon_url,
                    'price' => $p->price,
                    'stock_quantity' => $p->stock_quantity,
                    'variants' => $p->variants->where('is_active', true)->map(function ($v) {
                        return [
                            'id' => $v->id,
                            'combination' => $v->combination,
                            'sku' => $v->sku,
                            'stock_quantity' => $v->stock_quantity,
                            'price_adjustment' => $v->price_adjustment,
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

        $query = Order::query();

        if ($from && $to) {
            $query->whereBetween('created_at', [$from, $to . ' 23:59:59']);
        } else {
            $query->where('created_at', '>=', now()->subDays($days));
        }

        // Overall stats
        $totalOrders = (clone $query)->count();
        $paidOrders = (clone $query)->where('status', 'paid')->count();
        $pendingOrders = (clone $query)->where('status', 'pending')->count();
        $totalRevenue = (clone $query)->where('status', 'paid')->sum('amount');
        $avgOrderValue = $paidOrders > 0 ? $totalRevenue / $paidOrders : 0;

        // Revenue by date
        $revenueByDate = (clone $query)->where('status', 'paid')
            ->select(DB::raw('DATE(paid_at) as date'), DB::raw('SUM(amount) as revenue'), DB::raw('COUNT(*) as orders'))
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        // Top selling products
        $topProducts = (clone $query)->where('status', 'paid')
            ->select('product_id', 'product_name', DB::raw('SUM(amount) as revenue'), DB::raw('COUNT(*) as sales'))
            ->groupBy('product_id', 'product_name')
            ->orderByDesc('sales')
            ->limit(10)
            ->get();

        // Recent sales
        $recentSales = Order::with('user:id,email,full_name')
            ->where('status', 'paid')
            ->orderByDesc('paid_at')
            ->limit(10)
            ->get();

        // Stock overview
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
                'total_orders' => $totalOrders,
                'paid_orders' => $paidOrders,
                'pending_orders' => $pendingOrders,
                'total_revenue' => round($totalRevenue, 2),
                'avg_order_value' => round($avgOrderValue, 2),
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
     * Deduct stock when order is paid (called internally)
     */
    public static function deductStock(Order $order, ?int $variantId = null): void
    {
        $product = Product::find($order->product_id);
        if (!$product) return;

        if ($variantId) {
            $variant = ProductVariant::where('id', $variantId)
                ->where('product_id', $order->product_id)
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
}

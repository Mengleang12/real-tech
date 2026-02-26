<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Traits\LogsAdminActivity;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SaleController extends Controller
{
    use LogsAdminActivity;

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
            // Try to deduct from product-level stock
            if ($product->stock_quantity > 0) {
                $product->decrement('stock_quantity');
                $product->refresh();
                $product->updateStockStatus();
            }
        }
    }
}

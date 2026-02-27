<?php

namespace App\Http\Controllers;

use App\Models\Sale;
use App\Models\User;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\PurchaseItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AnalyticsController extends Controller
{
    public function dashboard(Request $request)
    {
        // ... keep existing code
        $from = $request->input('from');
        $to = $request->input('to');
        $tzOffset = $request->input('tz_offset');

        if ($from && $to) {
            if ($tzOffset) {
                $tz = new \DateTimeZone($tzOffset);
                $startDate = new \DateTime($from . ' 00:00:00', $tz);
                $startDate->setTimezone(new \DateTimeZone('UTC'));
                $endDate = new \DateTime($to . ' 23:59:59', $tz);
                $endDate->setTimezone(new \DateTimeZone('UTC'));
                $startDate = \Carbon\Carbon::instance($startDate);
                $endDate = \Carbon\Carbon::instance($endDate);
            } else {
                $startDate = \Carbon\Carbon::parse($from)->startOfDay();
                $endDate = \Carbon\Carbon::parse($to)->endOfDay();
            }
        } else {
            $days = $request->input('days', 30);
            $startDate = now()->subDays($days)->startOfDay();
            $endDate = now()->endOfDay();
        }

        $sales = Sale::where('created_at', '>=', $startDate)
            ->where('created_at', '<=', $endDate)
            ->get();
        $paidSales = $sales->where('status', 'paid');

        $totalUsers = User::count();
        $newUsers = User::where('created_at', '>=', $startDate)->where('created_at', '<=', $endDate)->count();

        $stats = [
            'total_users' => $totalUsers,
            'new_users' => $newUsers,
            'total_orders' => $sales->count(),
            'paid_orders' => $paidSales->count(),
            'total_revenue' => $paidSales->sum('amount'),
            'avg_order_value' => $paidSales->count() > 0 ? $paidSales->sum('amount') / $paidSales->count() : 0,
            'conversion_rate' => $sales->count() > 0 ? ($paidSales->count() / $sales->count()) * 100 : 0,
        ];

        $revenueByDate = Sale::where('status', 'paid')
            ->where('created_at', '>=', $startDate)
            ->where('created_at', '<=', $endDate)
            ->select(
                DB::raw('DATE(created_at) as date'),
                DB::raw('SUM(amount) as revenue'),
                DB::raw('COUNT(*) as orders')
            )
            ->groupBy(DB::raw('DATE(created_at)'))
            ->orderBy('date')
            ->get();

        $ordersByStatus = Sale::where('created_at', '>=', $startDate)
            ->where('created_at', '<=', $endDate)
            ->select('status', DB::raw('COUNT(*) as count'))
            ->groupBy('status')
            ->get();

        $recentOrders = Sale::with('user:id,email,full_name')
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get();

        $topProducts = Sale::where('status', 'paid')
            ->where('created_at', '>=', $startDate)
            ->where('created_at', '<=', $endDate)
            ->select('product_id', 'product_name', DB::raw('SUM(amount) as revenue'), DB::raw('COUNT(*) as sales'))
            ->groupBy('product_id', 'product_name')
            ->orderByDesc('revenue')
            ->limit(5)
            ->get();

        return response()->json([
            'success' => true,
            'stats' => $stats,
            'revenue_by_date' => $revenueByDate,
            'orders_by_status' => $ordersByStatus,
            'recent_orders' => $recentOrders,
            'top_products' => $topProducts,
        ]);
    }

    /**
     * Profit analysis: compare purchase cost vs sale revenue per product
     */
    public function profitAnalysis(Request $request)
    {
        $search = $request->input('search', '');
        $sortBy = $request->input('sort_by', 'profit');
        $sortDir = $request->input('sort_dir', 'desc');
        $perPage = $request->input('limit', 50);

        // Get all products
        $productsQuery = Product::select('id', 'name', 'icon_url', 'price', 'stock_quantity');
        if ($search) {
            $productsQuery->where('name', 'like', "%{$search}%");
        }
        $products = $productsQuery->get();

        $result = [];

        foreach ($products as $product) {
            // Purchase cost: sum of (unit_cost * quantity) from purchase_items for completed/received purchases
            $purchaseData = PurchaseItem::where('product_id', $product->id)
                ->whereHas('purchase', function ($q) {
                    $q->whereIn('status', ['received', 'completed']);
                })
                ->selectRaw('SUM(total_cost) as total_cost, SUM(quantity) as total_qty')
                ->first();

            // Purchase expenses allocated proportionally
            $purchaseIds = PurchaseItem::where('product_id', $product->id)
                ->whereHas('purchase', function ($q) {
                    $q->whereIn('status', ['received', 'completed']);
                })
                ->pluck('purchase_id')
                ->unique();

            $totalExpenses = 0;
            foreach ($purchaseIds as $purchaseId) {
                $purchase = Purchase::with(['items', 'expenses'])->find($purchaseId);
                if (!$purchase) continue;
                $purchaseTotal = $purchase->items->sum('total_cost');
                if ($purchaseTotal <= 0) continue;

                $productItemCost = $purchase->items->where('product_id', $product->id)->sum('total_cost');
                $ratio = $productItemCost / $purchaseTotal;

                // Proportional share of delivery_fee + other_expense + expenses
                $expenseSum = $purchase->delivery_fee + $purchase->other_expense + $purchase->expenses->sum('amount');
                $totalExpenses += $expenseSum * $ratio;
            }

            $totalPurchaseCost = ($purchaseData->total_cost ?? 0) + $totalExpenses;
            $totalPurchaseQty = $purchaseData->total_qty ?? 0;
            $avgCostPerUnit = $totalPurchaseQty > 0 ? $totalPurchaseCost / $totalPurchaseQty : 0;

            // Sale revenue: sum of amount from paid sales
            $saleData = Sale::where('product_id', $product->id)
                ->where('status', 'paid')
                ->selectRaw('SUM(amount) as total_revenue, COUNT(*) as total_sold')
                ->first();

            $totalRevenue = $saleData->total_revenue ?? 0;
            $totalSold = $saleData->total_sold ?? 0;
            $avgSalePrice = $totalSold > 0 ? $totalRevenue / $totalSold : $product->price;

            $profit = $totalRevenue - $totalPurchaseCost;
            $margin = $totalRevenue > 0 ? ($profit / $totalRevenue) * 100 : 0;

            $result[] = [
                'product_id' => $product->id,
                'product_name' => $product->name,
                'icon_url' => $product->icon_url,
                'current_price' => (float) $product->price,
                'stock_quantity' => $product->stock_quantity,
                'total_purchase_cost' => round($totalPurchaseCost, 2),
                'total_purchase_qty' => (int) $totalPurchaseQty,
                'avg_cost_per_unit' => round($avgCostPerUnit, 2),
                'total_expenses' => round($totalExpenses, 2),
                'total_revenue' => round((float) $totalRevenue, 2),
                'total_sold' => (int) $totalSold,
                'avg_sale_price' => round((float) $avgSalePrice, 2),
                'profit' => round((float) $profit, 2),
                'margin' => round((float) $margin, 1),
            ];
        }

        // Sort
        usort($result, function ($a, $b) use ($sortBy, $sortDir) {
            $valA = $a[$sortBy] ?? 0;
            $valB = $b[$sortBy] ?? 0;
            return $sortDir === 'asc' ? $valA <=> $valB : $valB <=> $valA;
        });

        // Summary
        $totalCost = array_sum(array_column($result, 'total_purchase_cost'));
        $totalRev = array_sum(array_column($result, 'total_revenue'));
        $totalProfit = array_sum(array_column($result, 'profit'));

        return response()->json([
            'success' => true,
            'products' => $result,
            'summary' => [
                'total_cost' => round($totalCost, 2),
                'total_revenue' => round($totalRev, 2),
                'total_profit' => round($totalProfit, 2),
                'overall_margin' => $totalRev > 0 ? round(($totalProfit / $totalRev) * 100, 1) : 0,
                'product_count' => count($result),
            ],
        ]);
    }
}

<?php

namespace App\Http\Controllers;

use App\Models\Sale;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\PurchaseItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class SalesReportController extends Controller
{
    /**
     * Product Sales Breakdown: units & revenue per product per month
     */
    public function productSales(Request $request)
    {
        $from = $request->input('from', now()->subMonths(6)->startOfMonth()->toDateString());
        $to = $request->input('to', now()->endOfDay()->toDateString());

        // Monthly breakdown per product
        $monthly = Sale::where('status', 'paid')
            ->whereBetween('paid_at', [$from . ' 00:00:00', $to . ' 23:59:59'])
            ->select(
                'product_id',
                'product_name',
                DB::raw("DATE_FORMAT(paid_at, '%Y-%m') as month"),
                DB::raw('COUNT(*) as quantity'),
                DB::raw('SUM(amount) as revenue')
            )
            ->groupBy('product_id', 'product_name', DB::raw("DATE_FORMAT(paid_at, '%Y-%m')"))
            ->orderBy('month')
            ->orderByDesc('revenue')
            ->get();

        // Summary per product
        $summary = Sale::where('status', 'paid')
            ->whereBetween('paid_at', [$from . ' 00:00:00', $to . ' 23:59:59'])
            ->select(
                'product_id',
                'product_name',
                DB::raw('COUNT(*) as total_quantity'),
                DB::raw('SUM(amount) as total_revenue'),
                DB::raw('AVG(amount) as avg_price')
            )
            ->groupBy('product_id', 'product_name')
            ->orderByDesc('total_revenue')
            ->get();

        // Add icon_url from products table
        $productIds = $summary->pluck('product_id')->unique();
        $products = Product::whereIn('id', $productIds)->pluck('icon_url', 'id');

        $summaryData = $summary->map(function ($item) use ($products) {
            return array_merge($item->toArray(), [
                'icon_url' => $products[$item->product_id] ?? null,
                'total_revenue' => round((float) $item->total_revenue, 2),
                'avg_price' => round((float) $item->avg_price, 2),
            ]);
        });

        return response()->json([
            'success' => true,
            'monthly' => $monthly,
            'summary' => $summaryData,
            'period' => ['from' => $from, 'to' => $to],
        ]);
    }

    /**
     * Revenue Trend: daily/weekly/monthly revenue over time
     */
    public function revenueTrend(Request $request)
    {
        $from = $request->input('from', now()->subMonths(6)->startOfMonth()->toDateString());
        $to = $request->input('to', now()->endOfDay()->toDateString());
        $groupBy = $request->input('group_by', 'monthly'); // daily, weekly, monthly

        $dateFormat = match ($groupBy) {
            'daily' => '%Y-%m-%d',
            'weekly' => '%x-W%v',
            'monthly' => '%Y-%m',
            default => '%Y-%m',
        };

        $trend = Sale::where('status', 'paid')
            ->whereBetween('paid_at', [$from . ' 00:00:00', $to . ' 23:59:59'])
            ->select(
                DB::raw("DATE_FORMAT(paid_at, '{$dateFormat}') as period"),
                DB::raw('COUNT(*) as orders'),
                DB::raw('SUM(amount) as revenue'),
                DB::raw('AVG(amount) as avg_order_value')
            )
            ->groupBy('period')
            ->orderBy('period')
            ->get()
            ->map(function ($item) {
                return [
                    'period' => $item->period,
                    'orders' => (int) $item->orders,
                    'revenue' => round((float) $item->revenue, 2),
                    'avg_order_value' => round((float) $item->avg_order_value, 2),
                ];
            });

        // Totals
        $totals = Sale::where('status', 'paid')
            ->whereBetween('paid_at', [$from . ' 00:00:00', $to . ' 23:59:59'])
            ->selectRaw('COUNT(*) as total_orders, SUM(amount) as total_revenue, AVG(amount) as avg_order_value')
            ->first();

        return response()->json([
            'success' => true,
            'trend' => $trend,
            'totals' => [
                'total_orders' => (int) $totals->total_orders,
                'total_revenue' => round((float) $totals->total_revenue, 2),
                'avg_order_value' => round((float) ($totals->avg_order_value ?? 0), 2),
            ],
            'period' => ['from' => $from, 'to' => $to, 'group_by' => $groupBy],
        ]);
    }

    /**
     * Profit Report by Period
     */
    public function profitByPeriod(Request $request)
    {
        $from = $request->input('from', now()->subMonths(6)->startOfMonth()->toDateString());
        $to = $request->input('to', now()->endOfDay()->toDateString());

        // Revenue per product in period
        $salesData = Sale::where('status', 'paid')
            ->whereBetween('paid_at', [$from . ' 00:00:00', $to . ' 23:59:59'])
            ->select(
                'product_id',
                'product_name',
                DB::raw('COUNT(*) as total_sold'),
                DB::raw('SUM(amount) as total_revenue')
            )
            ->groupBy('product_id', 'product_name')
            ->get();

        $result = [];
        $totalRevenue = 0;
        $totalCost = 0;

        foreach ($salesData as $sale) {
            $product = Product::select('id', 'name', 'icon_url', 'price')->find($sale->product_id);

            // Calculate cost from purchases
            $purchaseData = PurchaseItem::where('product_id', $sale->product_id)
                ->whereHas('purchase', fn($q) => $q->whereIn('status', ['received', 'completed']))
                ->selectRaw('SUM(total_cost) as total_cost, SUM(quantity) as total_qty')
                ->first();

            $totalPurchaseQty = $purchaseData->total_qty ?? 0;
            $totalPurchaseCost = $purchaseData->total_cost ?? 0;

            // Proportional expense allocation
            $purchaseIds = PurchaseItem::where('product_id', $sale->product_id)
                ->whereHas('purchase', fn($q) => $q->whereIn('status', ['received', 'completed']))
                ->pluck('purchase_id')->unique();

            $totalExpenses = 0;
            foreach ($purchaseIds as $purchaseId) {
                $purchase = Purchase::with(['items', 'expenses'])->find($purchaseId);
                if (!$purchase) continue;
                $purchaseTotal = $purchase->items->sum('total_cost');
                if ($purchaseTotal <= 0) continue;
                $productItemCost = $purchase->items->where('product_id', $sale->product_id)->sum('total_cost');
                $ratio = $productItemCost / $purchaseTotal;
                $expenseSum = $purchase->delivery_fee + $purchase->other_expense + $purchase->expenses->sum('amount');
                $totalExpenses += $expenseSum * $ratio;
            }

            $landedCost = $totalPurchaseCost + $totalExpenses;
            $avgCostPerUnit = $totalPurchaseQty > 0 ? $landedCost / $totalPurchaseQty : 0;
            $costOfGoodsSold = $avgCostPerUnit * $sale->total_sold;
            $revenue = (float) $sale->total_revenue;
            $profit = $revenue - $costOfGoodsSold;
            $margin = $revenue > 0 ? ($profit / $revenue) * 100 : 0;

            $totalRevenue += $revenue;
            $totalCost += $costOfGoodsSold;

            $result[] = [
                'product_id' => $sale->product_id,
                'product_name' => $sale->product_name,
                'icon_url' => $product->icon_url ?? null,
                'total_sold' => (int) $sale->total_sold,
                'total_revenue' => round($revenue, 2),
                'cost_of_goods' => round($costOfGoodsSold, 2),
                'profit' => round($profit, 2),
                'margin' => round($margin, 1),
            ];
        }

        usort($result, fn($a, $b) => $b['profit'] <=> $a['profit']);

        $totalProfit = $totalRevenue - $totalCost;

        return response()->json([
            'success' => true,
            'products' => $result,
            'summary' => [
                'total_revenue' => round($totalRevenue, 2),
                'total_cost' => round($totalCost, 2),
                'total_profit' => round($totalProfit, 2),
                'overall_margin' => $totalRevenue > 0 ? round(($totalProfit / $totalRevenue) * 100, 1) : 0,
            ],
            'period' => ['from' => $from, 'to' => $to],
        ]);
    }

    /**
     * Customer Sales Report: top customers, purchase frequency, spending
     */
    public function customerReport(Request $request)
    {
        $from = $request->input('from', now()->subMonths(6)->startOfMonth()->toDateString());
        $to = $request->input('to', now()->endOfDay()->toDateString());
        $limit = $request->input('limit', 50);

        $customers = Sale::where('status', 'paid')
            ->whereBetween('paid_at', [$from . ' 00:00:00', $to . ' 23:59:59'])
            ->join('users', 'sales.user_id', '=', 'users.id')
            ->select(
                'sales.user_id',
                'users.full_name',
                'users.email',
                'users.phone',
                DB::raw('COUNT(*) as total_orders'),
                DB::raw('SUM(sales.amount) as total_spent'),
                DB::raw('AVG(sales.amount) as avg_order_value'),
                DB::raw('MIN(sales.paid_at) as first_purchase'),
                DB::raw('MAX(sales.paid_at) as last_purchase'),
                DB::raw('COUNT(DISTINCT sales.product_id) as unique_products')
            )
            ->groupBy('sales.user_id', 'users.full_name', 'users.email', 'users.phone')
            ->orderByDesc('total_spent')
            ->limit($limit)
            ->get()
            ->map(function ($c) {
                return [
                    'user_id' => $c->user_id,
                    'full_name' => $c->full_name,
                    'email' => $c->email,
                    'phone' => $c->phone,
                    'total_orders' => (int) $c->total_orders,
                    'total_spent' => round((float) $c->total_spent, 2),
                    'avg_order_value' => round((float) $c->avg_order_value, 2),
                    'first_purchase' => $c->first_purchase,
                    'last_purchase' => $c->last_purchase,
                    'unique_products' => (int) $c->unique_products,
                ];
            });

        // Overall customer stats
        $totalCustomers = Sale::where('status', 'paid')
            ->whereBetween('paid_at', [$from . ' 00:00:00', $to . ' 23:59:59'])
            ->distinct('user_id')
            ->count('user_id');

        $repeatCustomers = Sale::where('status', 'paid')
            ->whereBetween('paid_at', [$from . ' 00:00:00', $to . ' 23:59:59'])
            ->select('user_id')
            ->groupBy('user_id')
            ->havingRaw('COUNT(*) > 1')
            ->get()
            ->count();

        return response()->json([
            'success' => true,
            'customers' => $customers,
            'stats' => [
                'total_customers' => $totalCustomers,
                'repeat_customers' => $repeatCustomers,
                'repeat_rate' => $totalCustomers > 0 ? round(($repeatCustomers / $totalCustomers) * 100, 1) : 0,
            ],
            'period' => ['from' => $from, 'to' => $to],
        ]);
    }
}

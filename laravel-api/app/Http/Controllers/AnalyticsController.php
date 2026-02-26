<?php

namespace App\Http\Controllers;

use App\Models\Sale;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AnalyticsController extends Controller
{
    public function dashboard(Request $request)
    {
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
}

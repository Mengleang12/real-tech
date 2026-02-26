<?php

namespace App\Http\Controllers;

use App\Models\UserActivityLog;
use Illuminate\Http\Request;

class ActivityLogController extends Controller
{
    public function index(Request $request)
    {
        $days = $request->input('days', 7);
        $action = $request->input('action');
        $perPage = min($request->input('per_page', 50), 200);
        $userId = $request->input('user_id');

        $query = UserActivityLog::with('user:id,email,full_name')
            ->where('created_at', '>=', now()->subDays($days))
            ->orderBy('created_at', 'desc');

        if ($action && $action !== 'all') {
            $query->where('action', $action);
        }

        if ($userId) {
            $query->where('user_id', $userId);
        }

        // Stats from date+user scoped query
        $statsQuery = UserActivityLog::where('created_at', '>=', now()->subDays($days));
        if ($userId) {
            $statsQuery->where('user_id', $userId);
        }
        $allForStats = $statsQuery->get();

        $stats = [
            'total' => $allForStats->count(),
            'logins' => $allForStats->where('action', 'login')->count(),
            'purchases' => $allForStats->where('action', 'purchase')->count(),
            'downloads' => $allForStats->where('action', 'download')->count(),
        ];

        // Get unique actions for filter
        $uniqueActions = UserActivityLog::where('created_at', '>=', now()->subDays($days))
            ->distinct()
            ->pluck('action');

        // Paginate
        $paginated = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'logs' => $paginated->items(),
            'actions' => $uniqueActions,
            'stats' => $stats,
            'pagination' => [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $log = UserActivityLog::create([
            'user_id' => $request->user_id,
            'action' => $request->action,
            'details' => $request->details,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json([
            'success' => true,
            'log' => $log,
        ]);
    }

    public function trackDownload(Request $request)
    {
        $request->validate([
            'app_id' => 'required|integer',
            'app_name' => 'required|string',
        ]);

        $user = $request->user();

        if (!$user) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        UserActivityLog::create([
            'user_id' => $user->id,
            'action' => 'download',
            'details' => [
                'app_id' => $request->app_id,
                'app_name' => $request->app_name,
                'version' => $request->version,
            ],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Download tracked',
        ]);
    }
}
<?php

namespace App\Traits;

use App\Models\UserActivityLog;
use Illuminate\Http\Request;

trait LogsAdminActivity
{
    /**
     * Log an admin activity.
     *
     * @param Request $request
     * @param string $action  e.g. 'app_create', 'user_ban', 'coupon_delete'
     * @param array $details  Additional context data
     */
    protected function logActivity(Request $request, string $action, array $details = []): void
    {
        $user = $request->user();
        $userId = $user ? $user->id : null;

        // If no user (legacy admin token), try to get admin info
        if (!$userId) {
            $admin = $request->attributes->get('admin_model');
            if ($admin) {
                $userId = 'admin_' . $admin->id;
            }
        }

        if (!$userId) {
            return;
        }

        UserActivityLog::create([
            'user_id' => $userId,
            'action' => $action,
            'details' => $details,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);
    }
}

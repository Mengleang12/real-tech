<?php

namespace App\Traits;

use App\Models\UserActivityLog;
use Illuminate\Http\Request;

trait LogsAdminActivity
{
    protected function logActivity(Request $request, string $action, array $details = []): void
    {
        $user = $request->user();
        $userId = $user ? $user->id : null;

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
            'customer_id' => $userId,
            'action' => $action,
            'details' => $details,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);
    }
}

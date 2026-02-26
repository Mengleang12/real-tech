<?php

namespace App\Http\Middleware;

use App\Models\SystemSetting;
use Closure;
use Illuminate\Http\Request;

class CheckMaintenance
{
    /**
     * Block non-admin requests when maintenance_mode is enabled.
     * Admins (identified via auth.admin middleware) bypass this check.
     */
    public function handle(Request $request, Closure $next)
    {
        $maintenanceMode = SystemSetting::getValue('maintenance_mode', 'false');

        if ($maintenanceMode === 'true') {
            $message = SystemSetting::getValue('maintenance_message', 'We are currently performing scheduled maintenance. Please try again later.');

            return response()->json([
                'error' => 'maintenance',
                'message' => $message,
            ], 503);
        }

        return $next($request);
    }
}

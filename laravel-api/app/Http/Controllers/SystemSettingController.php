<?php

namespace App\Http\Controllers;

use App\Models\SystemSetting;
use Illuminate\Http\Request;

class SystemSettingController extends Controller
{
    /**
     * Get all system settings.
     */
    public function index(Request $request)
    {
        // Check permission
        $permissions = $request->attributes->get('user_permissions', []);
        if (!in_array('*', $permissions) && !in_array('settings.manage', $permissions)) {
            return response()->json(['error' => 'Permission denied'], 403);
        }

        $settings = SystemSetting::allAsArray();

        // Convert string booleans back to actual booleans and numbers
        $typed = [];
        foreach ($settings as $key => $value) {
            if ($value === 'true') {
                $typed[$key] = true;
            } elseif ($value === 'false') {
                $typed[$key] = false;
            } elseif (is_numeric($value)) {
                $typed[$key] = strpos($value, '.') !== false ? (float) $value : (int) $value;
            } else {
                $typed[$key] = $value;
            }
        }

        return response()->json($typed);
    }

    /**
     * Public: get maintenance status only.
     */
    public function maintenanceStatus()
    {
        $mode = SystemSetting::getValue('maintenance_mode', 'false');
        $message = SystemSetting::getValue('maintenance_message', '');

        return response()->json([
            'maintenance_mode' => $mode === 'true',
            'maintenance_message' => $message,
        ]);
    }

    /**
     * Update system settings (bulk).
     */
    public function update(Request $request)
    {
        $permissions = $request->attributes->get('user_permissions', []);
        if (!in_array('*', $permissions) && !in_array('settings.manage', $permissions)) {
            return response()->json(['error' => 'Permission denied'], 403);
        }

        $allowedKeys = [
            'maintenance_mode',
            'maintenance_message',
            'allow_new_registrations',
            'max_upload_size',
            'auto_approve_apps',
            'site_name',
            'site_tagline',
            'support_email',
            'support_phone',
            'site_address',
            'site_logo_url',
            'primary_color',
            'default_currency',
            'facebook_url',
            'telegram_url',
            'instagram_url',
            'enable_analytics',
            'invoice_footer_text',
        ];

        $settings = $request->only($allowedKeys);

        // Convert booleans to string
        foreach ($settings as $key => $value) {
            if (is_bool($value)) {
                $settings[$key] = $value ? 'true' : 'false';
            }
        }

        SystemSetting::bulkUpdate($settings);

        return response()->json(['message' => 'Settings updated successfully']);
    }
}

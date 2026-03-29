<?php

namespace App\Http\Controllers;

use App\Models\SystemSetting;
use Illuminate\Http\Request;

class SystemSettingController extends Controller
{
    // Keys safe to expose to the frontend settings UI
    private const PUBLIC_KEYS = [
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
        'tiktok_url',
        'enable_analytics',
        'invoice_footer_text',
        'payment_qr_urls',
        'payment_qr_size',
        'label_width',
        'label_height',
        'google_maps_api_key',
        'youtube_video_url',
    ];

    // Keys that store JSON arrays
    private const JSON_KEYS = ['payment_qr_urls'];

    /**
     * Get system settings (only public keys).
     */
    public function index(Request $request)
    {
        // Check permission
        $permissions = $request->attributes->get('user_permissions', []);
        if (!in_array('*', $permissions) && !in_array('settings.manage', $permissions)) {
            return response()->json(['error' => 'Permission denied'], 403);
        }

        $allSettings = SystemSetting::allAsArray();

        // Only return public keys, convert types
        $typed = [];
        foreach (self::PUBLIC_KEYS as $key) {
            $value = $allSettings[$key] ?? null;
            if ($value === null) {
                if (in_array($key, self::JSON_KEYS)) {
                    $typed[$key] = [];
                }
                continue;
            }
            if (in_array($key, self::JSON_KEYS)) {
                $typed[$key] = json_decode($value, true) ?: [];
            } elseif ($value === 'true') {
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
        $primaryColor = SystemSetting::getValue('primary_color', '');

        return response()->json([
            'maintenance_mode' => $mode === 'true',
            'maintenance_message' => $message,
            'primary_color' => $primaryColor,
        ]);
    }

    /**
     * Public: get branding info (for invoices, storefront, etc.)
     */
    public function branding()
    {
        $qrRaw = SystemSetting::getValue('payment_qr_urls', '[]');
        return response()->json([
            'site_name' => SystemSetting::getValue('site_name', 'Realtech Computer'),
            'site_tagline' => SystemSetting::getValue('site_tagline', ''),
            'site_logo_url' => SystemSetting::getValue('site_logo_url', ''),
            'support_email' => SystemSetting::getValue('support_email', ''),
            'support_phone' => SystemSetting::getValue('support_phone', ''),
            'site_address' => SystemSetting::getValue('site_address', ''),
            'primary_color' => SystemSetting::getValue('primary_color', '#2563eb'),
            'invoice_footer_text' => SystemSetting::getValue('invoice_footer_text', 'Thank you for your purchase!'),
            'default_currency' => SystemSetting::getValue('default_currency', 'USD'),
            'payment_qr_urls' => json_decode($qrRaw, true) ?: [],
            'payment_qr_size' => (int) SystemSetting::getValue('payment_qr_size', '72'),
            'facebook_url' => SystemSetting::getValue('facebook_url', ''),
            'telegram_url' => SystemSetting::getValue('telegram_url', ''),
            'instagram_url' => SystemSetting::getValue('instagram_url', ''),
            'tiktok_url' => SystemSetting::getValue('tiktok_url', ''),
            'google_maps_api_key' => SystemSetting::getValue('google_maps_api_key', ''),
            'youtube_video_url' => SystemSetting::getValue('youtube_video_url', ''),
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

        $settings = $request->only(self::PUBLIC_KEYS);

        // Convert booleans and arrays to string
        foreach ($settings as $key => $value) {
            if (is_bool($value)) {
                $settings[$key] = $value ? 'true' : 'false';
            } elseif (is_array($value)) {
                $settings[$key] = json_encode($value);
            }
        }

        SystemSetting::bulkUpdate($settings);

        return response()->json(['message' => 'Settings updated successfully']);
    }
}

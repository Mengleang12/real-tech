<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SystemSetting extends Model
{
    protected $fillable = ['key', 'value'];

    /**
     * Get all settings as key-value array.
     */
    public static function allAsArray(): array
    {
        return self::pluck('value', 'key')->toArray();
    }

    /**
     * Get a single setting value.
     */
    public static function getValue(string $key, ?string $default = null): ?string
    {
        $setting = self::where('key', $key)->first();
        return $setting ? $setting->value : $default;
    }

    /**
     * Set a single setting value.
     */
    public static function setValue(string $key, ?string $value): void
    {
        self::updateOrCreate(['key' => $key], ['value' => $value]);
    }

    /**
     * Bulk update settings.
     */
    public static function bulkUpdate(array $settings): void
    {
        foreach ($settings as $key => $value) {
            self::setValue($key, (string) $value);
        }
    }
}

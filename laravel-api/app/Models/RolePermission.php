<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RolePermission extends Model
{
    protected $fillable = [
        'role',
        'permission',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get all permissions for a given role.
     */
    public static function getPermissionsForRole(string $role): array
    {
        return static::where('role', $role)->pluck('permission')->toArray();
    }

    /**
     * Get all permissions for multiple roles.
     */
    public static function getPermissionsForRoles(array $roles): array
    {
        return static::whereIn('role', $roles)
            ->pluck('permission')
            ->unique()
            ->values()
            ->toArray();
    }

    /**
     * Get all available permission keys (defined in code).
     */
    public static function allPermissionKeys(): array
    {
        return [
            ['key' => 'apps.view', 'label' => 'View Apps', 'group' => 'Apps'],
            ['key' => 'apps.create', 'label' => 'Create Apps', 'group' => 'Apps'],
            ['key' => 'apps.edit', 'label' => 'Edit Apps', 'group' => 'Apps'],
            ['key' => 'apps.delete', 'label' => 'Delete Apps', 'group' => 'Apps'],
            ['key' => 'users.view', 'label' => 'View Users', 'group' => 'Users'],
            ['key' => 'users.manage', 'label' => 'Manage Users', 'group' => 'Users'],
            ['key' => 'orders.view', 'label' => 'View Orders', 'group' => 'Orders'],
            ['key' => 'orders.manage', 'label' => 'Manage Orders', 'group' => 'Orders'],
            ['key' => 'roles.manage', 'label' => 'Manage Roles', 'group' => 'Roles'],
            ['key' => 'analytics.view', 'label' => 'View Analytics', 'group' => 'Analytics'],
            ['key' => 'notifications.manage', 'label' => 'Manage Notifications', 'group' => 'Notifications'],
            ['key' => 'reviews.manage', 'label' => 'Manage Reviews', 'group' => 'Reviews'],
            ['key' => 'activity.view', 'label' => 'View Activity Logs', 'group' => 'Activity'],
            ['key' => 'user_status.manage', 'label' => 'Ban / Suspend Users', 'group' => 'User Status'],
            ['key' => 'coupons.manage', 'label' => 'Manage Coupons', 'group' => 'Coupons'],
            ['key' => 'settings.manage', 'label' => 'Manage Settings', 'group' => 'Settings'],
            ['key' => 'storage.manage', 'label' => 'File Explorer', 'group' => 'Storage'],
            ['key' => 'receipts.view', 'label' => 'View Receipts', 'group' => 'Receipts'],
        ];
    }

    /**
     * Get all unique role names.
     */
    public static function allRoles(): array
    {
        return static::select('role')
            ->distinct()
            ->pluck('role')
            ->toArray();
    }
}

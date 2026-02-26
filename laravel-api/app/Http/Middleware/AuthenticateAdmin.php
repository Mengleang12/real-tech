<?php

namespace App\Http\Middleware;

use App\Models\Admin;
use App\Models\User;
use App\Models\RolePermission;
use Closure;
use Illuminate\Http\Request;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

class AuthenticateAdmin
{
    /**
     * Handle an incoming request.
     * Accepts both legacy admin tokens and user JWT tokens (for users with roles that have admin-level permissions).
     * 
     * Pass 'admin_only' as parameter to restrict to users with roles.manage permission.
     * Default allows any user with at least one admin-level permission.
     */
    public function handle(Request $request, Closure $next, string $level = 'admin_or_moderator')
    {
        $token = $request->bearerToken();

        if (!$token) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        // First, try legacy admin token
        $admin = Admin::where('auth_token', $token)
            ->where('token_expiry', '>', now())
            ->first();

        if ($admin) {
            $request->setUserResolver(function () use ($admin) {
                return $admin;
            });
            $request->attributes->set('admin_role', 'admin');
            $request->attributes->set('user_permissions', ['*']); // Legacy admin has all permissions
            return $next($request);
        }

        // Try user JWT token
        try {
            $decoded = JWT::decode($token, new Key(config('app.jwt_secret'), 'HS256'));
            
            $user = User::with(['roles', 'status'])->find($decoded->user_id);

            if (!$user) {
                return response()->json(['error' => 'Unauthorized'], 401);
            }

            // Check if user is banned or suspended
            if ($user->status) {
                if ($user->status->status === 'banned') {
                    return response()->json(['error' => 'Your account has been banned.', 'status' => 'banned'], 403);
                }
                if ($user->status->status === 'suspended' && $user->status->suspended_until && now()->lt($user->status->suspended_until)) {
                    return response()->json(['error' => 'Your account is suspended.', 'status' => 'suspended'], 403);
                }
            }

            // Get user roles and their permissions
            $userRoles = $user->roles->pluck('role')->toArray();
            $userPermissions = RolePermission::getPermissionsForRoles($userRoles);

            $isAdmin = in_array('admin', $userRoles);
            $isSuperAdmin = in_array('super_admin', $userRoles);

            // For admin_only level, require admin/super_admin role or specific permissions
            if ($level === 'admin_only' && !$isAdmin && !$isSuperAdmin && !in_array('roles.manage', $userPermissions)) {
                // Check if user has ANY of the required admin-only permissions
                $adminOnlyPerms = ['users.manage', 'orders.manage', 'roles.manage', 'user_status.manage', 'coupons.manage', 'settings.manage', 'analytics.view', 'receipts.view'];
                $hasAdminPerm = !empty(array_intersect($adminOnlyPerms, $userPermissions));
                
                if (!$hasAdminPerm) {
                    return response()->json(['error' => 'Admin access required'], 403);
                }
            }

            // For default level, user needs at least one permission
            if (!$isAdmin && !$isSuperAdmin && empty($userPermissions)) {
                return response()->json(['error' => 'You do not have permission to access this resource'], 403);
            }

            $request->setUserResolver(function () use ($user) {
                return $user;
            });
            $effectiveRole = $isSuperAdmin ? 'super_admin' : ($isAdmin ? 'admin' : 'custom');
            $request->attributes->set('admin_role', $effectiveRole);
            $request->attributes->set('user_permissions', ($isAdmin || $isSuperAdmin) ? ['*'] : $userPermissions);

            return $next($request);

        } catch (\Exception $e) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }
    }
}

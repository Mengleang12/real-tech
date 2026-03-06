<?php

namespace App\Http\Middleware;

use App\Models\User;
use App\Models\Customer;
use App\Models\RolePermission;
use Closure;
use Illuminate\Http\Request;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

class AuthenticateAdmin
{
    public function handle(Request $request, Closure $next, string $level = 'admin_or_moderator')
    {
        $token = $request->bearerToken();

        if (!$token) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        // First, try legacy admin token (users table, formerly admins)
        $admin = User::where('auth_token', $token)
            ->where('token_expiry', '>', now())
            ->first();

        if ($admin) {
            $request->setUserResolver(function () use ($admin) {
                return $admin;
            });
            $request->attributes->set('admin_role', 'admin');
            $request->attributes->set('user_permissions', ['*']);
            return $next($request);
        }

        // Try customer JWT token (customers with roles)
        try {
            $decoded = JWT::decode($token, new Key(config('app.jwt_secret'), 'HS256'));
            
            $customer = Customer::with(['roles', 'status'])->find($decoded->user_id);

            if (!$customer) {
                return response()->json(['error' => 'Unauthorized'], 401);
            }

            // Check if customer is banned or suspended
            if ($customer->status) {
                if ($customer->status->status === 'banned') {
                    return response()->json(['error' => 'Your account has been banned.', 'status' => 'banned'], 403);
                }
                if ($customer->status->status === 'suspended' && $customer->status->suspended_until && now()->lt($customer->status->suspended_until)) {
                    return response()->json(['error' => 'Your account is suspended.', 'status' => 'suspended'], 403);
                }
            }

            // Note: Customer roles are kept for backward compatibility but
            // the primary role system now targets the users (admin) table
            $customerRoles = $customer->roles->pluck('role')->toArray();
            $customerPermissions = RolePermission::getPermissionsForRoles($customerRoles);

            $isAdmin = in_array('admin', $customerRoles);
            $isSuperAdmin = in_array('super_admin', $customerRoles);

            if ($level === 'admin_only' && !$isAdmin && !$isSuperAdmin && !in_array('roles.manage', $customerPermissions)) {
                $adminOnlyPerms = ['users.manage', 'orders.manage', 'roles.manage', 'user_status.manage', 'coupons.manage', 'settings.manage', 'analytics.view', 'receipts.view'];
                $hasAdminPerm = !empty(array_intersect($adminOnlyPerms, $customerPermissions));
                
                if (!$hasAdminPerm) {
                    return response()->json(['error' => 'Admin access required'], 403);
                }
            }

            if (!$isAdmin && !$isSuperAdmin && empty($customerPermissions)) {
                return response()->json(['error' => 'You do not have permission to access this resource'], 403);
            }

            $request->setUserResolver(function () use ($customer) {
                return $customer;
            });
            $effectiveRole = $isSuperAdmin ? 'super_admin' : ($isAdmin ? 'admin' : 'custom');
            $request->attributes->set('admin_role', $effectiveRole);
            $request->attributes->set('user_permissions', ($isAdmin || $isSuperAdmin) ? ['*'] : $customerPermissions);

            return $next($request);

        } catch (\Exception $e) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }
    }
}

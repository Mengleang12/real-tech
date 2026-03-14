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

        // Try admin token (users table) — supports multi-session JSON token array
        $admin = User::with('roles')
            ->where(function ($q) use ($token) {
                $q->where('auth_token', 'LIKE', '%"' . $token . '"%')
                  ->orWhere('auth_token', $token);
            })
            ->first();

        if ($admin) {
            // Verify specific token is not expired (for multi-session)
            $decoded = json_decode($admin->auth_token, true);
            if (is_array($decoded)) {
                $validToken = collect($decoded)->first(fn($t) => $t['token'] === $token && now()->lt($t['expiry']));
                if (!$validToken) {
                    $admin = null; // Token expired, fall through
                } else {
                    // Sliding session: renew this token
                    $decoded = array_map(function ($t) use ($token) {
                        if ($t['token'] === $token) {
                            $t['expiry'] = now()->addDays(30)->toISOString();
                        }
                        return $t;
                    }, $decoded);
                    $decoded = array_values(array_filter($decoded, fn($t) => isset($t['expiry']) && now()->lt($t['expiry'])));
                    $admin->auth_token = json_encode($decoded);
                    $admin->token_expiry = now()->addDays(30);
                    $admin->save();
                }
            } else {
                // Legacy single token
                if (!$admin->token_expiry || now()->gte($admin->token_expiry)) {
                    $admin = null;
                } else {
                    $admin->token_expiry = now()->addDays(30);
                    $admin->save();
                }
            }
        }

        if ($admin) {

            $adminRoles = $admin->roles->pluck('role')->toArray();
            $permissions = RolePermission::getPermissionsForRoles($adminRoles);

            $isAdmin = in_array('admin', $adminRoles);
            $isSuperAdmin = in_array('super_admin', $adminRoles);

            // If no roles assigned, treat legacy admin users as full admin
            if (empty($adminRoles)) {
                $isAdmin = true;
            }

            if ($level === 'admin_only' && !$isAdmin && !$isSuperAdmin) {
                $adminOnlyPerms = ['users.manage', 'orders.manage', 'roles.manage', 'user_status.manage', 'coupons.manage', 'settings.manage', 'analytics.view', 'receipts.view'];
                $hasAdminPerm = !empty(array_intersect($adminOnlyPerms, $permissions));
                
                if (!$hasAdminPerm) {
                    return response()->json(['error' => 'Admin access required'], 403);
                }
            }

            $request->setUserResolver(function () use ($admin) {
                return $admin;
            });
            $effectiveRole = $isSuperAdmin ? 'super_admin' : ($isAdmin ? 'admin' : 'custom');
            $request->attributes->set('admin_role', $effectiveRole);
            $request->attributes->set('user_permissions', ($isAdmin || $isSuperAdmin) ? ['*'] : $permissions);

            return $next($request);
        }

        // Try customer JWT token — customers do NOT have admin access
        // This block is kept for backward compatibility but denies admin access
        try {
            $decoded = JWT::decode($token, new Key(config('app.jwt_secret'), 'HS256'));
            
            $customer = Customer::with('status')->find($decoded->user_id);

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

            // Customers no longer have admin roles — deny admin access
            return response()->json(['error' => 'Admin access required'], 403);

        } catch (\Exception $e) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }
    }
}

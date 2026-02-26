<?php

namespace App\Http\Controllers;

use App\Models\UserRole;
use App\Models\User;
use App\Models\RolePermission;
use App\Traits\LogsAdminActivity;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class RoleController extends Controller
{
    use LogsAdminActivity;

    public function index(Request $request)
    {
        $roles = UserRole::with('user:id,email,full_name')
            ->orderBy('created_at', 'desc')
            ->get();

        $usersWithRoles = $roles->groupBy('user_id')->map(function ($userRoles) {
            $firstRole = $userRoles->first();
            return [
                'user_id' => $firstRole->user_id,
                'full_name' => $firstRole->user->full_name ?? null,
                'email' => $firstRole->user->email ?? null,
                'roles' => $userRoles->pluck('role')->toArray(),
            ];
        })->values();

        return response()->json([
            'success' => true,
            'users' => $usersWithRoles,
        ]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'user_id' => 'required|exists:users,id',
            'role' => 'required|string|max:50',
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()->first()], 422);
        }

        // Only super_admin can assign super_admin or admin roles
        if (in_array($request->role, ['super_admin', 'admin'])) {
            if (!$this->isSuperAdmin($request)) {
                return response()->json(['error' => 'Only Super Admin can assign this role'], 403);
            }
        }

        $roleExists = RolePermission::where('role', $request->role)->exists();
        if (!$roleExists && !in_array($request->role, ['super_admin', 'admin', 'moderator', 'user'])) {
            return response()->json(['error' => 'Role does not exist. Create it first in permission settings.'], 422);
        }

        $existing = UserRole::where('user_id', $request->user_id)
            ->where('role', $request->role)
            ->first();

        if ($existing) {
            return response()->json(['error' => 'User already has this role'], 422);
        }

        $role = UserRole::create([
            'user_id' => $request->user_id,
            'role' => $request->role,
        ]);

        $user = User::find($request->user_id);
        $this->logActivity($request, 'role_assign', [
            'target_user_id' => $request->user_id,
            'target_email' => $user->email ?? null,
            'role' => $request->role,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Role assigned successfully',
            'role' => $role,
        ]);
    }

    public function destroy(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'user_id' => 'required|exists:users,id',
            'role' => 'required|string|max:50',
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()->first()], 422);
        }

        // Only super_admin can remove super_admin or admin roles
        if (in_array($request->role, ['super_admin', 'admin'])) {
            if (!$this->isSuperAdmin($request)) {
                return response()->json(['error' => 'Only Super Admin can remove this role'], 403);
            }
        }

        $deleted = UserRole::where('user_id', $request->user_id)
            ->where('role', $request->role)
            ->delete();

        if (!$deleted) {
            return response()->json(['error' => 'Role not found'], 404);
        }

        $user = User::find($request->user_id);
        $this->logActivity($request, 'role_remove', [
            'target_user_id' => $request->user_id,
            'target_email' => $user->email ?? null,
            'role' => $request->role,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Role removed successfully',
        ]);
    }

    public function permissions(Request $request)
    {
        // Only super_admin can view/manage permissions
        if (!$this->isSuperAdmin($request)) {
            return response()->json(['error' => 'Only Super Admin can manage permissions'], 403);
        }

        $allPermissions = RolePermission::allPermissionKeys();
        $roles = RolePermission::all()->groupBy('role')->map(function ($perms) {
            return $perms->pluck('permission')->toArray();
        });

        $allRoleNames = RolePermission::allRoles();
        if (!in_array('admin', $allRoleNames)) $allRoleNames[] = 'admin';
        if (!in_array('moderator', $allRoleNames)) $allRoleNames[] = 'moderator';
        sort($allRoleNames);

        return response()->json([
            'success' => true,
            'permissions' => $allPermissions,
            'roles' => $roles,
            'role_names' => $allRoleNames,
        ]);
    }

    public function createRole(Request $request)
    {
        if (!$this->isSuperAdmin($request)) {
            return response()->json(['error' => 'Only Super Admin can create roles'], 403);
        }

        $validator = Validator::make($request->all(), [
            'role' => 'required|string|max:50|regex:/^[a-z_]+$/',
            'permissions' => 'required|array',
            'permissions.*' => 'string|max:100',
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()->first()], 422);
        }

        $role = strtolower($request->role);

        if (RolePermission::where('role', $role)->exists()) {
            return response()->json(['error' => 'Role already exists'], 422);
        }

        $now = now();
        $inserts = array_map(function ($perm) use ($role, $now) {
            return ['role' => $role, 'permission' => $perm, 'created_at' => $now, 'updated_at' => $now];
        }, $request->permissions);

        RolePermission::insert($inserts);

        $this->logActivity($request, 'role_create', [
            'role' => $role,
            'permissions_count' => count($request->permissions),
        ]);

        return response()->json([
            'success' => true,
            'message' => "Role '{$role}' created with " . count($request->permissions) . " permissions",
        ]);
    }

    public function updateRolePermissions(Request $request)
    {
        if (!$this->isSuperAdmin($request)) {
            return response()->json(['error' => 'Only Super Admin can update permissions'], 403);
        }

        $validator = Validator::make($request->all(), [
            'role' => 'required|string|max:50',
            'permissions' => 'required|array',
            'permissions.*' => 'string|max:100',
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()->first()], 422);
        }

        $role = $request->role;

        DB::transaction(function () use ($role, $request) {
            RolePermission::where('role', $role)->delete();

            $now = now();
            $inserts = array_map(function ($perm) use ($role, $now) {
                return ['role' => $role, 'permission' => $perm, 'created_at' => $now, 'updated_at' => $now];
            }, $request->permissions);

            if (!empty($inserts)) {
                RolePermission::insert($inserts);
            }
        });

        $this->logActivity($request, 'role_permissions_update', [
            'role' => $role,
            'permissions_count' => count($request->permissions),
        ]);

        return response()->json([
            'success' => true,
            'message' => "Permissions updated for role '{$role}'",
        ]);
    }

    public function deleteRole(Request $request, string $role)
    {
        if (!$this->isSuperAdmin($request)) {
            return response()->json(['error' => 'Only Super Admin can delete roles'], 403);
        }

        if (in_array($role, ['super_admin', 'admin', 'user'])) {
            return response()->json(['error' => 'Cannot delete built-in roles'], 422);
        }

        RolePermission::where('role', $role)->delete();
        UserRole::where('role', $role)->delete();

        $this->logActivity($request, 'role_delete', [
            'role' => $role,
        ]);

        return response()->json([
            'success' => true,
            'message' => "Role '{$role}' deleted",
        ]);
    }

    public function myPermissions(Request $request)
    {
        $user = $request->user();
        $user->load('roles');
        
        $userRoles = $user->roles->pluck('role')->toArray();
        $permissions = RolePermission::getPermissionsForRoles($userRoles);

        // Add special flag for super_admin
        $isSuperAdmin = in_array('super_admin', $userRoles);

        return response()->json([
            'success' => true,
            'roles' => $userRoles,
            'permissions' => $permissions,
            'is_super_admin' => $isSuperAdmin,
        ]);
    }

    /**
     * Check if the current request user is a super_admin.
     */
    private function isSuperAdmin(Request $request): bool
    {
        // Legacy admin tokens have all permissions
        $permissions = $request->attributes->get('user_permissions', []);
        if (in_array('*', $permissions)) {
            return true;
        }

        $user = $request->user();
        if (!$user) {
            return false;
        }

        // Check if user model has roles relationship (Admin model doesn't)
        if (!($user instanceof \App\Models\User)) {
            return false;
        }

        $user->load('roles');
        return $user->roles->pluck('role')->contains('super_admin');
    }
}

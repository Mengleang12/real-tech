<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\UserRole;
use App\Traits\LogsAdminActivity;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class StaffUserController extends Controller
{
    use LogsAdminActivity;

    public function index(Request $request)
    {
        $query = User::with('roles');

        if ($request->search) {
            $query->where('username', 'like', "%{$request->search}%");
        }

        $users = $query->orderBy('id', 'desc')->get();

        return response()->json([
            'success' => true,
            'users' => $users->map(function ($u) {
                return [
                    'id' => $u->id,
                    'username' => $u->username,
                    'roles' => $u->roles->pluck('role')->toArray(),
                    'created_at' => $u->created_at,
                ];
            }),
        ]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'username' => 'required|string|max:100|unique:users,username',
            'password' => 'required|string|min:6',
            'roles' => 'nullable|array',
            'roles.*' => 'string|max:50',
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()->first()], 422);
        }

        $user = User::create([
            'username' => $request->username,
            'password_hash' => Hash::make($request->password),
        ]);

        // Assign roles if provided
        if ($request->roles && is_array($request->roles)) {
            foreach ($request->roles as $role) {
                UserRole::create([
                    'user_id' => $user->id,
                    'role' => $role,
                ]);
            }
        }

        $user->load('roles');

        $this->logActivity($request, 'staff_user_create', [
            'target_user_id' => $user->id,
            'username' => $user->username,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Staff user created successfully',
            'user' => [
                'id' => $user->id,
                'username' => $user->username,
                'roles' => $user->roles->pluck('role')->toArray(),
                'created_at' => $user->created_at,
            ],
        ]);
    }

    public function update(Request $request, $id)
    {
        $user = User::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'username' => 'nullable|string|max:100|unique:users,username,' . $id,
            'password' => 'nullable|string|min:6',
            'roles' => 'nullable|array',
            'roles.*' => 'string|max:50',
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()->first()], 422);
        }

        if ($request->has('username')) {
            $user->username = $request->username;
        }

        if ($request->filled('password')) {
            $user->password_hash = Hash::make($request->password);
        }

        $user->save();

        // Update roles if provided
        if ($request->has('roles')) {
            UserRole::where('user_id', $user->id)->delete();
            foreach ($request->roles as $role) {
                UserRole::create([
                    'user_id' => $user->id,
                    'role' => $role,
                ]);
            }
        }

        $user->load('roles');

        $this->logActivity($request, 'staff_user_update', [
            'target_user_id' => $user->id,
            'username' => $user->username,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Staff user updated successfully',
            'user' => [
                'id' => $user->id,
                'username' => $user->username,
                'roles' => $user->roles->pluck('role')->toArray(),
                'created_at' => $user->created_at,
            ],
        ]);
    }

    public function destroy(Request $request, $id)
    {
        $user = User::findOrFail($id);

        // Prevent deleting yourself
        $currentUser = $request->user();
        if ($currentUser && $currentUser->id === $user->id) {
            return response()->json(['error' => 'You cannot delete your own account'], 422);
        }

        $username = $user->username;

        // Delete roles first
        UserRole::where('user_id', $user->id)->delete();
        $user->delete();

        $this->logActivity($request, 'staff_user_delete', [
            'target_user_id' => $id,
            'username' => $username,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Staff user deleted successfully',
        ]);
    }
}

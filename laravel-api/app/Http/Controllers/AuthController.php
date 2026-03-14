<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'username' => 'required|string',
            'password' => 'required|string',
        ]);

        $admin = User::with('roles')->where('username', $request->username)->first();

        if (!$admin || !Hash::check($request->password, $admin->password_hash)) {
            return response()->json(['error' => 'Invalid credentials'], 401);
        }

        // Generate token
        $token = Str::random(64);
        $expiry = now()->addDays(30);

        $admin->auth_token = $token;
        $admin->token_expiry = $expiry;
        $admin->save();

        $roles = $admin->roles->pluck('role')->toArray();

        return response()->json([
            'success' => true,
            'token' => $token,
            'user' => [
                'id' => $admin->id,
                'username' => $admin->username,
                'full_name' => $admin->full_name,
                'avatar_url' => $admin->avatar_url,
                'roles' => $roles,
            ],
        ]);
    }

    public function changePassword(Request $request)
    {
        $request->validate([
            'username' => 'required|string',
            'current_password' => 'required|string',
            'new_password' => 'required|string|min:6',
        ]);

        $admin = User::where('username', $request->username)->first();

        if (!$admin || !Hash::check($request->current_password, $admin->password_hash)) {
            return response()->json(['error' => 'Invalid current password'], 401);
        }

        $admin->update([
            'password_hash' => Hash::make($request->new_password),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Password changed successfully',
        ]);
    }

    public function updateProfile(Request $request)
    {
        $request->validate([
            'full_name' => 'nullable|string|max:100',
            'avatar_url' => 'nullable|string|max:500',
        ]);

        $user = $request->user();
        
        if ($request->has('full_name')) {
            $user->full_name = $request->full_name;
        }
        if ($request->has('avatar_url')) {
            $user->avatar_url = $request->avatar_url;
        }
        
        $user->save();

        return response()->json([
            'success' => true,
            'user' => [
                'id' => $user->id,
                'username' => $user->username,
                'full_name' => $user->full_name,
                'avatar_url' => $user->avatar_url,
            ],
        ]);
    }

    public function verify(Request $request)
    {
        $token = $request->bearerToken();
        if (!$token) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $admin = User::with('roles')->where('auth_token', $token)
            ->where('token_expiry', '>', now())
            ->first();

        if (!$admin) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        // Renew token expiry (sliding session)
        $admin->token_expiry = now()->addDays(30);
        $admin->save();

        $roles = $admin->roles->pluck('role')->toArray();

        return response()->json([
            'success' => true,
            'user' => [
                'id' => $admin->id,
                'username' => $admin->username,
                'full_name' => $admin->full_name,
                'avatar_url' => $admin->avatar_url,
                'roles' => $roles,
            ],
        ]);
    }

    public function resetPassword()
    {
        $admin = User::where('username', 'admin')->first();

        if (!$admin) {
            return response()->json(['error' => 'User not found'], 404);
        }

        $newPassword = '1234';

        $admin->update([
            'password_hash' => Hash::make($newPassword),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Password reset to: ' . $newPassword,
        ]);
    }
}

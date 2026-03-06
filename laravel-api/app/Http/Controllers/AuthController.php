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
        $expiry = now()->addHours(24);

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
}

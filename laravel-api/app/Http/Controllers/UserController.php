<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\UserActivityLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

class UserController extends Controller
{
    public function register(Request $request)
    {
        $request->validate([
            'email' => 'required|email|unique:customers,email',
            'password' => 'required|string|min:6',
            'full_name' => 'nullable|string|max:100',
        ]);

        $customer = Customer::create([
            'email' => $request->email,
            'password_hash' => Hash::make($request->password),
            'full_name' => $request->full_name,
        ]);

        $token = $this->generateToken($customer);

        // Load roles
        $customer->load('roles');

        return response()->json([
            'success' => true,
            'token' => $token,
            'user' => [
                'id' => $customer->id,
                'email' => $customer->email,
                'full_name' => $customer->full_name,
                'roles' => $customer->roles->pluck('role')->toArray(),
            ],
        ]);
    }

    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $customer = Customer::where('email', $request->email)->with('status')->first();

        if (!$customer || !Hash::check($request->password, $customer->password_hash)) {
            return response()->json(['error' => 'Invalid credentials'], 401);
        }

        // Check if customer is banned or suspended
        if ($customer->status) {
            if ($customer->status->status === 'banned') {
                return response()->json([
                    'error' => 'Your account has been banned.',
                    'reason' => $customer->status->reason,
                    'status' => 'banned'
                ], 403);
            }
            
            if ($customer->status->status === 'suspended') {
                // Check if suspension has expired
                if ($customer->status->suspended_until && now()->lt($customer->status->suspended_until)) {
                    return response()->json([
                        'error' => 'Your account is suspended until ' . $customer->status->suspended_until->format('Y-m-d H:i'),
                        'reason' => $customer->status->reason,
                        'suspended_until' => $customer->status->suspended_until,
                        'status' => 'suspended'
                    ], 403);
                }
                // If suspension expired, auto-reactivate
                $customer->status->update(['status' => 'active', 'reason' => null, 'suspended_until' => null]);
            }
        }

        $token = $this->generateToken($customer);

        // Load roles
        $customer->load('roles');

        // Log successful login
        UserActivityLog::create([
            'customer_id' => $customer->id,
            'action' => 'login',
            'details' => ['email' => $customer->email],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json([
            'success' => true,
            'token' => $token,
            'user' => [
                'id' => $customer->id,
                'email' => $customer->email,
                'full_name' => $customer->full_name,
                'phone' => $customer->phone,
                'avatar_url' => $customer->avatar_url,
                'roles' => $customer->roles->pluck('role')->toArray(),
            ],
        ]);
    }

    public function me(Request $request)
    {
        $customer = $request->user();
        $customer->load('roles');

        return response()->json([
            'user' => [
                'id' => $customer->id,
                'email' => $customer->email,
                'full_name' => $customer->full_name,
                'phone' => $customer->phone,
                'avatar_url' => $customer->avatar_url,
                'roles' => $customer->roles->pluck('role')->toArray(),
            ],
        ]);
    }

    public function updateProfile(Request $request)
    {
        $request->validate([
            'full_name' => 'nullable|string|max:100',
            'phone' => 'nullable|string|max:20',
            'avatar_url' => 'nullable|string|max:500',
        ]);

        $customer = $request->user();
        $customer->update([
            'full_name' => $request->full_name ?? $customer->full_name,
            'phone' => $request->phone ?? $customer->phone,
            'avatar_url' => $request->avatar_url ?? $customer->avatar_url,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Profile updated successfully',
            'user' => [
                'id' => $customer->id,
                'email' => $customer->email,
                'full_name' => $customer->full_name,
                'phone' => $customer->phone,
                'avatar_url' => $customer->avatar_url,
            ],
        ]);
    }

    public function changePassword(Request $request)
    {
        $request->validate([
            'current_password' => 'required|string',
            'new_password' => 'required|string|min:6',
        ]);

        $customer = $request->user();

        if (!Hash::check($request->current_password, $customer->password_hash)) {
            return response()->json(['error' => 'Current password is incorrect'], 400);
        }

        $customer->update([
            'password_hash' => Hash::make($request->new_password),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Password changed successfully',
        ]);
    }

    private function generateToken(Customer $customer): string
    {
        $payload = [
            'iss' => config('app.url'),
            'sub' => $customer->id,
            'user_id' => $customer->id,
            'email' => $customer->email,
            'iat' => time(),
            'exp' => time() + (60 * 60 * 24 * 7), // 7 days
        ];

        return JWT::encode($payload, config('app.jwt_secret'), 'HS256');
    }
}

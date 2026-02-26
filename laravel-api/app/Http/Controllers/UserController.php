<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\UserActivityLog;
use App\Services\ReCaptchaService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

class UserController extends Controller
{
    protected ReCaptchaService $recaptcha;

    public function __construct(ReCaptchaService $recaptcha)
    {
        $this->recaptcha = $recaptcha;
    }

    public function register(Request $request)
    {
        $request->validate([
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:6',
            'full_name' => 'nullable|string|max:100',
            'recaptcha_token' => 'nullable|string',
        ]);

        // Verify reCAPTCHA
        if (!$this->recaptcha->verify($request->recaptcha_token, $request->ip())) {
            return response()->json(['error' => 'CAPTCHA verification failed. Please try again.'], 400);
        }

        $user = User::create([
            'email' => $request->email,
            'password_hash' => Hash::make($request->password),
            'full_name' => $request->full_name,
        ]);

        $token = $this->generateToken($user);

        // Load roles
        $user->load('roles');

        return response()->json([
            'success' => true,
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'email' => $user->email,
                'full_name' => $user->full_name,
                'roles' => $user->roles->pluck('role')->toArray(),
            ],
        ]);
    }

    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
            'recaptcha_token' => 'nullable|string',
        ]);

        // Verify reCAPTCHA
        if (!$this->recaptcha->verify($request->recaptcha_token, $request->ip())) {
            return response()->json(['error' => 'CAPTCHA verification failed. Please try again.'], 400);
        }

        $user = User::where('email', $request->email)->with('status')->first();

        if (!$user || !Hash::check($request->password, $user->password_hash)) {
            return response()->json(['error' => 'Invalid credentials'], 401);
        }

        // Check if user is banned or suspended
        if ($user->status) {
            if ($user->status->status === 'banned') {
                return response()->json([
                    'error' => 'Your account has been banned.',
                    'reason' => $user->status->reason,
                    'status' => 'banned'
                ], 403);
            }
            
            if ($user->status->status === 'suspended') {
                // Check if suspension has expired
                if ($user->status->suspended_until && now()->lt($user->status->suspended_until)) {
                    return response()->json([
                        'error' => 'Your account is suspended until ' . $user->status->suspended_until->format('Y-m-d H:i'),
                        'reason' => $user->status->reason,
                        'suspended_until' => $user->status->suspended_until,
                        'status' => 'suspended'
                    ], 403);
                }
                // If suspension expired, auto-reactivate
                $user->status->update(['status' => 'active', 'reason' => null, 'suspended_until' => null]);
            }
        }

        $token = $this->generateToken($user);

        // Load roles
        $user->load('roles');

        // Log successful login
        UserActivityLog::create([
            'user_id' => $user->id,
            'action' => 'login',
            'details' => ['email' => $user->email],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json([
            'success' => true,
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'email' => $user->email,
                'full_name' => $user->full_name,
                'phone' => $user->phone,
                'avatar_url' => $user->avatar_url,
                'roles' => $user->roles->pluck('role')->toArray(),
            ],
        ]);
    }

    public function me(Request $request)
    {
        $user = $request->user();
        $user->load('roles');

        return response()->json([
            'user' => [
                'id' => $user->id,
                'email' => $user->email,
                'full_name' => $user->full_name,
                'phone' => $user->phone,
                'avatar_url' => $user->avatar_url,
                'roles' => $user->roles->pluck('role')->toArray(),
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

        $user = $request->user();
        $user->update([
            'full_name' => $request->full_name ?? $user->full_name,
            'phone' => $request->phone ?? $user->phone,
            'avatar_url' => $request->avatar_url ?? $user->avatar_url,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Profile updated successfully',
            'user' => [
                'id' => $user->id,
                'email' => $user->email,
                'full_name' => $user->full_name,
                'phone' => $user->phone,
                'avatar_url' => $user->avatar_url,
            ],
        ]);
    }

    public function changePassword(Request $request)
    {
        $request->validate([
            'current_password' => 'required|string',
            'new_password' => 'required|string|min:6',
        ]);

        $user = $request->user();

        if (!Hash::check($request->current_password, $user->password_hash)) {
            return response()->json(['error' => 'Current password is incorrect'], 400);
        }

        $user->update([
            'password_hash' => Hash::make($request->new_password),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Password changed successfully',
        ]);
    }

    private function generateToken(User $user): string
    {
        $payload = [
            'iss' => config('app.url'),
            'sub' => $user->id,
            'user_id' => $user->id,
            'email' => $user->email,
            'iat' => time(),
            'exp' => time() + (60 * 60 * 24 * 7), // 7 days
        ];

        return JWT::encode($payload, config('app.jwt_secret'), 'HS256');
    }
}

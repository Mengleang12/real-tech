<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

class AuthenticateUser
{
    public function handle(Request $request, Closure $next)
    {
        $token = $request->bearerToken();

        if (!$token) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        try {
            $decoded = JWT::decode($token, new Key(config('app.jwt_secret'), 'HS256'));
            
            $user = User::with('status')->find($decoded->user_id);

            if (!$user) {
                return response()->json(['error' => 'User not found'], 401);
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

            $request->setUserResolver(function () use ($user) {
                return $user;
            });

            return $next($request);

        } catch (\Exception $e) {
            return response()->json(['error' => 'Invalid token'], 401);
        }
    }
}

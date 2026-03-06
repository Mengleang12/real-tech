<?php

namespace App\Http\Middleware;

use App\Models\Customer;
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
            
            $customer = Customer::with('status')->find($decoded->user_id);

            if (!$customer) {
                return response()->json(['error' => 'Customer not found'], 401);
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
                    if ($customer->status->suspended_until && now()->lt($customer->status->suspended_until)) {
                        return response()->json([
                            'error' => 'Your account is suspended until ' . $customer->status->suspended_until->format('Y-m-d H:i'),
                            'reason' => $customer->status->reason,
                            'suspended_until' => $customer->status->suspended_until,
                            'status' => 'suspended'
                        ], 403);
                    }
                    $customer->status->update(['status' => 'active', 'reason' => null, 'suspended_until' => null]);
                }
            }

            $request->setUserResolver(function () use ($customer) {
                return $customer;
            });

            return $next($request);

        } catch (\Exception $e) {
            return response()->json(['error' => 'Invalid token'], 401);
        }
    }
}

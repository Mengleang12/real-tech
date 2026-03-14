<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    private function parseUserAgent(string $ua): array
    {
        $device = 'Unknown';
        $browser = 'Unknown';
        $os = 'Unknown';

        // Detect OS
        if (preg_match('/Windows NT/i', $ua)) $os = 'Windows';
        elseif (preg_match('/Macintosh|Mac OS/i', $ua)) $os = 'macOS';
        elseif (preg_match('/Android/i', $ua)) $os = 'Android';
        elseif (preg_match('/iPhone|iPad|iPod/i', $ua)) $os = 'iOS';
        elseif (preg_match('/Linux/i', $ua)) $os = 'Linux';
        elseif (preg_match('/CrOS/i', $ua)) $os = 'Chrome OS';

        // Detect Browser
        if (preg_match('/Edg\//i', $ua)) $browser = 'Edge';
        elseif (preg_match('/OPR|Opera/i', $ua)) $browser = 'Opera';
        elseif (preg_match('/Chrome/i', $ua)) $browser = 'Chrome';
        elseif (preg_match('/Safari/i', $ua) && !preg_match('/Chrome/i', $ua)) $browser = 'Safari';
        elseif (preg_match('/Firefox/i', $ua)) $browser = 'Firefox';

        // Detect Device Type
        if (preg_match('/Mobile|Android.*Mobile|iPhone/i', $ua)) $device = 'Mobile';
        elseif (preg_match('/iPad|Android(?!.*Mobile)|Tablet/i', $ua)) $device = 'Tablet';
        else $device = 'Desktop';

        return compact('device', 'browser', 'os');
    }

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

        // Generate a new token
        $token = Str::random(64);
        $expiry = now()->addDays(30);

        // Parse device info
        $ua = $request->userAgent() ?? 'Unknown';
        $deviceInfo = $this->parseUserAgent($ua);

        $existingTokens = [];
        if ($admin->auth_token) {
            $decoded = json_decode($admin->auth_token, true);
            if (is_array($decoded)) {
                $existingTokens = array_filter($decoded, fn($t) => 
                    isset($t['expiry']) && now()->lt($t['expiry'])
                );
            } else {
                if ($admin->token_expiry && now()->lt($admin->token_expiry)) {
                    $existingTokens[] = [
                        'token' => $admin->auth_token,
                        'expiry' => $admin->token_expiry->toISOString(),
                        'device' => 'Unknown',
                        'browser' => 'Unknown',
                        'os' => 'Unknown',
                        'ip' => 'Unknown',
                        'logged_in_at' => now()->toISOString(),
                        'last_active' => now()->toISOString(),
                    ];
                }
            }
        }

        // Add new token with device metadata
        $existingTokens[] = [
            'token' => $token,
            'expiry' => $expiry->toISOString(),
            'device' => $deviceInfo['device'],
            'browser' => $deviceInfo['browser'],
            'os' => $deviceInfo['os'],
            'ip' => $request->ip() ?? 'Unknown',
            'logged_in_at' => now()->toISOString(),
            'last_active' => now()->toISOString(),
        ];
        $existingTokens = array_slice(array_values($existingTokens), -5);

        $admin->auth_token = json_encode($existingTokens);
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

        $admin = User::with('roles')
            ->where(function ($q) use ($token) {
                $q->where('auth_token', 'LIKE', '%"' . $token . '"%')
                  ->orWhere('auth_token', $token);
            })
            ->first();

        if (!$admin) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        // Verify this specific token isn't expired
        $decoded = json_decode($admin->auth_token, true);
        if (is_array($decoded)) {
            $found = false;
            $decoded = array_map(function ($t) use ($token, $request, &$found) {
                if ($t['token'] === $token) {
                    $found = true;
                    $t['expiry'] = now()->addDays(30)->toISOString();
                    $t['last_active'] = now()->toISOString();
                    // Update IP if changed
                    if ($request->ip()) {
                        $t['ip'] = $request->ip();
                    }
                }
                return $t;
            }, $decoded);
            if (!$found) {
                return response()->json(['error' => 'Unauthorized'], 401);
            }
            // Filter expired and save
            $decoded = array_values(array_filter($decoded, fn($t) => isset($t['expiry']) && now()->lt($t['expiry'])));
            $admin->auth_token = json_encode($decoded);
        }

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

    public function sessions(Request $request)
    {
        $token = $request->bearerToken();
        if (!$token) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $admin = User::where(function ($q) use ($token) {
                $q->where('auth_token', 'LIKE', '%"' . $token . '"%')
                  ->orWhere('auth_token', $token);
            })
            ->first();

        if (!$admin) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $decoded = json_decode($admin->auth_token, true);
        if (!is_array($decoded)) {
            return response()->json(['sessions' => []]);
        }

        // Filter expired sessions
        $sessions = array_values(array_filter($decoded, fn($t) => isset($t['expiry']) && now()->lt($t['expiry'])));

        // Return sessions without exposing full tokens — use a short identifier
        $result = array_map(function ($s) use ($token) {
            return [
                'id' => substr($s['token'], 0, 8),
                'device' => $s['device'] ?? 'Unknown',
                'browser' => $s['browser'] ?? 'Unknown',
                'os' => $s['os'] ?? 'Unknown',
                'ip' => $s['ip'] ?? 'Unknown',
                'logged_in_at' => $s['logged_in_at'] ?? null,
                'last_active' => $s['last_active'] ?? $s['expiry'],
                'is_current' => $s['token'] === $token,
            ];
        }, $sessions);

        return response()->json(['sessions' => array_values($result)]);
    }

    public function revokeSession(Request $request)
    {
        $token = $request->bearerToken();
        if (!$token) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $request->validate([
            'session_id' => 'required|string',
        ]);

        $admin = User::where(function ($q) use ($token) {
                $q->where('auth_token', 'LIKE', '%"' . $token . '"%')
                  ->orWhere('auth_token', $token);
            })
            ->first();

        if (!$admin) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $decoded = json_decode($admin->auth_token, true);
        if (!is_array($decoded)) {
            return response()->json(['error' => 'Session not found'], 404);
        }

        $sessionId = $request->session_id;

        // Remove the session matching the short ID (first 8 chars of token)
        $filtered = array_values(array_filter($decoded, function ($s) use ($sessionId, $token) {
            // Don't allow revoking current session via this endpoint
            if ($s['token'] === $token) return true;
            return substr($s['token'], 0, 8) !== $sessionId;
        }));

        $admin->auth_token = json_encode($filtered);
        $admin->save();

        return response()->json(['success' => true, 'message' => 'Session revoked']);
    }

    public function revokeAllSessions(Request $request)
    {
        $token = $request->bearerToken();
        if (!$token) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $admin = User::where(function ($q) use ($token) {
                $q->where('auth_token', 'LIKE', '%"' . $token . '"%')
                  ->orWhere('auth_token', $token);
            })
            ->first();

        if (!$admin) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $decoded = json_decode($admin->auth_token, true);
        if (!is_array($decoded)) {
            return response()->json(['success' => true]);
        }

        // Keep only the current session
        $current = array_values(array_filter($decoded, fn($s) => $s['token'] === $token));
        $admin->auth_token = json_encode($current);
        $admin->save();

        return response()->json(['success' => true, 'message' => 'All other sessions revoked']);
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

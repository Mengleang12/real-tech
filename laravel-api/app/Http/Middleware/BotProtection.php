<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class BotProtection
{
    /**
     * Blocked User-Agent patterns (common bots/scrapers)
     */
    protected $blockedUserAgents = [
        'curl',
        'wget',
        'python-requests',
        'scrapy',
        'httpclient',
        'java/',
        'libwww',
        'lwp-trivial',
        'sitesucker',
        'webcopier',
        'httrack',
        'teleport',
        'webcapture',
    ];

    /**
     * Suspicious patterns in request
     */
    protected $suspiciousPatterns = [
        'union select',
        'drop table',
        'insert into',
        'delete from',
        '<script>',
        'javascript:',
        '../',
        '..\\',
        'base64_decode',
        'eval(',
    ];

    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next)
    {
        $ip = $request->ip();
        
        // Check if IP is temporarily blocked
        if ($this->isIpBlocked($ip)) {
            Log::warning('Blocked IP attempted access', ['ip' => $ip]);
            return response()->json([
                'success' => false,
                'message' => 'Too many requests. Please try again later.',
            ], 429);
        }

        // Check User-Agent
        $userAgent = strtolower($request->userAgent() ?? '');
        
        // Block empty User-Agent
        if (empty($userAgent)) {
            $this->incrementSuspiciousActivity($ip);
            return response()->json([
                'success' => false,
                'message' => 'Invalid request.',
            ], 403);
        }

        // Check for blocked User-Agents
        foreach ($this->blockedUserAgents as $blocked) {
            if (str_contains($userAgent, $blocked)) {
                Log::warning('Blocked User-Agent detected', [
                    'ip' => $ip,
                    'user_agent' => $userAgent,
                ]);
                $this->incrementSuspiciousActivity($ip);
                return response()->json([
                    'success' => false,
                    'message' => 'Access denied.',
                ], 403);
            }
        }

        // Check for suspicious patterns in request data
        if ($this->hasSuspiciousPatterns($request)) {
            Log::warning('Suspicious pattern detected', [
                'ip' => $ip,
                'uri' => $request->getRequestUri(),
            ]);
            $this->incrementSuspiciousActivity($ip);
            return response()->json([
                'success' => false,
                'message' => 'Invalid request detected.',
            ], 400);
        }

        // Check for honeypot field (if present in request)
        if ($request->has('_hp_field') && !empty($request->input('_hp_field'))) {
            Log::warning('Honeypot triggered', ['ip' => $ip]);
            $this->blockIp($ip, 3600); // Block for 1 hour
            return response()->json([
                'success' => false,
                'message' => 'Invalid request.',
            ], 400);
        }

        // Rate limiting per IP (additional layer)
        if (!$this->checkRateLimit($ip, $request)) {
            return response()->json([
                'success' => false,
                'message' => 'Rate limit exceeded. Please slow down.',
            ], 429);
        }

        return $next($request);
    }

    /**
     * Check if IP is blocked
     */
    protected function isIpBlocked(string $ip): bool
    {
        return Cache::has("blocked_ip:{$ip}");
    }

    /**
     * Block an IP for specified duration
     */
    protected function blockIp(string $ip, int $seconds = 3600): void
    {
        Cache::put("blocked_ip:{$ip}", true, $seconds);
    }

    /**
     * Increment suspicious activity counter
     */
    protected function incrementSuspiciousActivity(string $ip): void
    {
        $key = "suspicious_activity:{$ip}";
        $count = Cache::get($key, 0) + 1;
        Cache::put($key, $count, 3600); // Track for 1 hour

        // Block IP after 5 suspicious activities
        if ($count >= 5) {
            $this->blockIp($ip, 7200); // Block for 2 hours
            Log::warning('IP blocked due to suspicious activity', [
                'ip' => $ip,
                'count' => $count,
            ]);
        }
    }

    /**
     * Check for suspicious patterns in request
     */
    protected function hasSuspiciousPatterns(Request $request): bool
    {
        $content = strtolower(json_encode($request->all()) . $request->getQueryString());
        
        foreach ($this->suspiciousPatterns as $pattern) {
            if (str_contains($content, $pattern)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Additional rate limiting check
     */
    protected function checkRateLimit(string $ip, Request $request): bool
    {
        $path = $request->path();
        $key = "rate_limit:{$ip}:{$path}";
        
        // Different limits for different endpoints
        $limits = [
            'auth/login' => ['max' => 5, 'decay' => 60],      // 5 per minute
            'auth/register' => ['max' => 3, 'decay' => 60],   // 3 per minute
            'otp/send' => ['max' => 3, 'decay' => 300],       // 3 per 5 minutes
            'otp/verify' => ['max' => 5, 'decay' => 60],      // 5 per minute
            'default' => ['max' => 60, 'decay' => 60],        // 60 per minute
        ];

        // Find matching limit
        $limit = $limits['default'];
        foreach ($limits as $route => $config) {
            if (str_contains($path, $route)) {
                $limit = $config;
                break;
            }
        }

        $attempts = Cache::get($key, 0);
        
        if ($attempts >= $limit['max']) {
            return false;
        }

        Cache::put($key, $attempts + 1, $limit['decay']);
        return true;
    }
}

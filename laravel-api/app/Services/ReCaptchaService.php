<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ReCaptchaService
{
    private string $secretKey;
    private string $verifyUrl = 'https://www.google.com/recaptcha/api/siteverify';

    public function __construct()
    {
        $this->secretKey = config('services.recaptcha.secret_key', '');
    }

    /**
     * Verify a reCAPTCHA token
     */
    public function verify(?string $token, ?string $ip = null): bool
    {
        // If reCAPTCHA is not configured, skip verification
        if (empty($this->secretKey)) {
            Log::warning('ReCAPTCHA secret key not configured, skipping verification');
            return true;
        }

        if (empty($token)) {
            Log::warning('ReCAPTCHA token is empty');
            return false;
        }

        try {
            $response = Http::asForm()->post($this->verifyUrl, [
                'secret' => $this->secretKey,
                'response' => $token,
                'remoteip' => $ip,
            ]);

            $data = $response->json();

            if (!$response->successful() || !isset($data['success'])) {
                Log::error('ReCAPTCHA API error', ['response' => $data]);
                return false;
            }

            if (!$data['success']) {
                Log::warning('ReCAPTCHA verification failed', [
                    'error-codes' => $data['error-codes'] ?? [],
                ]);
                return false;
            }

            return true;
        } catch (\Exception $e) {
            Log::error('ReCAPTCHA verification exception', ['error' => $e->getMessage()]);
            return false;
        }
    }

    /**
     * Check if reCAPTCHA is enabled
     */
    public function isEnabled(): bool
    {
        return !empty($this->secretKey);
    }
}

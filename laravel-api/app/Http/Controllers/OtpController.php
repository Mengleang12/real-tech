<?php

namespace App\Http\Controllers;

use App\Mail\OtpMail;
use App\Models\OtpCode;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Firebase\JWT\JWT;

class OtpController extends Controller
{
    /**
     * Send OTP for registration
     */
    public function sendRegistrationOtp(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
        ]);

        // Check if email already registered and verified
        $existingUser = User::where('email', $request->email)
            ->whereNotNull('email_verified_at')
            ->first();

        if ($existingUser) {
            return response()->json(['error' => 'Email already registered'], 400);
        }

        $otp = OtpCode::generateFor($request->email, 'registration');

        try {
            Mail::to($request->email)->send(new OtpMail($otp->code, 'registration'));
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to send email. Please try again.'], 500);
        }

        return response()->json([
            'success' => true,
            'message' => 'OTP sent to your email',
        ]);
    }

    /**
     * Verify OTP and complete registration
     */
    public function verifyRegistrationOtp(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'code' => 'required|string|size:6',
            'password' => 'required|string|min:6',
            'full_name' => 'nullable|string|max:100',
        ]);

        $otp = OtpCode::verify($request->email, $request->code, 'registration');

        if (!$otp) {
            return response()->json(['error' => 'Invalid or expired OTP'], 400);
        }

        // Check if user exists (unverified)
        $user = User::where('email', $request->email)->first();

        if ($user) {
            // Update existing unverified user
            $user->update([
                'password_hash' => Hash::make($request->password),
                'full_name' => $request->full_name,
                'email_verified_at' => now(),
            ]);
        } else {
            // Create new user
            $user = User::create([
                'email' => $request->email,
                'password_hash' => Hash::make($request->password),
                'full_name' => $request->full_name,
                'email_verified_at' => now(),
            ]);
        }

        $token = $this->generateToken($user);

        return response()->json([
            'success' => true,
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'email' => $user->email,
                'full_name' => $user->full_name,
            ],
        ]);
    }

    /**
     * Send OTP for password reset
     */
    public function sendPasswordResetOtp(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user) {
            // Don't reveal if email exists
            return response()->json([
                'success' => true,
                'message' => 'If the email exists, an OTP has been sent',
            ]);
        }

        $otp = OtpCode::generateFor($request->email, 'password_reset');

        try {
            Mail::to($request->email)->send(new OtpMail($otp->code, 'password_reset'));
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to send email. Please try again.'], 500);
        }

        return response()->json([
            'success' => true,
            'message' => 'OTP sent to your email',
        ]);
    }

    /**
     * Verify OTP code only (without resetting password)
     */
    public function verifyResetCode(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'code' => 'required|string|size:6',
            'type' => 'required|in:registration,password_reset',
        ]);

        $otp = OtpCode::where('email', $request->email)
            ->where('code', $request->code)
            ->where('type', $request->type)
            ->where('used', false)
            ->where('expires_at', '>', now())
            ->first();

        if (!$otp) {
            return response()->json(['error' => 'Invalid or expired OTP'], 400);
        }

        // Don't mark as used yet - will be marked when password is actually reset
        return response()->json([
            'success' => true,
            'message' => 'OTP verified successfully',
        ]);
    }

    /**
     * Verify OTP and reset password
     */
    public function verifyPasswordResetOtp(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'code' => 'required|string|size:6',
            'password' => 'required|string|min:6',
        ]);

        $otp = OtpCode::verify($request->email, $request->code, 'password_reset');

        if (!$otp) {
            return response()->json(['error' => 'Invalid or expired OTP'], 400);
        }

        $user = User::where('email', $request->email)->first();

        if (!$user) {
            return response()->json(['error' => 'User not found'], 404);
        }

        $user->update([
            'password_hash' => Hash::make($request->password),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Password reset successfully',
        ]);
    }

    /**
     * Resend OTP
     */
    public function resendOtp(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'type' => 'required|in:registration,password_reset',
        ]);

        // Rate limiting check - only allow resend after 60 seconds
        $lastOtp = OtpCode::where('email', $request->email)
            ->where('type', $request->type)
            ->latest()
            ->first();

        if ($lastOtp && $lastOtp->created_at->diffInSeconds(now()) < 60) {
            $waitSeconds = 60 - $lastOtp->created_at->diffInSeconds(now());
            return response()->json([
                'error' => "Please wait {$waitSeconds} seconds before requesting a new code",
            ], 429);
        }

        $otp = OtpCode::generateFor($request->email, $request->type);

        try {
            Mail::to($request->email)->send(new OtpMail($otp->code, $request->type));
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to send email. Please try again.'], 500);
        }

        return response()->json([
            'success' => true,
            'message' => 'OTP resent to your email',
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

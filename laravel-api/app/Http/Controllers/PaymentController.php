<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\PaymentLog;
use App\Models\UserActivityLog;
use App\Http\Controllers\ReceiptController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class PaymentController extends Controller
{
    private $paywayUrl;
    private $paywaySecret;
    private $telegramToken;
    private $telegramChatId;

    public function __construct()
    {
        $this->paywayUrl = config('services.aba.payway_url');
        $this->paywaySecret = config('services.aba.payway_secret');
        $this->telegramToken = config('services.telegram.bot_token');
        $this->telegramChatId = config('services.telegram.chat_id');
    }

    public function generateQr(Request $request)
    {
        $request->validate([
            'order_id' => 'required|string',
            'amount' => 'required|numeric|min:0.01',
        ]);

        $order = Order::find($request->order_id);

        if (!$order) {
            return response()->json(['error' => 'Order not found'], 404);
        }

        if ($order->user_id !== $request->user()->id) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        try {
            $qrData = $this->getQRString($order->amount, $order->id);

            if (!$qrData) {
                return response()->json(['error' => 'Failed to generate QR code'], 500);
            }

            // Create payment log
            $paymentLog = PaymentLog::create([
                'order_id' => $order->id,
                'tran_id' => $qrData['tran_id'],
                'device_id' => $qrData['device_id'],
                'client_id' => $qrData['client_id'],
                'hash' => $qrData['hash'],
                'request_time' => $qrData['request_time'],
                'qr_string' => $qrData['qr_string'],
                'amount' => $order->amount,
                'status' => 'pending',
            ]);

            // Update order with transaction ID
            $order->update([
                'bakong_transaction_id' => $qrData['tran_id'],
                'payment_md5' => $paymentLog->id,
            ]);

            return response()->json([
                'success' => true,
                'qr_string' => $qrData['qr_string'],
                'md5' => $paymentLog->id,
                'tran_id' => $qrData['tran_id'],
                'amount' => $order->amount,
                'currency' => $order->currency,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to generate QR code',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    public function verify(Request $request)
    {
        $request->validate([
            'order_id' => 'required|string',
            'md5' => 'required|string',
        ]);

        $order = Order::find($request->order_id);

        if (!$order) {
            return response()->json(['error' => 'Order not found'], 404);
        }

        // Check if order is expired
        if ($order->isExpired()) {
            $order->update(['status' => 'expired']);
            return response()->json([
                'status' => 'expired',
                'message' => 'Order has expired',
            ]);
        }

        // Already paid
        if ($order->isPaid()) {
            return response()->json([
                'status' => 'paid',
                'message' => 'Order already paid',
            ]);
        }

        // Get payment log
        $paymentLog = PaymentLog::find($request->md5);

        if (!$paymentLog) {
            return response()->json(['error' => 'Payment log not found'], 404);
        }

        // Check payment status with ABA
        $statusResult = $this->checkPaymentStatus($paymentLog);

        if ($statusResult['status'] === 'approved') {
            $order->update([
                'status' => 'paid',
                'paid_at' => now(),
            ]);

            $paymentLog->update([
                'status' => 'paid',
                'status_text' => $statusResult['status_text'],
            ]);

            // Log purchase activity
            UserActivityLog::create([
                'user_id' => $order->user_id,
                'action' => 'purchase',
                'details' => [
                    'order_id' => $order->id,
                    'app_id' => $order->app_id,
                    'app_name' => $order->app_name,
                    'amount' => $order->amount,
                    'currency' => $order->currency,
                ],
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);

            // Send Telegram notification
            $this->sendTelegramNotification($order);

            // Create and send receipt email
            try {
                ReceiptController::createFromOrder($order);
            } catch (\Exception $e) {
                \Log::error('Failed to create receipt: ' . $e->getMessage());
            }

            return response()->json([
                'status' => 'paid',
                'message' => 'Payment successful',
            ]);
        }

        // Update payment log status
        $paymentLog->update([
            'status_text' => $statusResult['status_text'],
        ]);

        return response()->json([
            'status' => $statusResult['status'],
            'message' => 'Payment ' . $statusResult['status'],
        ]);
    }

    public function confirmManual(Request $request)
    {
        $request->validate([
            'order_id' => 'required|string',
        ]);

        $order = Order::find($request->order_id);

        if (!$order) {
            return response()->json(['error' => 'Order not found'], 404);
        }

        $order->update([
            'status' => 'paid',
            'paid_at' => now(),
        ]);

        // Update payment log if exists
        $paymentLog = PaymentLog::where('order_id', $order->id)->latest()->first();
        if ($paymentLog) {
            $paymentLog->update([
                'status' => 'paid',
                'status_text' => 'manual_confirm',
            ]);
        }

        // Send Telegram notification
        $this->sendTelegramNotification($order);

        // Create and send receipt email
        try {
            ReceiptController::createFromOrder($order);
        } catch (\Exception $e) {
            \Log::error('Failed to create receipt: ' . $e->getMessage());
        }

        return response()->json([
            'success' => true,
            'message' => 'Payment confirmed manually',
        ]);
    }

    private function getQRString(float $amount, string $orderId): ?array
    {
        // Fetch ABA data
        $abaDataResponse = Http::get($this->paywayUrl);

        if (!$abaDataResponse->successful()) {
            return null;
        }

        $abaData = $abaDataResponse->json()['aba_data'] ?? null;

        if (!$abaData) {
            return null;
        }

        // Generate request parameters
        $deviceId = $this->generateDeviceId();
        $requestTime = now()->format('YmdHis');

        // Generate hash
        $hashString = $deviceId . $requestTime . $orderId . $amount;
        $hash = hash_hmac('sha512', $hashString, $this->paywaySecret);

        // Request QR from ABA
        $response = Http::post('https://pwapp.ababank.com/api/pw-app/v1/payment/gateway/list-payment-options', [
            'aba_data' => $abaData,
            'device_id' => $deviceId,
            'request_time' => $requestTime,
            'hash' => $hash,
            'invoice_id' => $orderId,
            'amount' => number_format($amount, 2, '.', ''),
        ]);

        if (!$response->successful()) {
            return null;
        }

        $data = $response->json();

        if (($data['status']['code'] ?? '') !== '00') {
            return null;
        }

        return [
            'tran_id' => $data['status']['tran_id'] ?? null,
            'qr_string' => $data['qr_string'] ?? null,
            'client_id' => $data['client_id'] ?? null,
            'device_id' => $deviceId,
            'request_time' => $requestTime,
            'hash' => $hash,
        ];
    }

    private function checkPaymentStatus(PaymentLog $paymentLog): array
    {
        $response = Http::post('https://pwapp.ababank.com/api/pw-app/v1/payment-link/check-payment-status', [
            'device_id' => $paymentLog->device_id,
            'client_id' => $paymentLog->client_id,
            'hash' => $paymentLog->hash,
            'request_time' => $paymentLog->request_time,
        ]);

        if (!$response->successful()) {
            return ['status' => 'pending', 'status_text' => 'request_failed'];
        }

        $data = $response->json();
        $action = $data['data']['action'] ?? 'pending';

        $status = 'pending';
        if ($action === 'approved') {
            $status = 'approved';
        } elseif ($action === 'scanned') {
            $status = 'scanned';
        }

        return [
            'status' => $status,
            'status_text' => $action,
        ];
    }

    private function sendTelegramNotification(Order $order): void
    {
        if (!$this->telegramToken || !$this->telegramChatId) {
            return;
        }

        $message = "✅ Payment Approved\nOrder ID: {$order->id}\nAmount: {$order->amount} {$order->currency}";

        Http::post("https://api.telegram.org/bot{$this->telegramToken}/sendMessage", [
            'chat_id' => $this->telegramChatId,
            'text' => $message,
        ]);
    }

    private function generateDeviceId(int $length = 10): string
    {
        return Str::random($length);
    }
}

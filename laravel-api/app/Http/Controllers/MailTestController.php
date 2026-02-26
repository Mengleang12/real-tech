<?php

namespace App\Http\Controllers;

use App\Mail\ReceiptMail;
use App\Models\Receipt;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;

class MailTestController extends Controller
{
    /**
     * Send a test receipt email
     */
    public function testReceiptEmail(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
        ]);

        // Create a mock receipt for testing
        $mockReceipt = new Receipt([
            'id' => 'test-' . uniqid(),
            'order_id' => 'TEST-ORDER-001',
            'user_id' => 1,
            'receipt_number' => 'RCP-TEST-' . strtoupper(substr(uniqid(), -6)),
            'product_id' => 1,
            'product_name' => 'Test Application',
            'amount' => 9.99,
            'currency' => 'USD',
            'payment_method' => 'ABA PayWay',
            'transaction_id' => 'TXN-TEST-' . strtoupper(substr(uniqid(), -8)),
            'user_email' => $request->email,
            'user_name' => 'Test User',
            'paid_at' => now(),
            'email_sent' => false,
            'download_links' => ['https://example.com/download/test-app'],
            'created_at' => now(),
        ]);

        try {
            Mail::to($request->email)->send(new ReceiptMail($mockReceipt));

            return response()->json([
                'success' => true,
                'message' => 'Test receipt email sent successfully to ' . $request->email,
                'receipt_data' => [
                    'receipt_number' => $mockReceipt->receipt_number,
                    'product_name' => $mockReceipt->product_name,
                    'amount' => $mockReceipt->amount,
                    'currency' => $mockReceipt->currency,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Failed to send test email',
                'message' => $e->getMessage(),
                'trace' => config('app.debug') ? $e->getTraceAsString() : null,
            ], 500);
        }
    }

    /**
     * Test mail configuration
     */
    public function testMailConfig()
    {
        $config = [
            'driver' => config('mail.default'),
            'host' => config('mail.mailers.smtp.host'),
            'port' => config('mail.mailers.smtp.port'),
            'encryption' => config('mail.mailers.smtp.encryption'),
            'from_address' => config('mail.from.address'),
            'from_name' => config('mail.from.name'),
            'username_set' => !empty(config('mail.mailers.smtp.username')),
            'password_set' => !empty(config('mail.mailers.smtp.password')),
        ];

        return response()->json([
            'success' => true,
            'mail_config' => $config,
        ]);
    }
}

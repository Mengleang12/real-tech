<?php

namespace App\Http\Controllers;

use App\Mail\ReceiptMail;
use App\Models\Order;
use App\Models\Receipt;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;

class ReceiptController extends Controller
{
    /**
     * Get all receipts for the authenticated user
     */
    public function index(Request $request)
    {
        $receipts = Receipt::where('user_id', $request->user()->id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'receipts' => $receipts,
        ]);
    }

    /**
     * Get a specific receipt
     */
    public function show(Request $request, $id)
    {
        $receipt = Receipt::where('id', $id)
            ->where('user_id', $request->user()->id)
            ->first();

        if (!$receipt) {
            return response()->json(['error' => 'Receipt not found'], 404);
        }

        return response()->json([
            'success' => true,
            'receipt' => $receipt,
        ]);
    }

    /**
     * Create a receipt for an order and send email
     */
    public static function createFromOrder(Order $order, ?array $downloadLinks = null): Receipt
    {
        $user = $order->user;

        $receipt = Receipt::create([
            'order_id' => $order->id,
            'user_id' => $order->user_id,
            'app_id' => $order->app_id,
            'app_name' => $order->app_name,
            'amount' => $order->amount,
            'currency' => $order->currency,
            'payment_method' => 'ABA PayWay',
            'transaction_id' => $order->bakong_transaction_id,
            'user_email' => $user->email,
            'user_name' => $user->full_name,
            'paid_at' => $order->paid_at ?? now(),
            'download_links' => $downloadLinks,
        ]);

        // Send receipt email
        try {
            Mail::to($user->email)->send(new ReceiptMail($receipt));
            $receipt->update([
                'email_sent' => true,
                'email_sent_at' => now(),
            ]);
        } catch (\Exception $e) {
            \Log::error('Failed to send receipt email: ' . $e->getMessage());
        }

        return $receipt;
    }

    /**
     * Resend receipt email
     */
    public function resend(Request $request, $id)
    {
        $receipt = Receipt::where('id', $id)
            ->where('user_id', $request->user()->id)
            ->first();

        if (!$receipt) {
            return response()->json(['error' => 'Receipt not found'], 404);
        }

        try {
            Mail::to($receipt->user_email)->send(new ReceiptMail($receipt));
            $receipt->update([
                'email_sent' => true,
                'email_sent_at' => now(),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Receipt email resent successfully',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to send email',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Admin: Get all receipts
     */
    public function adminIndex(Request $request)
    {
        $query = Receipt::with('user:id,email,full_name')
            ->orderBy('created_at', 'desc');

        if ($request->has('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        if ($request->has('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->has('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        $receipts = $query->paginate(20);

        return response()->json([
            'success' => true,
            'receipts' => $receipts,
        ]);
    }
}

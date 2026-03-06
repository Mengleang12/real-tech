<?php

namespace App\Http\Controllers;

use App\Mail\ReceiptMail;
use App\Models\Sale;
use App\Models\Receipt;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;

class ReceiptController extends Controller
{
    public function index(Request $request)
    {
        $receipts = Receipt::where('customer_id', $request->user()->id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'receipts' => $receipts,
        ]);
    }

    public function show(Request $request, $id)
    {
        $receipt = Receipt::where('id', $id)
            ->where('customer_id', $request->user()->id)
            ->first();

        if (!$receipt) {
            return response()->json(['error' => 'Receipt not found'], 404);
        }

        return response()->json([
            'success' => true,
            'receipt' => $receipt,
        ]);
    }

    public static function createFromSale(Sale $sale, ?array $downloadLinks = null): Receipt
    {
        $customer = $sale->customer;

        $receipt = Receipt::create([
            'sale_id' => $sale->id,
            'customer_id' => $sale->customer_id,
            'product_id' => $sale->product_id,
            'product_name' => $sale->product_name,
            'amount' => $sale->amount,
            'currency' => $sale->currency,
            'payment_method' => 'ABA PayWay',
            'transaction_id' => $sale->bakong_transaction_id,
            'user_email' => $customer->email,
            'user_name' => $customer->full_name,
            'paid_at' => $sale->paid_at ?? now(),
            'download_links' => $downloadLinks,
        ]);

        try {
            Mail::to($customer->email)->send(new ReceiptMail($receipt));
            $receipt->update([
                'email_sent' => true,
                'email_sent_at' => now(),
            ]);
        } catch (\Exception $e) {
            \Log::error('Failed to send receipt email: ' . $e->getMessage());
        }

        return $receipt;
    }

    public function resend(Request $request, $id)
    {
        $receipt = Receipt::where('id', $id)
            ->where('customer_id', $request->user()->id)
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

    public function adminIndex(Request $request)
    {
        $query = Receipt::orderBy('created_at', 'desc');

        if ($request->has('customer_id')) {
            $query->where('customer_id', $request->customer_id);
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

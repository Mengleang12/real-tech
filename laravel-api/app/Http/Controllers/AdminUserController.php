<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Order;
use App\Models\OrderAttachment;
use App\Models\OrderPayment;
use App\Traits\LogsAdminActivity;
use App\Http\Controllers\SaleController;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AdminUserController extends Controller
{
    use LogsAdminActivity;

    public function index(Request $request)
    {
        $query = User::query();
        
        if ($request->search) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('email', 'like', "%{$search}%")
                  ->orWhere('full_name', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%");
            });
        }
        
        $perPage = $request->limit ?? 20;
        $users = $query->withCount(['orders as paid_orders_count' => function($q) {
            $q->where('status', 'paid');
        }])
        ->orderBy('created_at', 'desc')
        ->paginate($perPage);
        
        return response()->json([
            'users' => $users->items(),
            'pagination' => [
                'current_page' => $users->currentPage(),
                'total_pages' => $users->lastPage(),
                'total' => $users->total(),
                'per_page' => $users->perPage(),
            ],
        ]);
    }

    public function show($id)
    {
        $user = User::with(['orders' => function($q) {
            $q->orderBy('created_at', 'desc');
        }])->findOrFail($id);
        
        return response()->json([
            'user' => $user,
            'orders' => $user->orders,
        ]);
    }

    public function orders($id)
    {
        $user = User::findOrFail($id);
        
        $orders = Order::where('user_id', $id)
            ->orderBy('created_at', 'desc')
            ->get();
        
        return response()->json([
            'user' => [
                'id' => $user->id,
                'email' => $user->email,
                'full_name' => $user->full_name,
            ],
            'orders' => $orders,
        ]);
    }

    public function grantProduct(Request $request, $userId)
    {
        $request->validate([
            'product_id' => 'required|integer',
            'product_name' => 'required|string',
            'amount' => 'nullable|numeric|min:0',
        ]);
        
        $user = User::findOrFail($userId);
        
        $existingPaid = Order::where('user_id', $userId)
            ->where('product_id', $request->product_id)
            ->where('status', 'paid')
            ->first();
        
        if ($existingPaid) {
            return response()->json([
                'error' => 'User already has access to this product',
            ], 400);
        }
        
        $order = Order::create([
            'id' => (string) Str::uuid(),
            'user_id' => $userId,
            'product_id' => $request->product_id,
            'product_name' => $request->product_name,
            'amount' => $request->amount ?? 0,
            'currency' => 'USD',
            'status' => 'paid',
            'paid_at' => now(),
            'bakong_transaction_id' => 'ADMIN_GRANTED_' . time(),
        ]);

        $this->logActivity($request, 'admin_grant_product', [
            'target_user_id' => $userId,
            'target_email' => $user->email,
            'product_id' => $request->product_id,
            'product_name' => $request->product_name,
        ]);
        
        return response()->json([
            'success' => true,
            'message' => 'Product access granted successfully',
            'order' => $order,
        ]);
    }

    public function revokeProduct(Request $request, $userId, $productId)
    {
        $user = User::findOrFail($userId);
        
        $order = Order::where('user_id', $userId)
            ->where('product_id', $productId)
            ->where('status', 'paid')
            ->first();
        
        if (!$order) {
            return response()->json([
                'error' => 'User does not have access to this product',
            ], 404);
        }
        
        $productName = $order->product_name;
        $order->delete();

        $this->logActivity($request, 'admin_revoke_product', [
            'target_user_id' => $userId,
            'target_email' => $user->email,
            'product_id' => $productId,
            'product_name' => $productName,
        ]);
        
        return response()->json([
            'success' => true,
            'message' => 'Product access revoked successfully',
        ]);
    }

    public function approveOrder(Request $request, $orderId)
    {
        $order = Order::findOrFail($orderId);
        
        if ($order->status === 'paid') {
            return response()->json([
                'error' => 'Order is already paid',
            ], 400);
        }
        
        $order->update([
            'status' => 'paid',
            'paid_at' => now(),
            'bakong_transaction_id' => 'ADMIN_APPROVED_' . time(),
        ]);

        // Deduct stock on approval
        SaleController::deductStock($order);

        $this->logActivity($request, 'admin_approve_order', [
            'order_id' => $orderId,
            'user_id' => $order->user_id,
            'product_name' => $order->product_name,
            'amount' => $order->amount,
        ]);
        
        return response()->json([
            'success' => true,
            'message' => 'Order approved successfully',
            'order' => $order,
        ]);
    }

    public function deleteOrder(Request $request, $orderId)
    {
        $order = Order::findOrFail($orderId);
        
        $orderData = [
            'order_id' => $orderId,
            'user_id' => $order->user_id,
            'product_name' => $order->product_name,
            'amount' => $order->amount,
            'status' => $order->status,
        ];
        
        $order->delete();

        $this->logActivity($request, 'admin_delete_order', $orderData);
        
        return response()->json([
            'success' => true,
            'message' => 'Order deleted successfully',
        ]);
    }

    public function bulkDeleteOrders(Request $request)
    {
        $request->validate([
            'order_ids' => 'required|array|min:1',
            'order_ids.*' => 'string',
        ]);

        $orderIds = $request->input('order_ids');
        $deleted = Order::whereIn('id', $orderIds)->delete();

        $this->logActivity($request, 'admin_bulk_delete_orders', [
            'count' => $deleted,
            'order_ids' => $orderIds,
        ]);

        return response()->json([
            'success' => true,
            'message' => "$deleted order(s) deleted successfully",
            'deleted_count' => $deleted,
        ]);
    }

    public function allOrders(Request $request)
    {
        $query = Order::with(['user:id,email,full_name']);
        
        if ($request->status) {
            $query->where('status', $request->status);
        }
        
        if ($request->user_id) {
            $query->where('user_id', $request->user_id);
        }
        
        $perPage = $request->limit ?? 20;
        $orders = $query->orderBy('created_at', 'desc')->paginate($perPage);
        
        return response()->json([
            'orders' => $orders->items(),
            'pagination' => [
                'current_page' => $orders->currentPage(),
                'total_pages' => $orders->lastPage(),
                'total' => $orders->total(),
                'per_page' => $orders->perPage(),
            ],
        ]);
    }

    // ─── Edit Order ───────────────────────────────────────────────────────
    public function updateOrder(Request $request, $orderId)
    {
        $order = Order::findOrFail($orderId);

        $request->validate([
            'notes' => 'nullable|string|max:2000',
            'amount' => 'nullable|numeric|min:0',
            'original_price' => 'nullable|numeric|min:0',
            'item_discount' => 'nullable|numeric|min:0',
            'item_discount_type' => 'nullable|in:amount,percent',
            'sale_discount' => 'nullable|numeric|min:0',
            'sale_discount_type' => 'nullable|in:amount,percent',
            'status' => 'nullable|in:pending,paid,failed,expired',
            'bakong_transaction_id' => 'nullable|string|max:100',
        ]);

        $order->update($request->only([
            'notes', 'amount', 'original_price',
            'item_discount', 'item_discount_type',
            'sale_discount', 'sale_discount_type',
            'status', 'bakong_transaction_id',
        ]));

        if ($request->status === 'paid' && !$order->paid_at) {
            $order->update(['paid_at' => now()]);
        }

        $this->logActivity($request, 'admin_update_order', [
            'order_id' => $orderId,
            'changes' => $request->only(['notes', 'amount', 'status']),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Order updated successfully',
            'order' => $order->load(['user:id,email,full_name', 'attachments', 'payments']),
        ]);
    }

    // ─── Get Order Detail (with attachments & payments) ───────────────────
    public function getOrderDetail($orderId)
    {
        $order = Order::with(['user:id,email,full_name', 'attachments', 'payments'])
            ->findOrFail($orderId);

        return response()->json([
            'order' => $order,
        ]);
    }

    // ─── Attachments ──────────────────────────────────────────────────────
    public function addAttachment(Request $request, $orderId)
    {
        $order = Order::findOrFail($orderId);

        $request->validate([
            'file' => 'required|file|max:5120|mimes:jpg,jpeg,png,gif,webp,pdf',
        ]);

        $file = $request->file('file');
        
        // Upload via existing upload mechanism
        $uploadController = new \App\Http\Controllers\UploadController();
        $uploadRequest = new Request();
        $uploadRequest->files->set('file', $file);
        $uploadRequest->merge(['type' => 'general']);
        $uploadRequest->headers->set('Authorization', $request->header('Authorization'));
        
        $uploadResponse = $uploadController->store($uploadRequest);
        $uploadData = $uploadResponse->getData(true);

        if (!($uploadData['success'] ?? false)) {
            return response()->json(['error' => 'Upload failed'], 500);
        }

        $attachment = OrderAttachment::create([
            'order_id' => $order->id,
            'file_url' => $uploadData['url'],
            'file_name' => $file->getClientOriginalName(),
            'file_type' => str_starts_with($file->getMimeType(), 'image/') ? 'image' : 'document',
            'file_size' => $file->getSize(),
        ]);

        return response()->json([
            'success' => true,
            'attachment' => $attachment,
        ]);
    }

    public function deleteAttachment(Request $request, $orderId, $attachmentId)
    {
        $attachment = OrderAttachment::where('order_id', $orderId)
            ->where('id', $attachmentId)
            ->firstOrFail();

        $attachment->delete();

        return response()->json([
            'success' => true,
            'message' => 'Attachment deleted',
        ]);
    }

    // ─── Payments ─────────────────────────────────────────────────────────
    public function addPayment(Request $request, $orderId)
    {
        $order = Order::findOrFail($orderId);

        $request->validate([
            'amount' => 'required|numeric|min:0.01',
            'method' => 'required|string|max:50',
            'reference' => 'nullable|string|max:255',
            'note' => 'nullable|string|max:500',
            'paid_at' => 'nullable|date',
        ]);

        $payment = OrderPayment::create([
            'order_id' => $order->id,
            'amount' => $request->amount,
            'method' => $request->method,
            'reference' => $request->reference,
            'note' => $request->note,
            'paid_at' => $request->paid_at ?? now(),
        ]);

        $this->logActivity($request, 'admin_add_payment', [
            'order_id' => $orderId,
            'amount' => $request->amount,
            'method' => $request->method,
        ]);

        return response()->json([
            'success' => true,
            'payment' => $payment,
        ]);
    }

    public function deletePayment(Request $request, $orderId, $paymentId)
    {
        $payment = OrderPayment::where('order_id', $orderId)
            ->where('id', $paymentId)
            ->firstOrFail();

        $payment->delete();

        return response()->json([
            'success' => true,
            'message' => 'Payment deleted',
        ]);
    }
}

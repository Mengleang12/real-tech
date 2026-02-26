<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Order;
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
}

<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\Product;
use Illuminate\Http\Request;

class OrderController extends Controller
{
    public function index(Request $request)
    {
        $orders = Order::where('user_id', $request->user()->id)
            ->orderBy('created_at', 'desc')
            ->get();

        $productIds = $orders->pluck('product_id')->unique()->toArray();
        $products = Product::whereIn('id', $productIds)->pluck('icon_url', 'id');
        
        $orders = $orders->map(function ($order) use ($products) {
            $order->product_icon_url = $products[$order->product_id] ?? null;
            return $order;
        });

        return response()->json(['orders' => $orders]);
    }

    public function hasPurchased(Request $request)
    {
        $request->validate([
            'product_id' => 'required|integer',
        ]);

        $purchased = Order::where('user_id', $request->user()->id)
            ->where('product_id', $request->product_id)
            ->where('status', 'paid')
            ->exists();

        return response()->json(['purchased' => $purchased]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'product_id' => 'required|integer',
            'product_name' => 'required|string',
            'amount' => 'required|numeric|min:0',
        ]);

        $user = $request->user();

        $existingPaid = Order::where('user_id', $user->id)
            ->where('product_id', $request->product_id)
            ->where('status', 'paid')
            ->first();

        if ($existingPaid) {
            return response()->json([
                'error' => 'You have already purchased this product',
            ], 400);
        }

        $existingPending = Order::where('user_id', $user->id)
            ->where('product_id', $request->product_id)
            ->where('status', 'pending')
            ->where('expires_at', '>', now())
            ->first();

        if ($existingPending) {
            return response()->json([
                'success' => true,
                'order' => $existingPending,
            ]);
        }

        $order = Order::create([
            'user_id' => $user->id,
            'product_id' => $request->product_id,
            'product_name' => $request->product_name,
            'amount' => $request->amount,
            'currency' => 'USD',
            'status' => 'pending',
            'expires_at' => now()->addMinutes(15),
        ]);

        return response()->json([
            'success' => true,
            'order' => $order,
        ], 201);
    }

    public function confirm(Request $request, $id)
    {
        $order = Order::where('id', $id)
            ->where('user_id', $request->user()->id)
            ->first();

        if (!$order) {
            return response()->json(['error' => 'Order not found'], 404);
        }

        $order->update([
            'status' => 'paid',
            'paid_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Order confirmed',
        ]);
    }
}

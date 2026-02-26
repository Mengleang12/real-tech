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

        // Attach product icon_url to each order
        $appIds = $orders->pluck('app_id')->unique()->toArray();
        $products = Product::whereIn('id', $appIds)->pluck('icon_url', 'id');
        
        $orders = $orders->map(function ($order) use ($products) {
            $order->app_icon_url = $products[$order->app_id] ?? null;
            return $order;
        });

        return response()->json(['orders' => $orders]);
    }

    public function hasPurchased(Request $request)
    {
        $request->validate([
            'app_id' => 'required|integer',
        ]);

        $purchased = Order::where('user_id', $request->user()->id)
            ->where('app_id', $request->app_id)
            ->where('status', 'paid')
            ->exists();

        return response()->json(['purchased' => $purchased]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'app_id' => 'required|integer',
            'app_name' => 'required|string',
            'amount' => 'required|numeric|min:0',
        ]);

        $user = $request->user();

        // Check if already paid for this product
        $existingPaid = Order::where('user_id', $user->id)
            ->where('app_id', $request->app_id)
            ->where('status', 'paid')
            ->first();

        if ($existingPaid) {
            return response()->json([
                'error' => 'You have already purchased this product',
            ], 400);
        }

        // Check for existing pending order
        $existingPending = Order::where('user_id', $user->id)
            ->where('app_id', $request->app_id)
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
            'app_id' => $request->app_id,
            'app_name' => $request->app_name,
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

<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Sale;
use App\Models\SaleAttachment;
use App\Models\SalePayment;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\SaleItem;
use App\Traits\LogsAdminActivity;
use App\Http\Controllers\SaleController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AdminUserController extends Controller
{
    use LogsAdminActivity;

    public function index(Request $request)
    {
        $query = Customer::query();
        
        if ($request->search) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('email', 'like', "%{$search}%")
                  ->orWhere('full_name', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%");
            });
        }
        
        $perPage = $request->limit ?? 20;
        $users = $query->withCount(['sales as paid_sales_count' => function($q) {
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
        $customer = Customer::with(['sales' => function($q) {
            $q->orderBy('created_at', 'desc');
        }])->findOrFail($id);
        
        return response()->json([
            'user' => $customer,
            'orders' => $customer->sales,
        ]);
    }

    public function orders($id)
    {
        $customer = Customer::findOrFail($id);
        
        $sales = Sale::where('customer_id', $id)
            ->orderBy('created_at', 'desc')
            ->get();
        
        return response()->json([
            'user' => [
                'id' => $customer->id,
                'email' => $customer->email,
                'full_name' => $customer->full_name,
            ],
            'orders' => $sales,
        ]);
    }

    public function grantProduct(Request $request, $userId)
    {
        $request->validate([
            'product_id' => 'required|integer',
            'product_name' => 'required|string',
            'amount' => 'nullable|numeric|min:0',
        ]);
        
        $customer = Customer::findOrFail($userId);
        
        $existingPaid = Sale::where('customer_id', $userId)
            ->where('product_id', $request->product_id)
            ->where('status', 'paid')
            ->first();
        
        if ($existingPaid) {
            return response()->json([
                'error' => 'User already has access to this product',
            ], 400);
        }
        
        $sale = Sale::create([
            'id' => (string) Str::uuid(),
            'customer_id' => $userId,
            'product_id' => $request->product_id,
            'product_name' => $request->product_name,
            'amount' => $request->amount ?? 0,
            'currency' => 'USD',
            'status' => 'paid',
            'paid_at' => now(),
            'created_at' => now(),
            'bakong_transaction_id' => 'ADMIN_GRANTED_' . time(),
        ]);

        // Deduct stock on grant
        SaleController::deductStock($sale);

        $this->logActivity($request, 'admin_grant_product', [
            'target_user_id' => $userId,
            'target_email' => $customer->email,
            'product_id' => $request->product_id,
            'product_name' => $request->product_name,
        ]);
        
        return response()->json([
            'success' => true,
            'message' => 'Product access granted successfully',
            'order' => $sale,
        ]);
    }

    public function revokeProduct(Request $request, $userId, $productId)
    {
        $customer = Customer::findOrFail($userId);
        
        $sale = Sale::where('customer_id', $userId)
            ->where('product_id', $productId)
            ->where('status', 'paid')
            ->first();
        
        if (!$sale) {
            return response()->json([
                'error' => 'User does not have access to this product',
            ], 404);
        }
        
        $productName = $sale->product_name;
        $sale->delete();

        $this->logActivity($request, 'admin_revoke_product', [
            'target_user_id' => $userId,
            'target_email' => $customer->email,
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
        $sale = Sale::findOrFail($orderId);
        
        if ($sale->status === 'paid') {
            return response()->json([
                'error' => 'Order is already paid',
            ], 400);
        }
        
        $sale->update([
            'status' => 'paid',
            'paid_at' => now(),
            'bakong_transaction_id' => 'ADMIN_APPROVED_' . time(),
        ]);

        // Stock already deducted on creation, no need to deduct again

        $this->logActivity($request, 'admin_approve_order', [
            'order_id' => $orderId,
            'customer_id' => $sale->customer_id,
            'product_name' => $sale->product_name,
            'amount' => $sale->amount,
        ]);
        
        return response()->json([
            'success' => true,
            'message' => 'Order approved successfully',
            'order' => $sale,
        ]);
    }

    public function deleteOrder(Request $request, $orderId)
    {
        $sale = Sale::findOrFail($orderId);
        
        $saleData = [
            'order_id' => $orderId,
            'customer_id' => $sale->customer_id,
            'product_name' => $sale->product_name,
            'amount' => $sale->amount,
            'status' => $sale->status,
        ];

        // Always restore stock on delete (stock deducted on creation)
        SaleController::restoreStock($sale);
        
        $sale->delete();

        $this->logActivity($request, 'admin_delete_order', $saleData);
        
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

        // Always restore stock on delete (stock deducted on creation)
        $salesToDelete = Sale::whereIn('id', $orderIds)->get();
        foreach ($salesToDelete as $saleToDelete) {
            SaleController::restoreStock($saleToDelete);
        }

        $deleted = Sale::whereIn('id', $orderIds)->delete();

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
        $query = Sale::with(['customer:id,email,full_name,phone', 'items', 'payments']);
        
        if ($request->status) {
            $query->where('status', $request->status);
        }
        
        if ($request->customer_id) {
            $query->where('customer_id', $request->customer_id);
        }

        if ($request->search) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('product_name', 'like', "%{$search}%")
                  ->orWhere('id', 'like', "%{$search}%")
                  ->orWhere('serial_number', 'like', "%{$search}%")
                  ->orWhere('bakong_transaction_id', 'like', "%{$search}%")
                  ->orWhereHas('customer', function($uq) use ($search) {
                      $uq->where('email', 'like', "%{$search}%")
                        ->orWhere('full_name', 'like', "%{$search}%");
                  });
            });
        }
        
        $perPage = $request->limit ?? 20;
        $sales = $query->orderBy('created_at', 'desc')->paginate($perPage);
        
        return response()->json([
            'orders' => $sales->items(),
            'pagination' => [
                'current_page' => $sales->currentPage(),
                'total_pages' => $sales->lastPage(),
                'total' => $sales->total(),
                'per_page' => $sales->perPage(),
            ],
        ]);
    }

    // ─── Edit Order ───────────────────────────────────────────────────────
    public function updateOrder(Request $request, $orderId)
    {
        $sale = Sale::with('items')->findOrFail($orderId);
        $oldStatus = $sale->status;

        $request->validate([
            'product_name' => 'nullable|string|max:500',
            'product_id' => 'nullable|integer',
            'notes' => 'nullable|string|max:2000',
            'warranty_period' => 'nullable|string|max:100',
            'amount' => 'nullable|numeric|min:0',
            'original_price' => 'nullable|numeric|min:0',
            'item_discount' => 'nullable|numeric|min:0',
            'item_discount_type' => 'nullable|in:amount,percent',
            'sale_discount' => 'nullable|numeric|min:0',
            'sale_discount_type' => 'nullable|in:amount,percent',
            'serial_number' => 'nullable|string|max:255',
            'status' => 'nullable|in:pending,paid,failed,expired,cancelled',
            'bakong_transaction_id' => 'nullable|string|max:100',
            'items' => 'nullable|array',
            'items.*.product_id' => 'required_with:items|integer',
            'items.*.variant_id' => 'nullable|integer',
            'items.*.quantity' => 'required_with:items|integer|min:1',
            'items.*.unit_price' => 'required_with:items|numeric|min:0',
            'items.*.serial_numbers' => 'nullable|string',
            'items.*.discount' => 'nullable|numeric|min:0',
            'items.*.discount_type' => 'nullable|in:amount,percent',
        ]);

        $newStatus = $request->status ?? $oldStatus;
        $stockRemovedStatuses = ['cancelled', 'failed'];
        $wasStockRemoved = in_array($oldStatus, $stockRemovedStatuses);
        $willStockRemove = in_array($newStatus, $stockRemovedStatuses);

        DB::beginTransaction();

        try {
            $resolveItem = function (array $item) {
                $product = Product::find($item['product_id']);
                if (!$product) {
                    return [null, null, "Product not found (ID: {$item['product_id']})"];
                }

                $variant = null;
                if (!empty($item['variant_id'])) {
                    $variant = ProductVariant::where('id', $item['variant_id'])
                        ->where('product_id', $product->id)
                        ->first();

                    if (!$variant) {
                        return [null, null, "Variant not found (ID: {$item['variant_id']}) for product {$product->name}"];
                    }
                }

                return [$product, $variant, null];
            };

            $validateRequestedStock = function (array $items) use ($resolveItem) {
                $requested = [];

                foreach ($items as $item) {
                    [$product, $variant, $resolveError] = $resolveItem($item);
                    if ($resolveError) {
                        return $resolveError;
                    }

                    $key = $product->id . ':' . ($variant?->id ?? 'base');
                    if (!isset($requested[$key])) {
                        $requested[$key] = [
                            'product' => $product,
                            'variant' => $variant,
                            'qty' => 0,
                        ];
                    }

                    $requested[$key]['qty'] += (int) ($item['quantity'] ?? 0);
                }

                foreach ($requested as $entry) {
                    $availableStock = $entry['variant']
                        ? ($entry['variant']->stock_quantity ?? 0)
                        : ($entry['product']->stock_quantity ?? 0);

                    if ($availableStock < $entry['qty']) {
                        $name = $entry['product']->name . ($entry['variant'] ? ' (' . ($entry['variant']->sku ?? 'variant') . ')' : '');
                        return "Insufficient stock for {$name}. Available: {$availableStock}, Requested: {$entry['qty']}";
                    }
                }

                return null;
            };

            if ($request->has('items') && !$wasStockRemoved && !$willStockRemove) {
                // Active sale with item changes: restore old stock, validate new stock, deduct new stock
                SaleController::restoreStock($sale);
                SaleItem::where('sale_id', $sale->id)->delete();

                $stockError = $validateRequestedStock($request->items);
                if ($stockError) {
                    DB::rollBack();
                    return response()->json(['error' => $stockError], 422);
                }

                // Create new sale_items and deduct stock in bulk
                foreach ($request->items as $item) {
                    [$product, $variant, $resolveError] = $resolveItem($item);
                    if ($resolveError) {
                        DB::rollBack();
                        return response()->json(['error' => $resolveError], 422);
                    }

                    $qty = $item['quantity'];

                    SaleItem::create([
                        'sale_id' => $sale->id,
                        'product_id' => $product->id,
                        'variant_id' => $variant?->id,
                        'product_name' => $product->name,
                        'quantity' => $qty,
                        'unit_price' => $item['unit_price'],
                        'total_price' => $item['unit_price'] * $qty,
                        'discount' => $item['discount'] ?? 0,
                        'discount_type' => $item['discount_type'] ?? null,
                        'serial_numbers' => $item['serial_numbers'] ?? null,
                    ]);

                    if ($variant) {
                        $variant->decrement('stock_quantity', $qty);
                    } else {
                        $product->decrement('stock_quantity', $qty);
                        $product->refresh();
                        $product->updateStockStatus();
                    }
                }
            } elseif (!$request->has('items')) {
                // Status-only changes: handle stock for status transitions
                if (!$wasStockRemoved && $willStockRemove) {
                    SaleController::restoreStock($sale);
                }
                if ($wasStockRemoved && !$willStockRemove) {
                    // Re-deduct stock for all existing sale_items
                    $existingItems = SaleItem::where('sale_id', $sale->id)->get();
                    foreach ($existingItems as $saleItem) {
                        $product = Product::find($saleItem->product_id);
                        if (!$product) continue;
                        if ($saleItem->variant_id) {
                            $variant = ProductVariant::find($saleItem->variant_id);
                            if ($variant) $variant->decrement('stock_quantity', $saleItem->quantity);
                        } else {
                            $product->decrement('stock_quantity', $saleItem->quantity);
                            $product->refresh();
                            $product->updateStockStatus();
                        }
                    }
                }
            } else {
                // Items provided AND transitioning to/from cancelled/failed
                if (!$wasStockRemoved && $willStockRemove) {
                    // Restore old stock, replace items, don't deduct (sale is cancelled)
                    SaleController::restoreStock($sale);
                    SaleItem::where('sale_id', $sale->id)->delete();
                    foreach ($request->items as $item) {
                        [$product, $variant, $resolveError] = $resolveItem($item);
                        if ($resolveError) {
                            DB::rollBack();
                            return response()->json(['error' => $resolveError], 422);
                        }

                        SaleItem::create([
                            'sale_id' => $sale->id,
                            'product_id' => $product->id,
                            'variant_id' => $variant?->id,
                            'product_name' => $product->name,
                            'quantity' => $item['quantity'],
                            'unit_price' => $item['unit_price'],
                            'total_price' => $item['unit_price'] * $item['quantity'],
                            'discount' => $item['discount'] ?? 0,
                            'discount_type' => $item['discount_type'] ?? null,
                            'serial_numbers' => $item['serial_numbers'] ?? null,
                        ]);
                    }
                } elseif ($wasStockRemoved && !$willStockRemove) {
                    // Was cancelled, now active with new items — validate and deduct new items
                    $stockError = $validateRequestedStock($request->items);
                    if ($stockError) {
                        DB::rollBack();
                        return response()->json(['error' => $stockError], 422);
                    }

                    SaleItem::where('sale_id', $sale->id)->delete();
                    foreach ($request->items as $item) {
                        [$product, $variant, $resolveError] = $resolveItem($item);
                        if ($resolveError) {
                            DB::rollBack();
                            return response()->json(['error' => $resolveError], 422);
                        }

                        $qty = $item['quantity'];
                        SaleItem::create([
                            'sale_id' => $sale->id,
                            'product_id' => $product->id,
                            'variant_id' => $variant?->id,
                            'product_name' => $product->name,
                            'quantity' => $qty,
                            'unit_price' => $item['unit_price'],
                            'total_price' => $item['unit_price'] * $qty,
                            'discount' => $item['discount'] ?? 0,
                            'discount_type' => $item['discount_type'] ?? null,
                            'serial_numbers' => $item['serial_numbers'] ?? null,
                        ]);
                        if ($variant) {
                            $variant->decrement('stock_quantity', $qty);
                        } else {
                            $product->decrement('stock_quantity', $qty);
                            $product->refresh();
                            $product->updateStockStatus();
                        }
                    }
                }
            }

            $sale->update($request->only([
                'product_name', 'product_id',
                'notes', 'warranty_period', 'amount', 'original_price',
                'item_discount', 'item_discount_type',
                'sale_discount', 'sale_discount_type',
                'serial_number',
                'status', 'bakong_transaction_id',
            ]));

            if ($request->status === 'paid' && !$sale->paid_at) {
                $sale->update(['paid_at' => now()]);
            }

            $this->logActivity($request, 'admin_update_order', [
                'order_id' => $orderId,
                'old_status' => $oldStatus,
                'new_status' => $newStatus,
                'changes' => $request->only(['notes', 'amount', 'status']),
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Order updated successfully',
                'order' => $sale->load(['customer:id,email,full_name,phone', 'items', 'attachments', 'payments']),
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'Failed to update order: ' . $e->getMessage()], 500);
        }
    }

    // ─── Get Order Detail (with attachments & payments) ───────────────────
    public function getOrderDetail($orderId)
    {
        $sale = Sale::with(['customer:id,email,full_name,phone', 'items', 'attachments', 'payments'])
            ->findOrFail($orderId);

        return response()->json([
            'order' => $sale,
        ]);
    }

    // ─── Attachments ──────────────────────────────────────────────────────
    public function addAttachment(Request $request, $orderId)
    {
        $sale = Sale::findOrFail($orderId);

        $request->validate([
            'file' => 'required|file|max:5120|mimes:jpg,jpeg,png,gif,webp,pdf',
        ]);

        $file = $request->file('file');

        try {
            // Upload directly instead of routing through UploadController
            $extension = $file->getClientOriginalExtension();
            $filename = uniqid() . '_' . time() . '.' . $extension;
            $path = $file->storeAs('uploads/general', $filename, 'public');

            $fileUrl = asset('storage/' . $path);

            $attachment = SaleAttachment::create([
                'sale_id' => $sale->id,
                'file_url' => $fileUrl,
                'file_name' => $file->getClientOriginalName(),
                'file_type' => str_starts_with($file->getMimeType(), 'image/') ? 'image' : 'document',
                'file_size' => $file->getSize(),
            ]);

            return response()->json([
                'success' => true,
                'attachment' => $attachment,
            ]);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Upload failed: ' . $e->getMessage()], 500);
        }
    }

    public function deleteAttachment(Request $request, $orderId, $attachmentId)
    {
        $attachment = SaleAttachment::where('sale_id', $orderId)
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
        $sale = Sale::findOrFail($orderId);

        $request->validate([
            'amount' => 'required|numeric|min:0.01',
            'method' => 'required|string|max:50',
            'reference' => 'nullable|string|max:255',
            'note' => 'nullable|string|max:500',
            'paid_at' => 'nullable|date',
        ]);

        $payment = SalePayment::create([
            'sale_id' => $sale->id,
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
        $payment = SalePayment::where('sale_id', $orderId)
            ->where('id', $paymentId)
            ->firstOrFail();

        $payment->delete();

        return response()->json([
            'success' => true,
            'message' => 'Payment deleted',
        ]);
    }

    // ─── Customer CRUD ────────────────────────────────────────────────────

    public function storeCustomer(Request $request)
    {
        $request->validate([
            'email' => 'required|email|unique:customers,email',
            'full_name' => 'nullable|string|max:100',
            'phone' => 'nullable|string|max:20',
            'password' => 'required|string|min:6',
        ]);

        $customer = Customer::create([
            'email' => $request->email,
            'full_name' => $request->full_name,
            'phone' => $request->phone,
            'password_hash' => bcrypt($request->password),
        ]);

        $this->logActivity($request, 'admin_create_customer', [
            'customer_id' => $customer->id,
            'email' => $customer->email,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Customer created successfully',
            'user' => $customer,
        ], 201);
    }

    public function updateCustomer(Request $request, $id)
    {
        $customer = Customer::findOrFail($id);

        $request->validate([
            'email' => 'nullable|email|unique:customers,email,' . $id,
            'full_name' => 'nullable|string|max:100',
            'phone' => 'nullable|string|max:20',
            'password' => 'nullable|string|min:6',
        ]);

        $data = [];
        if ($request->has('email')) $data['email'] = $request->email;
        if ($request->has('full_name')) $data['full_name'] = $request->full_name;
        if ($request->has('phone')) $data['phone'] = $request->phone;
        if ($request->filled('password')) $data['password_hash'] = bcrypt($request->password);

        $customer->update($data);

        $this->logActivity($request, 'admin_update_customer', [
            'customer_id' => $id,
            'email' => $customer->email,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Customer updated successfully',
            'user' => $customer,
        ]);
    }

    public function destroyCustomer(Request $request, $id)
    {
        $customer = Customer::findOrFail($id);
        $email = $customer->email;

        $customer->delete();

        $this->logActivity($request, 'admin_delete_customer', [
            'customer_id' => $id,
            'email' => $email,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Customer deleted successfully',
        ]);
    }
}

<?php

namespace App\Http\Controllers;

use App\Models\Purchase;
use App\Models\PurchaseItem;
use App\Models\PurchasePayment;
use App\Models\PurchaseExpense;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Traits\LogsAdminActivity;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PurchaseController extends Controller
{
    use LogsAdminActivity;

    /**
     * List all purchases with pagination
     */
    public function index(Request $request)
    {
        $query = Purchase::with(['items', 'payments', 'expenses'])
            ->orderBy('created_at', 'desc');

        if ($request->has('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
            $q->where('reference_number', 'like', "%{$search}%")
                  ->orWhere('supplier_name', 'like', "%{$search}%")
                  ->orWhere('tracking_number', 'like', "%{$search}%");
            });
        }

        $perPage = $request->input('limit', 20);
        $purchases = $query->paginate($perPage);

        return response()->json([
            'purchases' => $purchases->items(),
            'pagination' => [
                'current_page' => $purchases->currentPage(),
                'total_pages' => $purchases->lastPage(),
                'total' => $purchases->total(),
                'per_page' => $purchases->perPage(),
            ],
        ]);
    }

    /**
     * Get single purchase detail
     */
    public function show($id)
    {
        $purchase = Purchase::with(['items', 'payments', 'expenses'])->find($id);

        if (!$purchase) {
            return response()->json(['error' => 'Purchase not found'], 404);
        }

        return response()->json(['purchase' => $purchase]);
    }

    /**
     * Create a new purchase order
     */
    public function store(Request $request)
    {
        $request->validate([
            'supplier_name' => 'required|string|max:255',
            'status' => 'nullable|in:draft,ordered',
            'notes' => 'nullable|string|max:1000',
            'tracking_number' => 'nullable|string|max:100',
            'carrier' => 'nullable|string|max:100',
            'delivery_fee' => 'nullable|numeric|min:0',
            'other_expense' => 'nullable|numeric|min:0',
            'other_expense_note' => 'nullable|string|max:255',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|integer',
            'items.*.product_name' => 'required|string|max:255',
            'items.*.variant_id' => 'nullable|integer',
            'items.*.variant_label' => 'nullable|string|max:255',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_cost' => 'required|numeric|min:0',
        ]);

        DB::beginTransaction();

        try {
            $status = $request->input('status', 'draft');
            $deliveryFee = $request->input('delivery_fee', 0);
            $otherExpense = $request->input('other_expense', 0);

            $purchase = Purchase::create([
                'supplier_name' => $request->supplier_name,
                'status' => $status,
                'notes' => $request->notes,
                'tracking_number' => $request->tracking_number,
                'carrier' => $request->carrier,
                'delivery_fee' => $deliveryFee,
                'other_expense' => $otherExpense,
                'other_expense_note' => $request->other_expense_note,
                'currency' => 'USD',
                'ordered_at' => $status === 'ordered' ? now() : null,
                'created_by' => $request->user()->id ?? null,
            ]);

            $totalAmount = 0;

            foreach ($request->items as $item) {
                $totalCost = $item['quantity'] * $item['unit_cost'];
                $totalAmount += $totalCost;

                PurchaseItem::create([
                    'purchase_id' => $purchase->id,
                    'product_id' => $item['product_id'],
                    'product_name' => $item['product_name'],
                    'variant_id' => $item['variant_id'] ?? null,
                    'variant_label' => $item['variant_label'] ?? null,
                    'quantity' => $item['quantity'],
                    'unit_cost' => $item['unit_cost'],
                    'total_cost' => $totalCost,
                ]);
            }

            // Create expenses
            $expensesTotal = 0;
            if ($request->has('expenses') && is_array($request->expenses)) {
                foreach ($request->expenses as $exp) {
                    $expensesTotal += $exp['amount'] ?? 0;
                    PurchaseExpense::create([
                        'purchase_id' => $purchase->id,
                        'category' => $exp['category'],
                        'description' => $exp['description'] ?? null,
                        'amount' => $exp['amount'] ?? 0,
                    ]);
                }
            }

            $grandTotal = $totalAmount + $deliveryFee + $otherExpense + $expensesTotal;
            $purchase->update(['total_amount' => $totalAmount, 'grand_total' => $grandTotal]);

            DB::commit();

            $this->logActivity($request, 'purchase_created', ['details' => "Created PO {$purchase->reference_number}"]);

            return response()->json([
                'success' => true,
                'purchase' => $purchase->load(['items', 'payments', 'expenses']),
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'Failed to create purchase: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Update purchase order
     */
    public function update(Request $request, $id)
    {
        $purchase = Purchase::find($id);
        if (!$purchase) {
            return response()->json(['error' => 'Purchase not found'], 404);
        }

        $request->validate([
            'supplier_name' => 'nullable|string|max:255',
            'notes' => 'nullable|string|max:1000',
            'tracking_number' => 'nullable|string|max:100',
            'carrier' => 'nullable|string|max:100',
            'delivery_fee' => 'nullable|numeric|min:0',
            'other_expense' => 'nullable|numeric|min:0',
            'other_expense_note' => 'nullable|string|max:255',
            'items' => 'nullable|array|min:1',
            'items.*.product_id' => 'required_with:items|integer',
            'items.*.product_name' => 'required_with:items|string|max:255',
            'items.*.variant_id' => 'nullable|integer',
            'items.*.variant_label' => 'nullable|string|max:255',
            'items.*.quantity' => 'required_with:items|integer|min:1',
            'items.*.unit_cost' => 'required_with:items|numeric|min:0',
        ]);

        DB::beginTransaction();

        try {
            $updateData = array_filter([
                'supplier_name' => $request->supplier_name,
                'notes' => $request->notes,
                'tracking_number' => $request->tracking_number,
                'carrier' => $request->carrier,
            ], fn($v) => $v !== null);

            if ($request->has('delivery_fee')) {
                $updateData['delivery_fee'] = $request->delivery_fee;
            }
            if ($request->has('other_expense')) {
                $updateData['other_expense'] = $request->other_expense;
            }
            if ($request->has('other_expense_note')) {
                $updateData['other_expense_note'] = $request->other_expense_note;
            }

            $purchase->update($updateData);

            if ($request->has('items')) {
                // Delete old items and recreate
                $purchase->items()->delete();

                $totalAmount = 0;
                foreach ($request->items as $item) {
                    $totalCost = $item['quantity'] * $item['unit_cost'];
                    $totalAmount += $totalCost;

                    PurchaseItem::create([
                        'purchase_id' => $purchase->id,
                        'product_id' => $item['product_id'],
                        'product_name' => $item['product_name'],
                        'variant_id' => $item['variant_id'] ?? null,
                        'variant_label' => $item['variant_label'] ?? null,
                        'quantity' => $item['quantity'],
                        'unit_cost' => $item['unit_cost'],
                        'total_cost' => $totalCost,
                    ]);
                }

                $purchase->update(['total_amount' => $totalAmount]);
            }

            // Handle expenses
            if ($request->has('expenses')) {
                $purchase->expenses()->delete();
                foreach ($request->expenses as $exp) {
                    PurchaseExpense::create([
                        'purchase_id' => $purchase->id,
                        'category' => $exp['category'],
                        'description' => $exp['description'] ?? null,
                        'amount' => $exp['amount'] ?? 0,
                    ]);
                }
            }

            // Recalculate grand_total
            $purchase->refresh();
            $expensesTotal = $purchase->expenses()->sum('amount');
            $grandTotal = $purchase->total_amount + $purchase->delivery_fee + $purchase->other_expense + $expensesTotal;
            $purchase->update(['grand_total' => $grandTotal]);

            DB::commit();

            $this->logActivity($request, 'purchase_updated', ['details' => "Updated PO {$purchase->reference_number}"]);

            return response()->json([
                'success' => true,
                'purchase' => $purchase->load(['items', 'payments', 'expenses']),
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'Failed to update purchase: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Update purchase status with auto-restock on receive
     */
    public function updateStatus(Request $request, $id)
    {
        $purchase = Purchase::with('items')->find($id);
        if (!$purchase) {
            return response()->json(['error' => 'Purchase not found'], 404);
        }

        $request->validate([
            'status' => 'required|in:draft,ordered,partial,received,completed,cancelled',
        ]);

        $oldStatus = $purchase->status;
        $newStatus = $request->status;

        if ($oldStatus === $newStatus) {
            return response()->json(['success' => true, 'purchase' => $purchase]);
        }

        DB::beginTransaction();

        try {
            $updateData = ['status' => $newStatus];

            if ($newStatus === 'ordered' && !$purchase->ordered_at) {
                $updateData['ordered_at'] = now();
            }

            if ($newStatus === 'received' && !$purchase->received_at) {
                $updateData['received_at'] = now();
            }

            if ($newStatus === 'completed') {
                $updateData['completed_at'] = now();
            }

            // Auto-restock: when status changes to 'received' or 'completed', add stock
            if (in_array($newStatus, ['received', 'completed']) && !in_array($oldStatus, ['received', 'completed'])) {
                foreach ($purchase->items as $item) {
                    $qty = $item->quantity;

                    if ($item->variant_id) {
                        $variant = ProductVariant::find($item->variant_id);
                        if ($variant) {
                            $variant->increment('stock_quantity', $qty);
                        }
                    }

                    // Always update main product stock
                    $product = Product::find($item->product_id);
                    if ($product) {
                        $product->increment('stock_quantity', $qty);
                        // Update stock status
                        $newQty = $product->stock_quantity + $qty;
                        if ($newQty > 0) {
                            $lowThreshold = $product->low_stock_threshold ?? 5;
                            $product->update([
                                'stock_status' => $newQty <= $lowThreshold ? 'low_stock' : 'in_stock',
                            ]);
                        }
                    }

                    // Mark items as received
                    $item->update(['received_quantity' => $qty]);
                }
            }

            // If cancelled after being received, reverse stock
            if ($newStatus === 'cancelled' && in_array($oldStatus, ['received', 'completed'])) {
                foreach ($purchase->items as $item) {
                    $qty = $item->quantity;

                    if ($item->variant_id) {
                        $variant = ProductVariant::find($item->variant_id);
                        if ($variant) {
                            $variant->decrement('stock_quantity', $qty);
                        }
                    }

                    $product = Product::find($item->product_id);
                    if ($product) {
                        $product->decrement('stock_quantity', $qty);
                        $newQty = max(0, $product->stock_quantity - $qty);
                        $lowThreshold = $product->low_stock_threshold ?? 5;
                        $product->update([
                            'stock_status' => $newQty <= 0 ? 'out_of_stock' : ($newQty <= $lowThreshold ? 'low_stock' : 'in_stock'),
                        ]);
                    }

                    $item->update(['received_quantity' => 0]);
                }
            }

            $purchase->update($updateData);

            DB::commit();

            $this->logActivity($request, 'purchase_status_updated', ['details' => "PO {$purchase->reference_number}: {$oldStatus} → {$newStatus}"]);

            return response()->json([
                'success' => true,
                'purchase' => $purchase->load(['items', 'payments', 'expenses']),
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'Failed to update status: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Add payment to purchase
     */
    public function addPayment(Request $request, $id)
    {
        $purchase = Purchase::find($id);
        if (!$purchase) {
            return response()->json(['error' => 'Purchase not found'], 404);
        }

        $request->validate([
            'amount' => 'required|numeric|min:0.01',
            'method' => 'nullable|string|max:50',
            'reference' => 'nullable|string|max:255',
            'note' => 'nullable|string|max:500',
        ]);

        $payment = PurchasePayment::create([
            'purchase_id' => $purchase->id,
            'amount' => $request->amount,
            'method' => $request->input('method', 'cash'),
            'reference' => $request->reference,
            'note' => $request->note,
            'paid_at' => now(),
        ]);

        // Update paid_amount (payment already inserted, so sum includes it)
        $totalPaid = $purchase->payments()->sum('amount');
        $purchase->update(['paid_amount' => $totalPaid]);

        $this->logActivity($request, 'purchase_payment_added', ['details' => "Payment \${$request->amount} for PO {$purchase->reference_number}"]);

        return response()->json([
            'success' => true,
            'payment' => $payment,
            'purchase' => $purchase->load(['items', 'payments', 'expenses']),
        ]);
    }

    /**
     * Delete payment from purchase
     */
    public function deletePayment($id, $paymentId)
    {
        $purchase = Purchase::find($id);
        if (!$purchase) {
            return response()->json(['error' => 'Purchase not found'], 404);
        }

        $payment = PurchasePayment::where('id', $paymentId)
            ->where('purchase_id', $id)
            ->first();

        if (!$payment) {
            return response()->json(['error' => 'Payment not found'], 404);
        }

        $payment->delete();

        $totalPaid = $purchase->payments()->sum('amount');
        $purchase->update(['paid_amount' => $totalPaid]);

        return response()->json([
            'success' => true,
            'purchase' => $purchase->load(['items', 'payments', 'expenses']),
        ]);
    }

    /**
     * Delete purchase order
     */
    public function destroy(Request $request, $id)
    {
        $purchase = Purchase::find($id);
        if (!$purchase) {
            return response()->json(['error' => 'Purchase not found'], 404);
        }

        // If received, reverse stock first
        if (in_array($purchase->status, ['received', 'completed'])) {
            $purchase->load('items');
            foreach ($purchase->items as $item) {
                if ($item->variant_id) {
                    ProductVariant::where('id', $item->variant_id)->decrement('stock_quantity', $item->quantity);
                }
                $product = Product::find($item->product_id);
                if ($product) {
                    $product->decrement('stock_quantity', $item->quantity);
                    $newQty = max(0, $product->stock_quantity - $item->quantity);
                    $lowThreshold = $product->low_stock_threshold ?? 5;
                    $product->update([
                        'stock_status' => $newQty <= 0 ? 'out_of_stock' : ($newQty <= $lowThreshold ? 'low_stock' : 'in_stock'),
                    ]);
                }
            }
        }

        $ref = $purchase->reference_number;
        $purchase->delete();

        $this->logActivity($request, 'purchase_deleted', ['details' => "Deleted PO {$ref}"]);

        return response()->json(['success' => true]);
    }

    /**
     * Dashboard summary for purchases
     */
    public function dashboard(Request $request)
    {
        $totalPurchases = Purchase::count();
        $pendingPurchases = Purchase::whereIn('status', ['draft', 'ordered'])->count();
        $totalSpent = Purchase::whereIn('status', ['received', 'completed'])->sum('total_amount');
        $totalPaid = Purchase::sum('paid_amount');
        $totalOwed = $totalSpent - $totalPaid;

        return response()->json([
            'success' => true,
            'stats' => [
                'total_purchases' => $totalPurchases,
                'pending_purchases' => $pendingPurchases,
                'total_spent' => round($totalSpent, 2),
                'total_paid' => round($totalPaid, 2),
                'total_owed' => round(max(0, $totalOwed), 2),
            ],
        ]);
    }

    /**
     * Add expense to purchase
     */
    public function addExpense(Request $request, $id)
    {
        $purchase = Purchase::find($id);
        if (!$purchase) {
            return response()->json(['error' => 'Purchase not found'], 404);
        }

        $request->validate([
            'category' => 'required|string|max:100',
            'description' => 'nullable|string|max:255',
            'amount' => 'required|numeric|min:0',
        ]);

        $expense = PurchaseExpense::create([
            'purchase_id' => $purchase->id,
            'category' => $request->category,
            'description' => $request->description,
            'amount' => $request->amount,
        ]);

        // Recalculate grand_total
        $expensesTotal = $purchase->expenses()->sum('amount');
        $grandTotal = $purchase->total_amount + $purchase->delivery_fee + $purchase->other_expense + $expensesTotal;
        $purchase->update(['grand_total' => $grandTotal]);

        $this->logActivity($request, 'purchase_expense_added', ['details' => "Expense \${$request->amount} ({$request->category}) for PO {$purchase->reference_number}"]);

        return response()->json([
            'success' => true,
            'expense' => $expense,
            'purchase' => $purchase->load(['items', 'payments', 'expenses']),
        ]);
    }

    /**
     * Delete expense from purchase
     */
    public function deleteExpense($id, $expenseId)
    {
        $purchase = Purchase::find($id);
        if (!$purchase) {
            return response()->json(['error' => 'Purchase not found'], 404);
        }

        $expense = PurchaseExpense::where('id', $expenseId)
            ->where('purchase_id', $id)
            ->first();

        if (!$expense) {
            return response()->json(['error' => 'Expense not found'], 404);
        }

        $expense->delete();

        // Recalculate grand_total
        $expensesTotal = $purchase->expenses()->sum('amount');
        $grandTotal = $purchase->total_amount + $purchase->delivery_fee + $purchase->other_expense + $expensesTotal;
        $purchase->update(['grand_total' => $grandTotal]);

        return response()->json([
            'success' => true,
            'purchase' => $purchase->load(['items', 'payments', 'expenses']),
        ]);
    }
}

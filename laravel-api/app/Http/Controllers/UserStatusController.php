<?php

namespace App\Http\Controllers;

use App\Models\UserStatus;
use App\Models\Customer;
use App\Traits\LogsAdminActivity;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class UserStatusController extends Controller
{
    use LogsAdminActivity;

    public function index(Request $request)
    {
        $status = $request->input('status');

        $customers = Customer::select('id', 'email', 'full_name', 'created_at')
            ->with('status')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($customer) {
                return [
                    'user_id' => $customer->id,
                    'full_name' => $customer->full_name,
                    'email' => $customer->email,
                    'created_at' => $customer->created_at,
                    'status' => $customer->status ? [
                        'id' => $customer->status->id,
                        'status' => $customer->status->status,
                        'reason' => $customer->status->reason,
                        'suspended_until' => $customer->status->suspended_until,
                        'updated_at' => $customer->status->updated_at,
                    ] : null,
                ];
            });

        if ($status && $status !== 'all') {
            $customers = $customers->filter(function ($customer) use ($status) {
                if ($status === 'active') {
                    return !$customer['status'] || $customer['status']['status'] === 'active';
                }
                return $customer['status'] && $customer['status']['status'] === $status;
            })->values();
        }

        $allCustomers = Customer::with('status')->get();
        $stats = [
            'active' => $allCustomers->filter(fn($c) => !$c->status || $c->status->status === 'active')->count(),
            'suspended' => $allCustomers->filter(fn($c) => $c->status && $c->status->status === 'suspended')->count(),
            'banned' => $allCustomers->filter(fn($c) => $c->status && $c->status->status === 'banned')->count(),
        ];

        return response()->json([
            'success' => true,
            'users' => $customers,
            'stats' => $stats,
        ]);
    }

    public function update(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'user_id' => 'required|exists:customers,id',
            'status' => 'required|in:active,suspended,banned',
            'reason' => 'nullable|string',
            'suspended_until' => 'nullable|date',
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()->first()], 422);
        }

        $adminId = $request->attributes->get('admin_id');

        $userStatus = UserStatus::updateOrCreate(
            ['customer_id' => $request->user_id],
            [
                'status' => $request->status,
                'reason' => $request->reason,
                'suspended_until' => $request->status === 'suspended' ? $request->suspended_until : null,
                'updated_by' => $adminId,
            ]
        );

        $targetCustomer = Customer::find($request->user_id);
        $this->logActivity($request, 'user_status_update', [
            'target_user_id' => $request->user_id,
            'target_email' => $targetCustomer->email ?? null,
            'new_status' => $request->status,
            'reason' => $request->reason,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Customer status updated successfully',
            'status' => $userStatus,
        ]);
    }
}

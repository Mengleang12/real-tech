<?php

namespace App\Http\Controllers;

use App\Models\ProductSubmission;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ProductSubmissionController extends Controller
{
    public function index(Request $request)
    {
        $status = $request->input('status');

        $query = ProductSubmission::with(['product:id,name,icon_url', 'submittedBy:id,email,full_name'])
            ->orderBy('submitted_at', 'desc');

        if ($status && $status !== 'all') {
            $query->where('status', $status);
        }

        $submissions = $query->get();

        // Get counts
        $stats = [
            'pending' => ProductSubmission::where('status', 'pending_review')->count(),
            'approved' => ProductSubmission::where('status', 'approved')->count(),
            'rejected' => ProductSubmission::where('status', 'rejected')->count(),
            'suspended' => ProductSubmission::where('status', 'suspended')->count(),
        ];

        return response()->json([
            'success' => true,
            'submissions' => $submissions,
            'stats' => $stats,
        ]);
    }

    public function update(Request $request, $id)
    {
        $submission = ProductSubmission::find($id);

        if (!$submission) {
            return response()->json(['error' => 'Submission not found'], 404);
        }

        $validator = Validator::make($request->all(), [
            'status' => 'required|in:draft,pending_review,approved,rejected,suspended',
            'review_notes' => 'nullable|string',
            'rejection_reason' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()->first()], 422);
        }

        $adminId = $request->attributes->get('admin_id');

        $submission->update([
            'status' => $request->status,
            'review_notes' => $request->review_notes,
            'rejection_reason' => $request->rejection_reason,
            'reviewed_by' => $adminId,
            'reviewed_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Submission updated successfully',
            'submission' => $submission,
        ]);
    }

    // For users to submit their products
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'app_id' => 'required|exists:products,id',
            'version' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()->first()], 422);
        }

        $userId = $request->attributes->get('user_id');

        $submission = ProductSubmission::create([
            'app_id' => $request->app_id,
            'version' => $request->version,
            'status' => 'pending_review',
            'submitted_by' => $userId,
            'submitted_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Product submitted for review',
            'submission' => $submission,
        ]);
    }
}

<?php

namespace App\Http\Controllers;

use App\Models\Notification;
use App\Traits\LogsAdminActivity;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class NotificationController extends Controller
{
    use LogsAdminActivity;

    public function index(Request $request)
    {
        $notifications = Notification::orderBy('created_at', 'desc')->get();

        return response()->json([
            'success' => true,
            'notifications' => $notifications,
        ]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'title_km' => 'nullable|string|max:255',
            'message' => 'required|string',
            'message_km' => 'nullable|string',
            'type' => 'required|in:announcement,update,promotion,system',
            'target_users' => 'required|in:all,admins,specific',
            'specific_user_ids' => 'nullable|array',
            'published_at' => 'nullable|date',
            'expires_at' => 'nullable|date',
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()->first()], 422);
        }

        $adminId = $request->attributes->get('admin_id');

        $notification = Notification::create([
            'title' => $request->title,
            'title_km' => $request->title_km,
            'message' => $request->message,
            'message_km' => $request->message_km,
            'type' => $request->type,
            'target_users' => $request->target_users,
            'specific_user_ids' => $request->specific_user_ids,
            'published_at' => $request->published_at,
            'expires_at' => $request->expires_at,
            'created_by' => $adminId,
        ]);

        $this->logActivity($request, 'notification_create', [
            'notification_id' => $notification->id,
            'title' => $notification->title,
            'type' => $notification->type,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Notification created successfully',
            'notification' => $notification,
        ]);
    }

    public function update(Request $request, $id)
    {
        $notification = Notification::find($id);

        if (!$notification) {
            return response()->json(['error' => 'Notification not found'], 404);
        }

        $validator = Validator::make($request->all(), [
            'title' => 'sometimes|required|string|max:255',
            'title_km' => 'nullable|string|max:255',
            'message' => 'sometimes|required|string',
            'message_km' => 'nullable|string',
            'type' => 'sometimes|required|in:announcement,update,promotion,system',
            'target_users' => 'sometimes|required|in:all,admins,specific',
            'specific_user_ids' => 'nullable|array',
            'published_at' => 'nullable|date',
            'expires_at' => 'nullable|date',
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()->first()], 422);
        }

        $notification->update($request->only([
            'title', 'title_km', 'message', 'message_km',
            'type', 'target_users', 'specific_user_ids',
            'published_at', 'expires_at'
        ]));

        $this->logActivity($request, 'notification_update', [
            'notification_id' => $id,
            'title' => $notification->title,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Notification updated successfully',
            'notification' => $notification,
        ]);
    }

    public function destroy(Request $request, $id)
    {
        $notification = Notification::find($id);

        if (!$notification) {
            return response()->json(['error' => 'Notification not found'], 404);
        }

        $notifData = ['notification_id' => $id, 'title' => $notification->title];
        $notification->delete();

        $this->logActivity($request, 'notification_delete', $notifData);

        return response()->json([
            'success' => true,
            'message' => 'Notification deleted successfully',
        ]);
    }

    public function userNotifications(Request $request)
    {
        $userId = $request->attributes->get('user_id');

        $notifications = Notification::active()
            ->where(function ($query) use ($userId) {
                $query->where('target_users', 'all')
                    ->orWhere(function ($q) use ($userId) {
                        $q->where('target_users', 'specific')
                          ->whereJsonContains('specific_user_ids', $userId);
                    });
            })
            ->orderBy('published_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'notifications' => $notifications,
        ]);
    }
}

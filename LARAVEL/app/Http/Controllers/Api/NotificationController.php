<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        $notifications = $user->notifications()->latest()->take(50)->get()->map(function ($n) {
            return [
                'id'         => $n->id,
                'type'       => class_basename($n->type), // e.g. "TaskAssigned"
                'data'       => $n->data,                 // already decoded by Laravel as array
                'read_at'    => $n->read_at,
                'created_at' => $n->created_at,
            ];
        });

        $data = [
            'notifications' => $notifications,
            'unread_count'  => $user->unreadNotifications()->count(),
        ];

        return $this->successResponse($data, 'Notifications retrieved successfully');
    }

    public function markAsRead(Request $request)
    {
        $request->user()->unreadNotifications()->update(['read_at' => now()]);
        return $this->successResponse(null, 'Notifications marked as read');
    }

    public function markOneAsRead(Request $request, string $id)
    {
        $notification = $request->user()->notifications()->findOrFail($id);
        $notification->markAsRead();

        return $this->successResponse(null, 'Notification marked as read');
    }

    public function destroy(Request $request, $id)
    {
        $notification = $request->user()->notifications()->findOrFail($id);
        $notification->delete();

        return $this->successResponse(null, 'Notification deleted successfully');
    }

    public function destroyAll(Request $request)
    {
        $request->user()->notifications()->delete();
        return $this->successResponse(null, 'All notifications cleared');
    }
}


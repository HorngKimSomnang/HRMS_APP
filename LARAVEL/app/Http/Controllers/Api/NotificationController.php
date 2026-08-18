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

    public function send(Request $request)
    {
        $request->validate([
            'target_user_id' => 'required|exists:users,id',
            'title' => 'required|string|max:255',
            'message' => 'required|string',
        ]);

        $targetUser = \App\Models\User::findOrFail($request->target_user_id);
        
        $expectedTitle = "Incident Report: {$request->title}";
        $expectedMessage = "{$request->user()->name} reported: {$request->message}";

        $exists = \Illuminate\Support\Facades\DB::table('notifications')
            ->where('notifiable_id', $targetUser->id)
            ->where('type', 'App\Notifications\IncidentReportedNotification')
            ->where('data->title', $expectedTitle)
            ->where('data->message', $expectedMessage)
            ->exists();

        if ($exists) {
            return response()->json(['message' => 'You have already submitted an identical report to this user.'], 422);
        }
        
        $targetUser->notify(new \App\Notifications\IncidentReportedNotification(
            $request->title,
            $request->message,
            $request->user()->name
        ));

        if ($targetUser->hasRole('Super Admin')) {
            \App\Models\Announcement::create([
                'type' => 'Report',
                'title' => $request->title,
                'content' => "Reported by: " . $request->user()->name . "\n\n" . $request->message,
                'start_date' => now(),
                'end_date' => now()->addDays(3),
                'is_published' => true,
                'created_by' => $request->user()->id,
            ]);
            // Bump the announcements resource
            try {
                \App\Services\LiveDataVersion::bump('announcements');
            } catch (\Throwable $e) {}
        }

        return $this->successResponse(null, 'Notification sent successfully');
    }
}


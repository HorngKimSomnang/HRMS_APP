<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Announcement;
use App\Models\User;
use App\Notifications\NewHoliday;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Notification;

class AnnouncementController extends Controller
{
    public function index(Request $request)
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();
        $query = Announcement::with('creator')->orderBy('created_at', 'desc');
        
        if (!$user->hasRole('Super Admin') && !$user->hasRole('Admin')) {
            $query->where('is_published', true);
        }
        
        if ($request->has('type')) {
            $query->where('type', $request->type);
        }

        return response()->json(['data' => $query->get()]);
    }

    public function latest()
    {
        $announcements = Announcement::where('is_published', true)
                            ->orderBy('created_at', 'desc')
                            ->take(5)
                            ->get();
        return response()->json(['data' => $announcements]);
    }

    public function store(Request $request)
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();
        if (!$user->hasRole('Super Admin') && !$user->hasRole('Admin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Allow Admins to post Holiday and Urgent notices now as per standard HR flow.

        $request->validate([
            'type' => 'required|in:Holiday,General,Urgent,Info',
            'title' => 'required|string|max:255',
            'content' => 'required|string',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'is_published' => 'boolean',
        ]);

        $announcement = Announcement::create([
            'type' => $request->type,
            'title' => $request->title,
            'content' => $request->input('content'),
            'start_date' => $request->start_date,
            'end_date' => $request->end_date,
            'is_published' => $request->is_published ?? true,
            'created_by' => $user->id,
        ]);

        if ($announcement->is_published) {
            $users = User::where('id', '!=', $user->id)->get(); // Notify everyone else
            Notification::send($users, new NewHoliday($announcement));
        }

        return response()->json(['message' => 'Announcement created successfully.', 'data' => $announcement], 201);
    }

    public function show(int|string $id)
    {
        $announcement = Announcement::with('creator')->findOrFail($id);
        return response()->json(['data' => $announcement]);
    }

    public function update(Request $request, int|string $id)
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();
        if (!$user->hasRole('Super Admin') && !$user->hasRole('Admin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $announcement = Announcement::findOrFail($id);

        if ($announcement->creator && $announcement->creator->hasRole('Super Admin') && !$user->hasRole('Super Admin')) {
            return response()->json(['message' => 'You cannot modify a notice created by a Super Admin.'], 403);
        }

        // Allow Admins to update Holiday and Urgent notices

        $request->validate([
            'type' => 'sometimes|in:Holiday,General,Urgent,Info',
            'title' => 'sometimes|string|max:255',
            'content' => 'sometimes|string',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'is_published' => 'boolean',
        ]);

        $updateData = $request->all();
        // Removed the override that forces is_published to false for normal Admins.

        $wasUnpublished = !$announcement->is_published;
        $announcement->update($updateData);

        if ($wasUnpublished && $announcement->is_published) {
            $users = User::where('id', '!=', $user->id)->get();
            Notification::send($users, new NewHoliday($announcement));
        }

        return response()->json(['message' => 'Announcement updated successfully.', 'data' => $announcement]);
    }

    public function destroy(int|string $id)
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();
        if (!$user->hasRole('Super Admin') && !$user->hasRole('Admin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $announcement = Announcement::findOrFail($id);

        if ($announcement->creator && $announcement->creator->hasRole('Super Admin') && !$user->hasRole('Super Admin')) {
            return response()->json(['message' => 'You cannot delete a notice created by a Super Admin.'], 403);
        }

        $announcement->delete();

        return response()->json(['message' => 'Announcement deleted successfully.']);
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Task;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

class TaskController extends Controller
{
    public function index(Request $request)
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();

        // If employee, only show assigned tasks
        if ($user->hasRole('Employee')) {
            $employee = $user->employee;
            if (!$employee) return $this->successResponse([], 'No employee profile found');

            $tasks = Task::where('assigned_to', $employee->id)
                ->with(['creator'])
                ->orderByRaw("CASE 
                    WHEN status = 'pending' THEN 1 
                    WHEN status = 'in_progress' THEN 2 
                    WHEN status = 'completed' THEN 3 
                    ELSE 4 END")
                ->orderBy('due_date', 'asc')
                ->get();
                
            return $this->successResponse($tasks, 'Tasks retrieved successfully');
        }
        
        // Super Admin / Admin may request the complete task collection so the
        // task board can separate active and completed work without older tasks
        // silently disappearing behind the first pagination page.
        $query = Task::with(['employee', 'creator'])
            ->orderBy('created_at', 'desc');

        if ($request->filled('status')) {
            $request->validate([
                'status' => 'in:pending,in_progress,completed',
            ]);
            $query->where('status', $request->string('status')->toString());
        }

        $tasks = $request->boolean('all')
            ? $query->get()
            : $query->paginate(20);
            
        return $this->successResponse($tasks, 'All tasks retrieved successfully');
    }

    public function store(Request $request)
    {
        $request->validate([
            'title' => 'required|string',
            'assigned_to' => 'required|array|min:1',
            'assigned_to.*' => 'exists:employees,id',
            'priority' => 'required|in:low,medium,high',
            'due_date' => 'required|date',
        ]);

        $attachmentPath = null;
        if ($request->hasFile('attachment')) {
            $attachmentPath = $request->file('attachment')->store('tasks/attachments', 'public');
        }

        $tasks = [];
        foreach ($request->assigned_to as $employeeId) {
            $task = Task::create([
                'title' => $request->title,
                'description' => $request->description,
                'assigned_to' => $employeeId,
                'assigned_by' => Auth::id(),
                'priority' => $request->priority,
                'due_date' => $request->due_date,
                'status' => 'pending',
                'attachment_path' => $attachmentPath
            ]);

            $task->load(['employee', 'creator']);
            $tasks[] = $task;

            // Notify the assigned employee's user account
            $employee = \App\Models\Employee::find($employeeId);
            if ($employee && $employee->user) {
                $employee->user->notify(new \App\Notifications\TaskAssigned($task));
            }
        }

        // Return multiple tasks created to handle frontend easily, or just a success message
        return $this->successResponse($tasks, 'Tasks assigned successfully', 201);
    }

    public function update(Request $request, int|string $id)
    {
        $task = Task::findOrFail($id);
        /** @var \App\Models\User $user */
        $user = Auth::user();

        // Employee submitting their own task — branch on ROLE, never on which fields
        // were sent (a request that merely includes a "title" key must not be able to
        // fall through into the unrestricted admin-update path below).
        if ($user->hasRole('Employee')) {
            $employee = $user->employee;
            if (!$employee || (int) $task->assigned_to !== (int) $employee->id) {
                return $this->errorResponse('You are not authorized to update this task.', 403);
            }

            if ($request->has('status')) {
                $request->validate(['status' => 'required|in:pending,in_progress,completed']);
                $task->status = $request->status;
            }

            if ($request->hasFile('submission')) {
                if ($task->submission_path) Storage::disk('public')->delete($task->submission_path);
                $task->submission_path = $request->file('submission')->store('tasks/submissions', 'public');
            }

            if ($request->has('submission_note')) {
                $task->submission_note = $request->submission_note;
            }

            $task->save();

            // Notify admins when task is completed
            if ($request->status === 'completed') {
                $admins = \App\Models\User::role('Super Admin')->get();
                \Illuminate\Support\Facades\Notification::send(
                    $admins,
                    new \App\Notifications\TaskCompleted($task)
                );
            }

            return $this->successResponse($task, 'Task updated successfully');
        }

        if (!$user->hasRole(['Super Admin', 'Admin'])) {
            return $this->errorResponse('Unauthorized', 403);
        }

        // Admin updates — explicitly whitelist safe fields to prevent forging assigned_by etc.
        $request->validate([
            'title'       => 'sometimes|required|string',
            'description' => 'nullable|string',
            'priority'    => 'sometimes|required|in:low,medium,high',
            'due_date'    => 'sometimes|required|date',
            'status'      => 'sometimes|required|in:pending,in_progress,completed',
            'assigned_to' => 'sometimes|exists:employees,id',
        ]);
        $task->update($request->only(['title', 'description', 'priority', 'due_date', 'status', 'assigned_to']));

        if ($request->hasFile('attachment')) {
            if ($task->attachment_path) Storage::disk('public')->delete($task->attachment_path);
            $task->attachment_path = $request->file('attachment')->store('tasks/attachments', 'public');
            $task->save();
        }

        $task->load(['employee', 'creator']);
        return $this->successResponse($task, 'Task updated successfully');
    }

    public function destroy(int|string $id)
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();
        if (!$user->hasRole(['Super Admin', 'Admin'])) {
            return $this->errorResponse('Unauthorized', 403);
        }

        $task = Task::findOrFail($id);
        $task->delete();
        return $this->successResponse(null, 'Task deleted successfully');
    }
}

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

        $query = Task::with(['employee', 'creator']);

        if (!$user->hasRole('Super Admin')) {
            $managedDepartmentIds = $user->getManagedDepartmentIds();
            if (empty($managedDepartmentIds)) {
                $query->where('assigned_to', $user->employee?->id ?? -1)
                      ->orderByRaw("CASE 
                          WHEN status = 'pending' THEN 1 
                          WHEN status = 'in_progress' THEN 2 
                          WHEN status = 'completed' THEN 3 
                          ELSE 4 END")
                      ->orderBy('due_date', 'asc');
            } else {
                $query->where(function ($q) use ($managedDepartmentIds, $user) {
                    $q->whereHas('employee.user', function ($q2) use ($managedDepartmentIds) {
                        $q2->whereIn('department_id', $managedDepartmentIds);
                    })->orWhere('assigned_to', $user->employee?->id ?? -1);
                })->orderBy('created_at', 'desc');
            }
        } else {
            $query->orderBy('created_at', 'desc');
        }

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

        \App\Services\LiveDataVersion::bump('tasks');

        // Return multiple tasks created to handle frontend easily, or just a success message
        return $this->successResponse($tasks, 'Tasks assigned successfully', 201);
    }

    public function update(Request $request, int|string $id)
    {
        $task = Task::findOrFail($id);
        /** @var \App\Models\User $user */
        $user = Auth::user();

        // 1. Employee assigned to the task is allowed to update status/submission
        $employee = $user->employee;
        $isAssignedEmployee = $employee && (int) $task->assigned_to === (int) $employee->id;

        if ($isAssignedEmployee) {
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
            \App\Services\LiveDataVersion::bump('tasks');

            // Notify admins when task is completed
            if ($request->status === 'completed') {
                $admins = \App\Models\User::whereHas('assignedRoles', fn($q) => $q->where('name', 'Super Admin'))->get();
                \Illuminate\Support\Facades\Notification::send(
                    $admins,
                    new \App\Notifications\TaskCompleted($task)
                );
            }

            return $this->successResponse($task, 'Task updated successfully');
        }

        // 2. Otherwise, check if user has Admin rights (Super Admin role OR tasks.edit permission)
        if (!$user->hasRole(['Super Admin']) && !$user->hasPermissionTo('tasks.edit')) {
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
        \App\Services\LiveDataVersion::bump('tasks');
        return $this->successResponse($task, 'Task updated successfully');
    }

    public function destroy(int|string $id)
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();
        if (!$user->hasRole(['Super Admin'])) {
            return $this->errorResponse('Unauthorized', 403);
        }

        $task = Task::findOrFail($id);
        $task->delete();
        \App\Services\LiveDataVersion::bump('tasks');
        return $this->successResponse(null, 'Task deleted successfully');
    }
}

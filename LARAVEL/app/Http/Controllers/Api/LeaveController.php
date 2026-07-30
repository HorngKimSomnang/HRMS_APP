<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Leave;
use App\Services\AuditLogger;
use App\Support\HrCatalog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class LeaveController extends Controller
{
    public function store(Request $request)
    {
        $request->validate([
            'leave_type_id' => 'nullable|integer',
            'leave_type' => 'nullable|string|max:255',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'reason' => 'required|string',
        ]);

        $start = \Carbon\Carbon::parse($request->start_date);
        $end = \Carbon\Carbon::parse($request->end_date);
        $days = $start->diffInDays($end) + 1;

        // Allow Admin to assign day off to specific employee
        $user = Auth::user();
        $employeeId = $request->input('employee_id');
        
        if ($employeeId && ($user->hasRole('Admin') || $user->hasRole('Super Admin'))) {
            $employee = \App\Models\Employee::find($employeeId);
        } else {
            $employee = $user?->employee;
        }

        if (!$employee) {
            return response()->json(['message' => 'Employee record not found.'], 400);
        }

        $leaveType = $request->leave_type;
        $typeConfig = null;
        if (!$leaveType && $request->filled('leave_type_id')) {
            $typeConfig = HrCatalog::findLeaveTypeById((int) $request->leave_type_id);
            $leaveType = $typeConfig['name'] ?? null;
        } else if ($leaveType) {
            $types = HrCatalog::getLeaveTypes();
            foreach ($types as $t) {
                if (strtolower($t['name']) === strtolower($leaveType)) {
                    $typeConfig = $t;
                    break;
                }
            }
        }
        
        // Admin assigning leave to ANOTHER employee — not their own record
        $isAdminAction = $employeeId &&
            ($user->hasRole('Admin') || $user->hasRole('Super Admin')) &&
            ((int) $employeeId !== (int) ($user->employee?->id ?? 0));

        if (!$leaveType || (!$typeConfig && !$isAdminAction)) {
            return response()->json(['message' => 'A valid leave type is required.'], 422);
        }

        // Dynamic Leave Balance Validation
        $daysAllowed = (int) ($typeConfig['days_allowed'] ?? 0);
        $currentYear = \Carbon\Carbon::now()->year;

        $usedDays = Leave::where('employee_id', $employee->id)
            ->where('leave_type', $leaveType)
            ->whereIn('status', ['approved', 'pending'])
            ->whereYear('start_date', $currentYear)
            ->sum('days_count');

        if (!$isAdminAction) {
            if (($usedDays + $days) > $daysAllowed) {
                $remaining = max(0, $daysAllowed - $usedDays);
                return response()->json([
                    'message' => "Insufficient leave balance. You only have {$remaining} days remaining for {$leaveType}."
                ], 422);
            }
        }

        $leave = Leave::create([
            'employee_id' => $employee->id,
            'leave_type' => $leaveType,
            'start_date' => $request->start_date,
            'end_date' => $request->end_date,
            'days_count' => $days,
            'reason' => $request->reason,
            'status' => ($employeeId && ($user->hasRole('Admin') || $user->hasRole('Super Admin'))) ? 'approved' : 'pending',
            'approved_by' => ($employeeId && ($user->hasRole('Admin') || $user->hasRole('Super Admin'))) ? $user->id : null,
        ]);

        // Notify Admins only if it's a pending request from employee
        if ($leave->status === 'pending') {
            $admins = \App\Models\User::role(['Admin', 'Super Admin'])->get();
            \Illuminate\Support\Facades\Notification::send($admins, new \App\Notifications\LeaveRequested($leave));
        } else if ($isAdminAction) {
            // Notify the employee that an Admin has assigned them a day off / approved leave
            try {
                $leave->employee?->user?->notify(new \App\Notifications\LeaveStatusUpdated($leave));
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::error('Failed to send leave assignment notification: ' . $e->getMessage());
            }
        }

        return response()->json([
            'message' => 'Leave requested successfully',
            'data' => $this->transformLeave($leave->load(['employee.user'])),
        ], 201);
    }

    public function index()
    {
        $user = Auth::user();
        $query = Leave::with(['employee.user'])->orderBy('created_at', 'desc');

        if ($user->hasRole('Employee')) {
            if (!$user->employee) {
                return response()->json(['message' => 'Employee profile not found.'], 404);
            }

            $query->where('employee_id', $user->employee->id);
        }

        $leaves = $query->get()->map(fn (Leave $leave) => $this->transformLeave($leave))->values();

        return response()->json($leaves);
    }

    public function updateStatus(Request $request, $id)
    {
        $request->validate([
            'status' => 'required|in:approved,rejected',
            'rejection_reason' => 'required_if:status,rejected|nullable|string|max:500',
        ]);

        $leave = Leave::findOrFail($id);
        $user = Auth::user();

        // A processed decision is immutable until an Admin or Super Admin
        // explicitly restores it to Pending from the Archived view.
        if ($leave->status !== 'pending') {
            return response()->json([
                'message' => 'This leave request is archived. Restore it to Pending before making another decision.'
            ], 409);
        }
        
        $oldStatus = $leave->status;
        $newStatus = $request->status;

        $leave->update([
            'status' => $newStatus,
            'approved_by' => $user->id,
            'rejection_reason' => $request->rejection_reason,
        ]);

        // Log Audit Trail
        AuditLogger::log($request, 'LEAVE_STATUS_CHANGED', $leave, [
            'from_status'      => $oldStatus,
            'status'           => $newStatus,
            'leave_type'       => $leave->leave_type,
            'employee'         => $leave->employee?->user?->name,
            'rejection_reason' => $request->rejection_reason,
        ]);

        // Notify Employee
        try {
            $leave->employee?->user?->notify(new \App\Notifications\LeaveStatusUpdated($leave));
        } catch (\Exception $e) {
            // Log error but don't fail the request if mail fails
            \Illuminate\Support\Facades\Log::error('Failed to send leave status notification: ' . $e->getMessage());
        }

        return response()->json([
            'message' => 'Leave status updated',
            'data' => $this->transformLeave($leave->load(['employee.user'])),
        ]);
    }

    public function restoreStatus(Request $request, $id)
    {
        $leave = Leave::findOrFail($id);

        if (! in_array($leave->status, ['approved', 'rejected'], true)) {
            return response()->json([
                'message' => 'Only an archived Approved or Rejected leave can be restored.'
            ], 409);
        }

        $oldStatus = $leave->status;
        $leave->update([
            'status' => 'pending',
            'approved_by' => null,
            'rejection_reason' => null,
        ]);

        AuditLogger::log($request, 'LEAVE_STATUS_RESTORED', $leave, [
            'from_status' => $oldStatus,
            'status' => 'pending',
            'leave_type' => $leave->leave_type,
            'employee' => $leave->employee?->user?->name,
            'restored_by' => $request->user()?->name,
        ]);

        try {
            $leave->employee?->user?->notify(new \App\Notifications\LeaveStatusUpdated($leave));
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Failed to send restored leave notification: '.$e->getMessage());
        }

        return response()->json([
            'message' => 'Leave request restored to Pending',
            'data' => $this->transformLeave($leave->load(['employee.user'])),
        ]);
    }

    private function transformLeave(Leave $leave): array
    {
        $payload = $leave->toArray();
        $payload['leave_type_name'] = $leave->getAttribute('leave_type');
        $payload['leave_type'] = [
            'id' => null,
            'name' => $leave->getAttribute('leave_type'),
        ];
        
        return $payload;
    }

    public function show($id)
    {
        $leave = Leave::with(['employee.user'])->findOrFail($id);
        $user = Auth::user();

        if ($user->hasRole('Employee') && $leave->employee_id !== $user->employee?->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json($this->transformLeave($leave));
    }

    public function balances(Request $request)
    {
        $user = Auth::user();
        
        // Admin can view balances of a specific employee, otherwise defaults to self
        $employeeId = $request->has('employee_id') && $user->hasRole(['Admin', 'Super Admin']) 
            ? $request->employee_id 
            : $user->employee?->id;

        if (!$employeeId) {
            return response()->json([]);
        }

        $currentYear = \Carbon\Carbon::now()->year;
        $types = HrCatalog::getLeaveTypes();
        $balances = [];

        foreach ($types as $type) {
            $usedDays = Leave::where('employee_id', $employeeId)
                ->where('leave_type', $type['name'])
                ->whereIn('status', ['approved', 'pending'])
                ->whereYear('start_date', $currentYear)
                ->sum('days_count');

            $allowed = (int) ($type['days_allowed'] ?? 0);
            
            $balances[] = [
                'leave_type' => $type['name'],
                'days_allowed' => $allowed,
                'days_used' => (int) $usedDays,
                'days_remaining' => max(0, $allowed - $usedDays)
            ];
        }

        return response()->json($balances);
    }

    public function destroy($id)
    {
        $leave = Leave::findOrFail($id);
        $user = Auth::user();

        // Only Admin, Super Admin, or the Employee who owns the leave (if it's still pending) can delete it
        $isAdminAction = $user->hasRole(['Admin', 'Super Admin']);
        if (!$isAdminAction && ($leave->employee_id !== $user->employee?->id || $leave->status !== 'pending')) {
            return response()->json([
                'message' => 'You do not have permission to delete this leave request. Approved leaves can only be revoked by HR.'
            ], 403);
        }

        $leave->delete(); // This triggers soft delete because of the SoftDeletes trait in the model/migration

        // Log Audit Trail for HR Revoke
        if ($isAdminAction) {
            AuditLogger::log(request(), 'LEAVE_REVOKED', $leave, [
                'leave_id'   => $leave->id,
                'leave_type' => $leave->leave_type,
                'employee'   => $leave->employee?->user?->name,
                'revoked_by' => $user->name,
            ]);
        }

        return response()->json(['message' => 'Leave successfully revoked/deleted.']);
    }
}

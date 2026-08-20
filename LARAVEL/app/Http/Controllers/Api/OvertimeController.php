<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Overtime;
use App\Models\User;
use App\Notifications\OvertimeRequested;
use App\Services\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;

class OvertimeController extends Controller
{
    public function index()
    {
        $user = Auth::user();
        $query = Overtime::with(['employee.user', 'approver'])->orderBy('created_at', 'desc');

        if (!$user->hasRole('Super Admin')) {
            $managedDepartmentIds = $user->getManagedDepartmentIds();
            if (empty($managedDepartmentIds)) {
                $query->where('employee_id', $user->employee?->id ?? -1);
            } else {
                $query->whereHas('employee.user', function ($q) use ($managedDepartmentIds) {
                    $q->whereIn('department_id', $managedDepartmentIds);
                });
            }
        }

        return response()->json($query->get());
    }

    public function store(Request $request)
    {
        $request->validate([
            'date' => 'required|date',
            'start_time' => 'nullable|date_format:H:i',
            'end_time' => 'nullable|date_format:H:i|after:start_time',
            'hours' => 'required|numeric|min:0.5|max:24',
            'reason' => 'required|string',
        ]);

        $user = Auth::user();
        $employeeId = $request->input('employee_id');
        
        if ($employeeId && (int) $employeeId !== (int) ($user->employee?->id ?? 0)) {
            if (!$user->hasPermissionTo('overtime.assign')) {
                return response()->json(['message' => 'Forbidden. You do not have permission to assign overtime.'], 403);
            }
            $employee = \App\Models\Employee::find($employeeId);
        } else {
            if (!$user->hasPermissionTo('overtime.create')) {
                return response()->json(['message' => 'Forbidden. You do not have permission to request overtime.'], 403);
            }
            $employee = $user->employee;
        }

        if (!$employee) {
            return response()->json(['message' => 'Employee profile not found.'], 400);
        }

        // Prevent assigning overtime if it overlaps with the employee's shift hours on a work day
        $shift = $employee->shift;
        if ($shift && $request->filled('start_time') && $request->filled('end_time')) {
            $dayOfWeek = \Carbon\Carbon::parse($request->date)->format('l');
            $workDays = $shift['work_days'] ?? \App\Support\HrCatalog::defaultWorkDays();
            
            if (in_array($dayOfWeek, $workDays)) {
                $shiftStartTime = \Carbon\Carbon::parse($shift['start_time'])->format('H:i');
                $shiftEndTime = \Carbon\Carbon::parse($shift['end_time'])->format('H:i');
                
                $otStartTime = \Carbon\Carbon::parse($request->start_time)->format('H:i');
                $otEndTime = \Carbon\Carbon::parse($request->end_time)->format('H:i');
                
                if ($otStartTime < $shiftEndTime && $shiftStartTime < $otEndTime) {
                    return response()->json([
                        'message' => "Cannot assign/request overtime because the requested period ({$otStartTime} - {$otEndTime}) overlaps with the employee's regular shift hours ({$shiftStartTime} - {$shiftEndTime}) on a work day."
                    ], 422);
                }
            }
        }

        $existingAutoOT = Overtime::where('employee_id', $employee->id)
            ->where('date', $request->date)
            ->where('origin', 'attendance_auto')
            ->exists();

        if ($existingAutoOT) {
            return response()->json(['message' => 'An auto-detected overtime record already exists for this date. Please review the existing record.'], 422);
        }

        $overtime = Overtime::create([
            'employee_id' => $employee->id,
            'date' => $request->date,
            'start_time' => $request->start_time,
            'end_time' => $request->end_time,
            'hours' => $request->hours,
            'reason' => $request->reason,
            'status' => 'pending',
            'origin' => 'manual',
        ]);

        try {
            $overtime->loadMissing('employee.user');
            $reviewers = User::whereHas('assignedRoles', fn($q) => $q->whereIn('name', ['Super Admin']))->get();
            Notification::send($reviewers, new OvertimeRequested($overtime));
        } catch (\Exception $exception) {
            Log::error('Failed to send overtime request notification: '.$exception->getMessage());
        }

        return response()->json(['message' => 'Overtime request submitted successfully.', 'data' => $overtime], 201);
    }

    public function update(Request $request, $id)
    {
        $overtime = Overtime::findOrFail($id);
        $user = Auth::user();

        if ($request->has('status') && in_array($request->status, ['approved', 'rejected', 'pending'])) {
            $requiredPermission = $request->status === 'pending' ? 'overtime.return' : 'overtime.approve';
            if (!$user->hasPermissionTo($requiredPermission)) {
                return response()->json(['message' => "Forbidden. You do not have permission to {$request->status} overtime."], 403);
            }

            if ($request->status === 'pending') {
                if ($overtime->status !== 'pending' && $overtime->updated_at && $overtime->updated_at->diffInMinutes(now()) > 30) {
                    return response()->json(['message' => 'Cannot return overtime to pending status after 30 minutes.'], 422);
                }
            }

            $request->validate([
                'status' => 'required|in:pending,approved,rejected',
            ]);
            
            $oldStatus = $overtime->status;

            $overtime->update([
                'status' => $request->status,
                'approved_by' => $user->id,
            ]);

            // Calculate OT pay for the audit trail
            if ($request->status === 'approved' && $oldStatus !== 'approved') {
                $employee = $overtime->employee;
                $basicSalary = $employee->basic_salary ?: 0;
                // Assuming 160 hours/month standard, 1.5 multiplier for OT
                $hourlyRate = $basicSalary > 0 ? ($basicSalary / 160) : 10;
                $otPay = $hourlyRate * 1.5 * $overtime->hours;

                AuditLogger::log($request, 'OVERTIME_APPROVED', $overtime, [
                    'employee'       => $employee->user?->name,
                    'date'           => $overtime->date,
                    'hours'          => $overtime->hours,
                    'calculated_pay' => round($otPay, 2),
                ]);
            }
            
            // Notify employee if status changed
            if ($oldStatus !== $request->status) {
                try {
                    $overtime->employee?->user?->notify(new \App\Notifications\OvertimeStatusUpdated($overtime));
                } catch (\Exception $e) {
                    Log::error('Failed to send overtime notification: ' . $e->getMessage());
                }
            }
        } else {
            if (!$user->employee || $overtime->employee_id !== $user->employee->id) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }
            if ($overtime->status !== 'pending') {
                return response()->json(['message' => 'Cannot update processed request'], 400);
            }

            $request->validate([
                'date' => 'sometimes|date',
                'start_time' => 'nullable|date_format:H:i',
                'end_time' => 'nullable|date_format:H:i|after:start_time',
                'hours' => 'sometimes|numeric|min:0.5|max:24',
                'reason' => 'sometimes|string',
            ]);

            $overtime->update($request->only(['date', 'start_time', 'end_time', 'hours', 'reason']));
        }

        return response()->json(['message' => 'Overtime request updated successfully.', 'data' => $overtime]);
    }

    public function destroy($id)
    {
        $overtime = Overtime::findOrFail($id);
        $user = Auth::user();
        $isSuperAdmin = $user->hasRole('Super Admin');

        if (!$isSuperAdmin && (!$user->employee || $overtime->employee_id !== $user->employee->id)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        
        if (!$isSuperAdmin && $overtime->status !== 'pending') {
            return response()->json(['message' => 'Cannot delete processed request'], 400);
        }

        $overtime->delete();
        return response()->json(['message' => 'Overtime request deleted successfully.']);
    }

    public function restore(Request $request, Overtime $overtime)
    {
        $user = Auth::user();

        if (!$user->hasPermissionTo('overtime.edit') && !$user->hasPermissionTo('overtime.approve')) {
            return response()->json(['message' => 'Forbidden. You do not have permission to restore overtime.'], 403);
        }

        if ($overtime->status !== 'pending') {
            $minutesSinceUpdate = now()->diffInMinutes($overtime->updated_at);
            if ($minutesSinceUpdate > 30) {
                return response()->json(['message' => 'Cannot return overtime to pending status after 30 minutes.'], 403);
            }
            

        }

        $oldStatus = $overtime->status;
        $overtime->status = 'pending';
        $overtime->approved_by = null;
        $overtime->save();

        AuditLogger::log($request, 'OVERTIME_STATUS_RESTORED', $overtime, [
            'from' => $oldStatus,
            'to' => 'pending'
        ]);

        return response()->json([
            'message' => 'Overtime restored to pending successfully.',
            'data' => $overtime->load(['employee.user', 'approver'])
        ]);
    }
}

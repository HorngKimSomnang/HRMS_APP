<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Overtime;
use App\Services\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class OvertimeController extends Controller
{
    public function index()
    {
        $user = Auth::user();
        $query = Overtime::with(['employee.user', 'approver'])->orderBy('created_at', 'desc');

        if (!$user->hasAnyRole(['Admin', 'Super Admin'])) {
            if (!$user->employee) {
                return response()->json([]);
            }
            $query->where('employee_id', $user->employee->id);
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
        if (!$user->employee) {
            return response()->json(['message' => 'Employee profile not found.'], 400);
        }

        $overtime = Overtime::create([
            'employee_id' => $user->employee->id,
            'date' => $request->date,
            'start_time' => $request->start_time,
            'end_time' => $request->end_time,
            'hours' => $request->hours,
            'reason' => $request->reason,
            'status' => 'pending',
        ]);

        return response()->json(['message' => 'Overtime request submitted successfully.', 'data' => $overtime], 201);
    }

    public function update(Request $request, $id)
    {
        $overtime = Overtime::findOrFail($id);
        $user = Auth::user();
        $isAdmin = $user->hasAnyRole(['Admin', 'Super Admin']);

        if ($isAdmin) {
            $request->validate([
                'status' => 'required|in:pending,approved,rejected',
            ]);
            
            $oldStatus = $overtime->status;

            $overtime->update([
                'status' => $request->status,
                'approved_by' => $user->id,
            ]);

            // Queue for Payroll (Calculate OT Pay)
            if ($request->status === 'approved' && $oldStatus !== 'approved') {
                $employee = $overtime->employee;
                $basicSalary = $employee->basic_salary ?: 0;
                // Assuming 160 hours/month standard, 1.5 multiplier for OT
                $hourlyRate = $basicSalary > 0 ? ($basicSalary / 160) : 10; 
                $otPay = $hourlyRate * 1.5 * $overtime->hours;

                \App\Models\PayrollRequest::create([
                    'employee_id' => $employee->id,
                    'type' => 'overtime',
                    'date' => $overtime->date,
                    'value' => round($otPay, 2),
                    'reason' => 'Auto-queued Overtime: ' . $overtime->hours . ' hrs on ' . $overtime->date . ' (' . $overtime->reason . ')',
                    'status' => 'approved', // Automatically approved
                ]);

                // Also update audit trail for the approval and queue
                AuditLogger::log($request, 'OVERTIME_APPROVED_AND_QUEUED', $overtime, [
                    'employee'       => $employee->user?->name,
                    'date'           => $overtime->date,
                    'hours'          => $overtime->hours,
                    'calculated_pay' => round($otPay, 2),
                ]);
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
        $isAdmin = $user->hasAnyRole(['Admin', 'Super Admin']);

        if (!$isAdmin && (!$user->employee || $overtime->employee_id !== $user->employee->id)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        
        if (!$isAdmin && $overtime->status !== 'pending') {
            return response()->json(['message' => 'Cannot delete processed request'], 400);
        }

        $overtime->delete();
        return response()->json(['message' => 'Overtime request deleted successfully.']);
    }
}

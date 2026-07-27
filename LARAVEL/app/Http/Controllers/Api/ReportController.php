<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Attendance;
use App\Models\Employee;
use App\Services\AttendanceReconciliationService;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;

class ReportController extends Controller
{
    /** Shared RBAC guard for all report endpoints */
    private function authorizeAdmin()
    {
        if (!Auth::user()->hasAnyRole(['Admin', 'Super Admin'])) {
            abort(403, 'Unauthorized. Only Admin or Super Admin can access reports.');
        }
    }
    public function attendanceReport(
        Request $request,
        AttendanceReconciliationService $reconciliation
    )
    {
        $this->authorizeAdmin();

        $request->validate([
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'employee_id' => 'nullable|exists:employees,id'
        ]);

        $startDate = Carbon::parse($request->start_date, 'Asia/Phnom_Penh')->startOfDay();
        $lastCompletedDate = Carbon::yesterday('Asia/Phnom_Penh')->startOfDay();
        $requestedEndDate = Carbon::parse($request->end_date, 'Asia/Phnom_Penh')->startOfDay();
        $reconciliationEndDate = $requestedEndDate->lt($lastCompletedDate)
            ? $requestedEndDate
            : $lastCompletedDate;

        if ($startDate->lte($reconciliationEndDate)) {
            $reconciliation->reconcileRange($startDate, $reconciliationEndDate);
        }

        $query = Attendance::with(['employee.user'])
                    ->whereBetween('date', [$request->start_date, $request->end_date]);

        if ($request->employee_id) {
            $query->where('employee_id', $request->employee_id);
        }

        $records = $query->get();

        // Summary stats computed directly on the loaded collection (no soft-deleted records included)
        $totalPresent = $records->where('status', 'present')->count();
        $totalLate    = $records->where('status', 'late')->count();
        $totalAbsent  = $records->where('status', 'absent')->count();

        return response()->json([
            'summary' => [
                'total_records' => $records->count(),
                'present' => $totalPresent,
                'late'    => $totalLate,
                'absent'  => $totalAbsent,
            ],
            'data' => $records
        ]);
    }
    public function leavesReport(Request $request)
    {
        $this->authorizeAdmin();

        $request->validate([
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'employee_id' => 'nullable|exists:employees,id'
        ]);

        $query = \App\Models\Leave::with(['employee.user'])
                    ->where(function($q) use ($request) {
                        $q->whereBetween('start_date', [$request->start_date, $request->end_date])
                          ->orWhereBetween('end_date', [$request->start_date, $request->end_date]);
                    });

        if ($request->employee_id) {
            $query->where('employee_id', $request->employee_id);
        }

        $records = $query->get();

        return response()->json([
            'summary' => [
                'total_records' => $records->count(),
                'approved' => $records->where('status', 'approved')->count(),
                'pending' => $records->where('status', 'pending')->count(),
                'rejected' => $records->where('status', 'rejected')->count(),
            ],
            'data' => $records
        ]);
    }

    public function employeesReport(Request $request)
    {
        $this->authorizeAdmin();

        $request->validate([
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date',
        ]);

        $query = Employee::with('user');

        // Removing the date filter so the Employees Report shows ALL employees, 
        // rather than only employees who joined within this specific date range.
        // This acts as a complete company directory.

        $records = $query->get();

        return response()->json([
            'summary' => [
                'total_employees' => $records->count(),
                'active' => $records->where('status', 'active')->count(),
            ],
            'data' => $records
        ]);
    }

    public function payrollReport(Request $request)
    {
        $this->authorizeAdmin();

        $request->validate([
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date',
            'employee_id' => 'nullable|exists:employees,id'
        ]);

        $query = \App\Models\Payslip::with(['employee.user']);

        if ($request->start_date && $request->end_date) {
            // Compare created_at since month/year are strings
            $query->whereBetween('created_at', [$request->start_date . ' 00:00:00', $request->end_date . ' 23:59:59']);
        }
        
        if ($request->employee_id) {
            $query->where('employee_id', $request->employee_id);
        }

        $records = $query->get();

        return response()->json([
            'summary' => [
                'total_payslips' => $records->count(),
                'total_net_salary' => $records->sum('net_salary'),
            ],
            'data' => $records
        ]);
    }

    public function overtimeReport(Request $request)
    {
        $this->authorizeAdmin();

        $request->validate([
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'employee_id' => 'nullable|exists:employees,id'
        ]);

        $query = \App\Models\Overtime::with(['employee.user'])
                    ->whereBetween('date', [$request->start_date, $request->end_date]);
        
        if ($request->employee_id) {
            $query->where('employee_id', $request->employee_id);
        }

        $records = $query->get();

        return response()->json([
            'summary' => [
                'total_requests' => $records->count(),
                'approved' => $records->where('status', 'approved')->count(),
                'total_hours' => $records->where('status', 'approved')->sum('hours'),
            ],
            'data' => $records
        ]);
    }

    public function attendanceOvertimeReport(Request $request)
    {
        $request->validate([
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'employee_id' => 'nullable|exists:employees,id'
        ]);

        $attendancesQuery = Attendance::with(['employee.user'])
                    ->whereBetween('date', [$request->start_date, $request->end_date]);
        
        $overtimesQuery = \App\Models\Overtime::whereBetween('date', [$request->start_date, $request->end_date])
                    ->where('status', 'approved');

        if ($request->employee_id) {
            $attendancesQuery->where('employee_id', $request->employee_id);
            $overtimesQuery->where('employee_id', $request->employee_id);
        }

        $attendances = $attendancesQuery->get();
        $overtimes = $overtimesQuery->get()->groupBy(function($item) {
            return $item->employee_id . '_' . $item->date;
        });

        $mergedData = [];
        $totalOvertimeHours = 0;

        foreach ($attendances as $att) {
            $key = $att->employee_id . '_' . $att->date;
            $overtimeHours = 0;
            if (isset($overtimes[$key])) {
                $overtimeHours = $overtimes[$key]->sum('hours');
                $totalOvertimeHours += $overtimeHours;
            }

            $mergedData[] = [
                'date' => $att->date,
                'employee' => $att->employee,
                'status' => $att->status,
                'clock_in' => $att->clock_in,
                'clock_out' => $att->clock_out,
                'hours_worked' => $att->hours_worked,
                'overtime_hours' => $overtimeHours
            ];
        }

        return response()->json([
            'summary' => [
                'total_records' => count($mergedData),
                'total_base_hours' => collect($mergedData)->sum('hours_worked'),
                'total_overtime_hours' => $totalOvertimeHours,
            ],
            'data' => $mergedData
        ]);
    }

    public function sendToSuperAdmin(Request $request)
    {
        // Whoever can view/generate these reports can dispatch them upward too —
        // Super Admin should never be MORE restricted than Admin on the same feature.
        if (!Auth::user()->hasRole(['Admin', 'Super Admin'])) {
            return response()->json(['message' => 'Unauthorized. Only Admin or Super Admin can dispatch reports to Super Admin.'], 403);
        }

        $request->validate([
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
        ]);

        $superAdmins = \App\Models\User::role('Super Admin')->get();
        if ($superAdmins->isEmpty()) {
            return response()->json(['message' => 'No Super Admin found'], 404);
        }

        $senderName = $request->user()->name;
        $period = $request->start_date . ' to ' . $request->end_date;
        $reportType = $request->report_type ?? 'attendance';

        foreach ($superAdmins as $superAdmin) {
            $superAdmin->notify(new \App\Notifications\ReportSentNotification($senderName, $period, $reportType));
        }

        return response()->json(['message' => 'Report successfully sent to Super Admin']);
    }

}

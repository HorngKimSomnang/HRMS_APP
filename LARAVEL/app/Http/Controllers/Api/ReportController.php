<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Attendance;

use App\Models\Employee;
use App\Services\AttendanceReconciliationService;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ReportController extends Controller
{

    public function attendanceReport(
        Request $request,
        AttendanceReconciliationService $reconciliation
    )
    {

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

        $user = Auth::user();
        $managedDepartmentIds = $user->managedDepartments()->pluck('departments.id')->toArray();

        $query = Attendance::with(['employee.user'])
                    ->whereBetween('date', [$request->start_date, $request->end_date]);

        // Scope to managed departments unless caller manages zero departments
        if (!empty($managedDepartmentIds)) {
            $query->whereHas('employee.user', function ($q) use ($managedDepartmentIds) {
                $q->whereIn('department_id', $managedDepartmentIds);
            });
        }

        if ($request->employee_id) {
            $query->where('employee_id', $request->employee_id);
        }

        $records = $query->get();

        // Summary stats computed directly on the loaded collection (no soft-deleted records included)
        $totalPresent = $records->where('status', 'present')->count();
        $totalLate    = $records->where('status', 'late')->count();
        $totalAbsent  = $records->where('status', 'absent')->count();
        $totalOnLeave = $records->where('status', 'on_leave')->count();
        $totalDayOff = $records->where('status', 'day_off')->count();

        return response()->json([
            'summary' => [
                'total_records' => $records->count(),
                'present' => $totalPresent,
                'late'    => $totalLate,
                'absent'  => $totalAbsent,
                'on_leave' => $totalOnLeave,
                'day_off' => $totalDayOff,
            ],
            'data' => $records
        ]);
    }
    public function leavesReport(Request $request)
    {

        $request->validate([
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'employee_id' => 'nullable|exists:employees,id'
        ]);

        $user = Auth::user();
        $managedDepartmentIds = $user->managedDepartments()->pluck('departments.id')->toArray();

        $query = \App\Models\Leave::with(['employee.user'])
                    ->where(function($q) use ($request) {
                        $q->whereBetween('start_date', [$request->start_date, $request->end_date])
                          ->orWhereBetween('end_date', [$request->start_date, $request->end_date]);
                    });

        if (!empty($managedDepartmentIds)) {
            $query->whereHas('employee.user', function ($q) use ($managedDepartmentIds) {
                $q->whereIn('department_id', $managedDepartmentIds);
            });
        }

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

        $request->validate([
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date',
        ]);

        $user = Auth::user();
        $managedDepartmentIds = $user->managedDepartments()->pluck('departments.id')->toArray();

        $query = Employee::with('user');

        // Scope to managed departments
        if (!empty($managedDepartmentIds)) {
            $query->whereHas('user', function ($q) use ($managedDepartmentIds) {
                $q->whereIn('department_id', $managedDepartmentIds);
            });
        }

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

        $request->validate([
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date',
            'employee_id' => 'nullable|exists:employees,id'
        ]);

        $user = Auth::user();
        $managedDepartmentIds = $user->managedDepartments()->pluck('departments.id')->toArray();

        $query = \App\Models\Payslip::with(['employee.user']);

        if (!empty($managedDepartmentIds)) {
            $query->whereHas('employee.user', function ($q) use ($managedDepartmentIds) {
                $q->whereIn('department_id', $managedDepartmentIds);
            });
        }

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

        $request->validate([
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'employee_id' => 'nullable|exists:employees,id'
        ]);

        $user = Auth::user();
        $managedDepartmentIds = $user->managedDepartments()->pluck('departments.id')->toArray();

        $query = \App\Models\Overtime::with(['employee.user'])
                    ->whereBetween('date', [$request->start_date, $request->end_date]);

        if (!empty($managedDepartmentIds)) {
            $query->whereHas('employee.user', function ($q) use ($managedDepartmentIds) {
                $q->whereIn('department_id', $managedDepartmentIds);
            });
        }

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

}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Action;
use App\Models\Attendance;
use App\Models\Employee;
use App\Models\Leave;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class DashboardController extends Controller
{
    public function index()
    {
        $user = Auth::user();

        if ($user->hasRole('Super Admin')) {
            return $this->superAdminDashboard();
        }

        if ($user->hasRole('Admin')) {
            return $this->adminDashboard();
        }

        return $this->employeeDashboard($user);
    }

    private function superAdminDashboard()
    {
        // Headcount & Users
        $totalEmployees = Employee::where('status', 'active')->count();
        $totalUsers = \App\Models\User::count();
        
        $adminCount = \App\Models\User::whereHas('roles', function($q) {
            $q->where('name', 'Admin');
        })->count();

        // Department Distribution
        $departments = Employee::where('status', 'active')
            ->selectRaw('COALESCE(department, "Unassigned") as name, count(*) as value')
            ->groupBy('name')
            ->get();
            
        // Map colors for the pie chart
        $colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1'];
        $departmentData = $departments->map(function ($item, $index) use ($colors) {
            $item->color = $colors[$index % count($colors)];
            return $item;
        });

        // System Activity (Audit Logs for last 7 days)
        $activityChart = [];
        for ($i = 6; $i >= 0; $i--) {
            $date = Carbon::today()->subDays($i);
            $count = \App\Models\AuditLog::whereDate('created_at', $date)->count();
            $activityChart[] = [
                'name' => $date->format('D'),
                'logs' => $count
            ];
        }

        // Recent Audit Logs
        $recentLogs = \App\Models\AuditLog::with('user:id,first_name,last_name,email')
            ->orderBy('created_at', 'desc')
            ->take(5)
            ->get();

        return response()->json([
            'role' => 'superadmin',
            'stats' => [
                'total_employees' => $totalEmployees,
                'total_users' => $totalUsers,
                'total_admins' => $adminCount,
            ],
            'department_distribution' => $departmentData,
            'system_activity' => $activityChart,
            'recent_logs' => $recentLogs
        ]);
    }

    private function adminDashboard()
    {
        $today = Carbon::today();
        
        // Headcount
        $totalEmployees = Employee::where('status', 'active')->count();
        
        // Attendance
        $presentToday = Attendance::where('date', $today)
            ->where('status', 'present')
            ->count();
            
        // Pending Actions
        $pendingLeaves = Leave::where('status', 'pending')->count();
        
        // Payroll (Latest generated) defaults to None since module is removed
        $payrollStatus = 'None';

        return response()->json([
            'role' => 'admin',
            'stats' => [
                'total_employees' => $totalEmployees,
                'present_today' => $presentToday,
                'pending_leaves' => $pendingLeaves,
                'payroll_status' => $payrollStatus
            ],
            'attendance_chart' => $this->getAttendanceChartData(),
            'punctuality_chart' => $this->getPunctualityData(),
            'leave_trends' => $this->getLeaveTrendsData()
        ]);
    }

    private function getPunctualityData()
    {
        $startOfMonth = Carbon::now()->startOfMonth();
        $endOfMonth = Carbon::now()->endOfMonth();

        $onTime = Attendance::whereBetween('date', [$startOfMonth, $endOfMonth])
            ->where('status', 'present')
            ->count();

        $late = Attendance::whereBetween('date', [$startOfMonth, $endOfMonth])
            ->where('status', 'late')
            ->count();
            
        $absent = Attendance::whereBetween('date', [$startOfMonth, $endOfMonth])
            ->where('status', 'absent')
            ->count();

        return [
            ['name' => 'On Time', 'value' => $onTime, 'color' => '#10B981'],
            ['name' => 'Late', 'value' => $late, 'color' => '#F59E0B'],
            ['name' => 'Absent', 'value' => $absent, 'color' => '#EF4444'],
        ];
    }

    private function getLeaveTrendsData()
    {
        $year = Carbon::now()->year;
        $data = [];
        
        for ($i = 1; $i <= 12; $i++) {
            $monthName = Carbon::create()->month($i)->shortMonthName;
            $count = Leave::whereYear('start_date', $year)
                ->whereMonth('start_date', $i)
                ->where('status', 'approved')
                ->count();
            
            $data[] = [
                'name' => $monthName,
                'leaves' => $count
            ];
        }
        return $data;
    }

    private function getAttendanceChartData()
    {
        $data = [];
        // Get last 7 days including today
        for ($i = 6; $i >= 0; $i--) {
            $date = Carbon::today()->subDays($i);
            
            // Count Present
            $present = Attendance::whereDate('date', $date)
                ->where('status', 'present')
                ->count();
                
            $absent = Attendance::whereDate('date', $date)
                ->where('status', 'absent')
                ->count();

            $data[] = [
                'name' => $date->format('D'), // Mon, Tue
                'present' => $present,
                'absent' => $absent
            ];
        }
        return $data;
    }

    private function employeeDashboard($user)
    {
        $employee = $user->employee;
        if (!$employee) return response()->json(['message' => 'Profile not found'], 404);

        $today = Carbon::today();

        // My Attendance
        $presentDays = Attendance::where('employee_id', $employee->id)
            ->whereMonth('date', $today->month)
            ->where('status', 'present')
            ->count();

        // My Leaves
        $pendingLeaves = Leave::where('employee_id', $employee->id)
            ->where('status', 'pending')
            ->count();

        return response()->json([
            'role' => 'employee',
            'stats' => [
                'days_present_this_month' => $presentDays,
                'pending_leave_requests' => $pendingLeaves,
            ]
        ]);
    }
}

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
    public function index(Request $request)
    {
        $user = Auth::user();

        if ($user->roles->contains('name', 'Super Admin')) {
            return $this->superAdminDashboard($request);
        }

        if ($user->roles->contains('name', 'Admin')) {
            return $this->adminDashboard($request);
        }

        return $this->employeeDashboard($user);
    }

    private function superAdminDashboard(Request $request)
    {
        // Month picker: any calendar month, defaulting to the current one.
        $requestedMonth = (int) $request->query('month', date('m'));
        $requestedYear = (int) $request->query('year', date('Y'));
        if ($requestedMonth < 1 || $requestedMonth > 12) {
            $requestedMonth = (int) date('m');
        }
        $refMonth = Carbon::createFromDate($requestedYear, $requestedMonth, 1)->startOfMonth();
        $isCurrentMonth = $refMonth->isSameMonth(Carbon::today());
        $priorMonth = $refMonth->copy()->subMonth();
        $periodStart = $refMonth->copy()->startOfMonth();
        $periodEnd = $refMonth->copy()->endOfMonth();

        // Headcount & Users — always live/current org state, not month-scoped.
        $totalEmployees = Employee::where('status', 'active')->count();
        $totalUsers = \App\Models\User::count();

        $adminCount = \App\Models\User::role('Admin', 'web')->count();

        // Financial Metrics — for whichever period (this month / last month) is selected
        $periodPayroll = \App\Models\Payslip::where('month', $refMonth->format('m'))
            ->where('year', $refMonth->format('Y'))
            ->where('status', 'paid')
            ->sum('net_salary');

        $periodPending = \App\Models\Payslip::where('month', $refMonth->format('m'))
            ->where('year', $refMonth->format('Y'))
            ->whereIn('status', ['draft', 'pending', 'approved'])
            ->selectRaw('count(*) as cnt, coalesce(sum(net_salary), 0) as total')
            ->first();

        // Reference line: the month immediately before whichever period is selected, for context.
        $priorPayroll = \App\Models\Payslip::where('month', $priorMonth->format('m'))
            ->where('year', $priorMonth->format('Y'))
            ->where('status', 'paid')
            ->sum('net_salary');
        $priorPending = \App\Models\Payslip::where('month', $priorMonth->format('m'))
            ->where('year', $priorMonth->format('Y'))
            ->whereIn('status', ['draft', 'pending', 'approved'])
            ->selectRaw('count(*) as cnt, coalesce(sum(net_salary), 0) as total')
            ->first();

        // Pending Approvals — scoped to the selected period
        $periodPendingPayrollsCount = \App\Models\Payslip::where('month', $refMonth->format('m'))
            ->where('year', $refMonth->format('Y'))
            ->whereIn('status', ['draft', 'pending'])
            ->count();
        $periodPendingLeaves = Leave::where('status', 'pending')
            ->where(function ($q) use ($periodStart, $periodEnd) {
                $q->whereBetween('start_date', [$periodStart, $periodEnd])
                  ->orWhereBetween('end_date', [$periodStart, $periodEnd]);
            })
            ->count();
        $totalPendingApprovals = $periodPendingPayrollsCount + $periodPendingLeaves;

        // Workforce Capacity — today's live snapshot when the selected month is the
        // real current month, or the average daily attendance rate across that
        // month's weekdays for any other (past) month.
        if ($isCurrentMonth) {
            $today = Carbon::today();
            $presentToday = Attendance::where('date', $today)
                ->whereIn('status', ['present', 'late', 'early_out'])
                ->count();
            $workforceCapacity = $totalEmployees > 0 ? round(($presentToday / $totalEmployees) * 100) : 0;
        } else {
            $businessDays = 0;
            $cursor = $periodStart->copy();
            while ($cursor->lte($periodEnd)) {
                if (!$cursor->isWeekend()) $businessDays++;
                $cursor->addDay();
            }
            $presentDays = Attendance::whereBetween('date', [$periodStart, $periodEnd])
                ->whereIn('status', ['present', 'late', 'early_out'])
                ->count();
            $capacitySlots = $totalEmployees * $businessDays;
            $workforceCapacity = $capacitySlots > 0 ? round(($presentDays / $capacitySlots) * 100) : 0;
        }

        // Payroll Trend (Last 6 Months)
        $payrollTrend = [];
        for ($i = 5; $i >= 0; $i--) {
            $date = Carbon::today()->startOfMonth()->subMonths($i);
            $monthStr = $date->format('m');
            $yearStr = $date->format('Y');
            $total = \App\Models\Payslip::where('month', $monthStr)
                ->where('year', $yearStr)
                ->where('status', 'paid')
                ->sum('net_salary');

            $pending = \App\Models\Payslip::where('month', $monthStr)
                ->where('year', $yearStr)
                ->whereIn('status', ['draft', 'pending', 'approved'])
                ->selectRaw('count(*) as cnt, coalesce(sum(net_salary), 0) as total')
                ->first();

            $payrollTrend[] = [
                'name' => $date->format('M Y'),
                'month' => $monthStr,
                'year' => $yearStr,
                'cost' => (float) $total,
                'pending_count' => (int) $pending->cnt,
                'pending_amount' => (float) $pending->total,
            ];
        }

        // Department Distribution — NULLIF catches empty-string departments too,
        // so employees without a department show up as "Unassigned" instead of a blank label.
        // NOTE: aliased as "dept" (not "name") because the Employee model's appended `name`
        // accessor (first_name + last_name) overwrites a "name" column during JSON serialization.
        $departments = Employee::where('status', 'active')
            ->selectRaw("COALESCE(NULLIF(TRIM(department), ''), 'Unassigned') as dept, count(*) as value")
            ->groupBy('dept')
            ->orderByDesc('value')
            ->get();

        // Map to plain arrays (bypasses model accessors) + colors for the pie chart
        $colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1'];
        $departmentData = $departments->values()->map(fn ($item, $index) => [
            'name' => $item->dept,
            'value' => (int) $item->value,
            'color' => $colors[$index % count($colors)],
        ]);

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

        // Recent Audit Logs — scoped to the selected month unless it's the real current month
        $recentLogs = \App\Models\AuditLog::with('user:id,name,email')
            ->when(!$isCurrentMonth, fn ($q) => $q->whereBetween('created_at', [$periodStart, $periodEnd]))
            ->orderBy('created_at', 'desc')
            ->take(5)
            ->get();

        // Lifecycle & asset health
        $expiringContracts = \App\Models\Contract::where('status', 'active')
            ->whereNotNull('end_date')
            ->whereDate('end_date', '>=', Carbon::today())
            ->whereDate('end_date', '<=', Carbon::today()->addDays(30))
            ->count();
        $openOffboardings = \App\Models\Offboarding::whereIn('status', ['pending', 'in_progress'])->count();
        $assignedAssets = \App\Models\Asset::where('status', 'assigned')->count();

        // Custom Entities Summary — so entities like a Super-Admin-defined "Sales" collection
        // show up on the dashboard itself, not just when digging into the Custom Entities page.
        // Record count + (if the entity has one) a sum of its first numeric field, both scoped
        // to the selected month so it stays consistent with the rest of this period-aware dashboard.
        $customEntitiesSummary = \App\Models\CustomEntity::with('fields')
            ->orderBy('name')
            ->get()
            ->map(function (\App\Models\CustomEntity $entity) use ($periodStart, $periodEnd) {
                $records = $entity->records()->whereBetween('created_at', [$periodStart, $periodEnd])->get();
                $numericField = $entity->fields->firstWhere('type', 'number');

                return [
                    'name' => $entity->name,
                    'slug' => $entity->slug,
                    'record_count' => $records->count(),
                    'numeric_field_label' => $numericField?->label,
                    'numeric_field_total' => $numericField
                        ? $records->sum(fn ($r) => (float) ($r->data[$numericField->key] ?? 0))
                        : null,
                ];
            })
            ->values();

        return response()->json([
            'role' => 'superadmin',
            'month' => $refMonth->format('m'),
            'year' => $refMonth->format('Y'),
            'is_current_month' => $isCurrentMonth,
            'period_label' => $refMonth->format('F Y'),
            'stats' => [
                'total_employees' => $totalEmployees,
                'period_payroll' => (float) $periodPayroll,
                'period_payroll_pending_count' => (int) $periodPending->cnt,
                'period_payroll_pending_amount' => (float) $periodPending->total,
                'prior_period_label' => $priorMonth->format('F Y'),
                'prior_period_payroll' => (float) $priorPayroll,
                'prior_period_payroll_pending_count' => (int) $priorPending->cnt,
                'prior_period_payroll_pending_amount' => (float) $priorPending->total,
                'workforce_capacity' => $workforceCapacity,
                'pending_approvals' => $totalPendingApprovals,
                'pending_payrolls' => $periodPendingPayrollsCount,
                'pending_leaves' => $periodPendingLeaves,
                'total_users' => $totalUsers,
                'total_admins' => $adminCount,
                'expiring_contracts' => $expiringContracts,
                'open_offboardings' => $openOffboardings,
                'assigned_assets' => $assignedAssets,
            ],
            'department_distribution' => $departmentData,
            'payroll_trend' => $payrollTrend,
            'system_activity' => $activityChart,
            'recent_logs' => $recentLogs,
            'custom_entities_summary' => $customEntitiesSummary,
        ]);
    }

    private function adminDashboard(Request $request)
    {
        $today = Carbon::today();

        // Date range filter: today | week | month (default: week)
        $range = $request->query('range', 'week');
        if (!in_array($range, ['today', 'week', 'month'])) {
            $range = 'week';
        }

        [$rangeStart, $rangeEnd, $chartDays] = match ($range) {
            'today' => [Carbon::today(), Carbon::today(), 1],
            'month' => [Carbon::now()->startOfMonth(), Carbon::now()->endOfMonth(), 30],
            default => [Carbon::today()->subDays(6), Carbon::today(), 7],
        };

        // Headcount
        $totalEmployees = Employee::where('status', 'active')->count();

        // Attendance
        $presentToday = Attendance::where('date', $today)
            ->where('status', 'present')
            ->count();

        // Pending Actions
        $pendingLeaves = Leave::where('status', 'pending')->count();

        return response()->json([
            'role' => 'admin',
            'range' => $range,
            'stats' => [
                'total_employees' => $totalEmployees,
                'present_today' => $presentToday,
                'pending_leaves' => $pendingLeaves,
            ],
            'attendance_chart' => $this->getAttendanceChartData($chartDays),
            'punctuality_chart' => $this->getPunctualityData($rangeStart, $rangeEnd),
            'leave_trends' => $this->getLeaveTrendsData(),
            'payroll_summary' => $this->getPayrollSummary(),
        ]);
    }

    private function getPayrollSummary()
    {
        $month = date('m');
        $year = date('Y');

        $base = \App\Models\Payslip::where('month', $month)->where('year', $year);

        return [
            'month' => Carbon::now()->format('F Y'),
            'total_paid' => (float) (clone $base)->where('status', 'paid')->sum('net_salary'),
            'paid_count' => (clone $base)->where('status', 'paid')->count(),
            'pending_count' => (clone $base)->whereIn('status', ['draft', 'pending'])->count(),
        ];
    }

    private function getPunctualityData(?Carbon $start = null, ?Carbon $end = null)
    {
        $startOfMonth = $start ?? Carbon::now()->startOfMonth();
        $endOfMonth = $end ?? Carbon::now()->endOfMonth();

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

    private function getAttendanceChartData(int $days = 7)
    {
        $data = [];
        // Get last N days including today
        for ($i = $days - 1; $i >= 0; $i--) {
            $date = Carbon::today()->subDays($i);

            // Count Present
            $present = Attendance::whereDate('date', $date)->where('status', 'present')->count();

            $absent = Attendance::whereDate('date', $date)->where('status', 'absent')->count();

            $data[] = [
                // Short weekday for <= 7 days, day+month for longer ranges
                'name' => $days <= 7 ? $date->format('D') : $date->format('d M'),
                'present' => $present,
                'absent' => $absent
            ];
        }
        return $data;
    }

    private function employeeDashboard(\App\Models\User $user)
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

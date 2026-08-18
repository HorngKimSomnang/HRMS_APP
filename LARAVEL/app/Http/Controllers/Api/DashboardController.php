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

        $response = [
            'month' => $refMonth->format('m'),
            'year' => $refMonth->format('Y'),
            'is_current_month' => $isCurrentMonth,
            'period_label' => $refMonth->format('F Y'),
            'stats' => [],
        ];

        if ($user->hasPermissionTo('dashboard.view_total_employees')) {
            $response['stats']['total_employees'] = Employee::withTrashed()
                ->where('joining_date', '<=', $periodEnd)
                ->where(function ($q) use ($periodEnd) {
                    $q->whereNull('deleted_at')->orWhere('deleted_at', '>', $periodEnd);
                })
                ->count();
        }

        if ($user->hasPermissionTo('dashboard.view_payroll')) {
            $response['stats']['period_payroll'] = (float) \App\Models\Payslip::whereIn('month', [$refMonth->format('m'), $refMonth->format('n')])
                ->where('year', $refMonth->format('Y'))
                ->sum('net_salary');
            
            $periodPending = \App\Models\Payslip::whereIn('month', [$refMonth->format('m'), $refMonth->format('n')])
                ->where('year', $refMonth->format('Y'))
                ->whereIn('status', ['draft', 'pending', 'approved'])
                ->selectRaw('count(*) as cnt, coalesce(sum(net_salary), 0) as total')
                ->first();
            $response['stats']['period_payroll_pending_count'] = (int) $periodPending->cnt;
            $response['stats']['period_payroll_pending_amount'] = (float) $periodPending->total;

            $response['stats']['prior_period_label'] = $priorMonth->format('F Y');
            $response['stats']['prior_period_payroll'] = (float) \App\Models\Payslip::whereIn('month', [$priorMonth->format('m'), $priorMonth->format('n')])
                ->where('year', $priorMonth->format('Y'))
                ->sum('net_salary');

            $priorPending = \App\Models\Payslip::whereIn('month', [$priorMonth->format('m'), $priorMonth->format('n')])
                ->where('year', $priorMonth->format('Y'))
                ->whereIn('status', ['draft', 'pending', 'approved'])
                ->selectRaw('count(*) as cnt, coalesce(sum(net_salary), 0) as total')
                ->first();
            $response['stats']['prior_period_payroll_pending_count'] = (int) $priorPending->cnt;
            $response['stats']['prior_period_payroll_pending_amount'] = (float) $priorPending->total;
            
            // Payroll Trend
            $payrollTrend = [];
            for ($i = 5; $i >= 0; $i--) {
                $date = Carbon::today()->startOfMonth()->subMonths($i);
                $monthStr = $date->format('m');
                $monthStrShort = $date->format('n');
                $yearStr = $date->format('Y');
                $total = \App\Models\Payslip::whereIn('month', [$monthStr, $monthStrShort])
                    ->where('year', $yearStr)
                    ->sum('net_salary');
                $pending = \App\Models\Payslip::whereIn('month', [$monthStr, $monthStrShort])
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
            $response['payroll_trend'] = $payrollTrend;
        }

        if ($user->hasPermissionTo('dashboard.view_workforce_capacity')) {
            $totalEmployees = Employee::where('status', 'active')->count();
            if ($isCurrentMonth) {
                $today = Carbon::today();
                $presentToday = Attendance::where('date', $today)
                    ->whereIn('status', ['present', 'late', 'early_out'])
                    ->count();
                $response['stats']['workforce_capacity'] = $totalEmployees > 0 ? round(($presentToday / $totalEmployees) * 100) : 0;
            } else {
                $businessDays = 0;
                $cursor = $periodStart->copy();
                while ($cursor->lte($periodEnd)) {
                    if (!$cursor->isSunday()) $businessDays++;
                    $cursor->addDay();
                }
                $presentDays = Attendance::whereBetween('date', [$periodStart, $periodEnd])
                    ->whereIn('status', ['present', 'late', 'early_out'])
                    ->count();
                $capacitySlots = $totalEmployees * $businessDays;
                $response['stats']['workforce_capacity'] = $capacitySlots > 0 ? round(($presentDays / $capacitySlots) * 100) : 0;
            }
        }

        if ($user->hasPermissionTo('dashboard.view_pending_approvals')) {
            $periodPendingPayrollsCount = \App\Models\Payslip::where('month', $refMonth->format('m'))
                ->where('year', $refMonth->format('Y'))
                ->where('status', 'draft')
                ->whereNotNull('period_end')
                ->where('period_end', '<=', Carbon::now()->startOfDay())
                ->count();
            $periodPendingLeaves = Leave::where('status', 'pending')
                ->where(function ($q) use ($periodStart, $periodEnd) {
                    $q->whereBetween('start_date', [$periodStart, $periodEnd])
                      ->orWhereBetween('end_date', [$periodStart, $periodEnd]);
                })
                ->count();
            $response['stats']['pending_payrolls'] = $periodPendingPayrollsCount;
            $response['stats']['pending_leaves'] = $periodPendingLeaves;
            $response['stats']['pending_approvals'] = $periodPendingPayrollsCount + $periodPendingLeaves;
        }

        if ($user->hasPermissionTo('dashboard.view_expiring_contracts')) {
            $soon = Carbon::today()->addDays(30);
            $expiringList = \App\Models\Contract::with(['employee' => fn($q) => $q->withTrashed()->select('id', 'first_name', 'last_name')])
                ->where('status', 'active')
                ->whereNotNull('end_date')
                ->whereDate('end_date', '>=', Carbon::today())
                ->whereDate('end_date', '<=', $soon)
                ->orderBy('end_date')
                ->get();
            $response['stats']['expiring_contracts'] = $expiringList->count();
            $response['expiring_contracts_list'] = $expiringList;
        }

        if ($user->hasPermissionTo('dashboard.view_open_offboardings')) {
            $offboardingList = \App\Models\Offboarding::with(['employee' => fn($q) => $q->withTrashed()->select('id', 'first_name', 'last_name')])
                ->whereIn('status', ['pending', 'in_progress', 'deleted'])
                ->orderBy('last_working_day')
                ->get();
            $response['stats']['open_offboardings'] = $offboardingList->count();
            $response['open_offboardings_list'] = $offboardingList;
        }

        if ($user->hasPermissionTo('dashboard.view_assets_in_use')) {
            $response['stats']['assigned_assets'] = \App\Models\Asset::where('status', 'assigned')
                ->where('created_at', '<=', $periodEnd)
                ->count();
        }

        return response()->json($response);
    }
}

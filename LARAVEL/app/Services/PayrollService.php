<?php

namespace App\Services;

use App\Models\Employee;
use App\Models\Payslip;
use App\Models\Leave;
use App\Models\Setting;
use App\Support\HrCatalog;

class PayrollService
{
    /**
     * Generates all monthly draft payslips for the duration of a given contract.
     * If the contract has no end date (e.g. permanent), it generates just the first month.
     */
    public function generateDraftsForContract(\App\Models\Contract $contract): void
    {
        $start = \Carbon\Carbon::parse($contract->start_date);
        
        if (!$contract->end_date) {
            // Permanent contract or no end date: just generate the first month
            $this->generateForEmployee($contract->employee, str_pad($start->month, 2, '0', STR_PAD_LEFT), $start->year, true);
            return;
        }

        $end = \Carbon\Carbon::parse($contract->end_date);
        
        // Ensure we generate at least 1 payslip, and loop until we pass the end date's month/year
        $current = $start->copy()->startOfMonth();
        $endMonth = $end->copy()->startOfMonth();
        
        while ($current->lte($endMonth)) {
            $monthStr = str_pad($current->month, 2, '0', STR_PAD_LEFT);
            $yearStr = (string)$current->year;
            
            $this->generateForEmployee($contract->employee, $monthStr, $yearStr, true);
            
            $current->addMonth();
        }
    }

    /**
     * Generates a Payslip for the given employee, month, and year.
     * Optionally deletes an existing draft/unpaid payslip if requested.
     */
    public function generateForEmployee(Employee $employee, string $month, string $year, bool $deleteExistingDraft = false): ?Payslip
    {
        // 1. Check for existing payslip
        $existing = Payslip::where('employee_id', $employee->id)
            ->where('month', $month)
            ->where('year', $year)
            ->first();

        if ($existing) {
            if ($deleteExistingDraft && in_array($existing->status, ['draft', 'pending'])) {
                // Instead of force delete, just proceed below and it will UPDATE the existing one!
            } else {
                return $existing; // Keep existing and do not regenerate
            }
        }

        $contract = \App\Models\Contract::where('employee_id', $employee->id)
            ->whereIn('status', ['active', 'pending'])
            ->orderBy('start_date', 'desc')
            ->first();
        $basic = $contract ? $contract->salary : 0;

        // Calculate cycle dates
        if (!$contract) {
            $periodStart = \Carbon\Carbon::createFromDate((int)$year, (int)$month, 1)->startOfMonth();
            $periodEnd   = $periodStart->copy()->endOfMonth();
        } else {
            $cycleDay = \Carbon\Carbon::parse($contract->start_date)->day;
            $daysInMonth = \Carbon\Carbon::createFromDate((int)$year, (int)$month, 1)->daysInMonth;
            $actualDay = min($cycleDay, $daysInMonth);

            $periodStart = \Carbon\Carbon::createFromDate((int)$year, (int)$month, $actualDay)->startOfDay();
            $periodEnd = $periodStart->copy()->addMonth()->subDay()->endOfDay();

            if ($contract->end_date && $periodEnd->gt(\Carbon\Carbon::parse($contract->end_date)->endOfDay())) {
                $periodEnd = \Carbon\Carbon::parse($contract->end_date)->endOfDay();
            }
        }
        
        if (!$periodStart || !$periodEnd) {
            return null; // Cannot generate payslip for pending contracts without dates
        }
        
        // Load Settings
        $settings = Setting::where('group', 'payroll')->pluck('value', 'key')->toArray();
        $reduceOther = (float) ($settings['payroll_reduce_other'] ?? 0);

        // Fetch dynamic calculations
        $calc = $this->calculateDynamicData($employee, $periodStart, $periodEnd);

        $totalDeductions = $calc['unpaid_leave_amt'] + $calc['late_penalty_amt'] + $reduceOther;
        $net_salary = max(0, $basic + $calc['overtime_amt'] + $calc['attendance_bonus_amt'] + $calc['allowances_amt'] - $totalDeductions);

        if ($existing) {
            $existing->update([
                'period_start'           => $periodStart->toDateString(),
                'period_end'             => $periodEnd->toDateString(),
                'basic_salary'           => $basic,
                'overtime_amount'        => $calc['overtime_amt'],
                'attendance_bonus'       => $calc['attendance_bonus_amt'],
                'allowances'             => $calc['allowances_amt'],
                'unpaid_leave_deduction' => $calc['unpaid_leave_amt'],
                'deductions'             => $calc['late_penalty_amt'] + $reduceOther,
                'net_salary'             => $net_salary,
            ]);
            return $existing;
        }

        $contractType = $contract ? str_replace('_', ' ', $contract->type) : 'unknown';
        $notes = "Generated for {$contractType} contract. Attendance: {$calc['present_days']} present, {$calc['absent_unpaid_days']} absent, {$calc['late_days']} late.";

        $payslip = Payslip::create([
            'employee_id'            => $employee->id,
            'month'                  => $month,
            'year'                   => $year,
            'period_start'           => $periodStart->toDateString(),
            'period_end'             => $periodEnd->toDateString(),
            'basic_salary'           => $basic,
            'overtime_amount'        => $calc['overtime_amt'],
            'commission'             => 0, // not dynamic yet
            'attendance_bonus'       => $calc['attendance_bonus_amt'],
            'allowances'             => $calc['allowances_amt'],
            'advance_deduction'      => 0,
            'unpaid_leave_deduction' => $calc['unpaid_leave_amt'],
            'deductions'             => $calc['late_penalty_amt'] + $reduceOther,
            'net_salary'             => $net_salary,
            'status'                 => 'draft',
            'notes'                  => $notes,
            'requires_signature'     => false,
        ]);

        \App\Models\AuditLog::create([
            'user_id' => null,
            'role' => 'System',
            'action' => 'PAYSLIP_GENERATED',
            'ip_address' => request()->ip() ?? '127.0.0.1',
            'model_type' => Payslip::class,
            'model_id' => $payslip->id,
            'context' => [
                'employee' => $employee->user->name,
                'net_salary' => $net_salary,
                'status' => 'automated'
            ]
        ]);

        return $payslip;
    }

    public function calculateDynamicData(Employee $employee, \Carbon\Carbon $periodStart, \Carbon\Carbon $periodEnd): array
    {
        $settings = Setting::whereIn('key', [
            'payroll_default_overtime',
            'payroll_attendance_bonus',
            'payroll_daily_attendance_allowance',
            'payroll_allowances',
            'payroll_reduce_leave',
            'payroll_reduce_late',
        ])->pluck('value', 'key');

        $rateOt         = (float) ($settings['payroll_default_overtime'] ?? 0);
        $rateBonus      = (float) ($settings['payroll_attendance_bonus'] ?? 0);
        $rateDailyAllow = (float) ($settings['payroll_daily_attendance_allowance'] ?? 0);
        $rateAllow      = (float) ($settings['payroll_allowances'] ?? 0);
        $rateLeave      = (float) ($settings['payroll_reduce_leave'] ?? 0);
        $rateLate       = (float) ($settings['payroll_reduce_late'] ?? 0);

        $attendance = \App\Models\Attendance::where('employee_id', $employee->id)
            ->whereBetween('date', [$periodStart->toDateString(), $periodEnd->toDateString()])
            ->get();

        $presentDays  = $attendance->count();
        $lateDays     = $attendance->where('is_late', true)->count();
        $onTimeDays   = $presentDays - $lateDays;

        $shift = $employee->shift ?? (HrCatalog::getShifts()[0] ?? null);
        $shiftWorkDays = is_array($shift)
            ? ($shift['work_days'] ?? HrCatalog::defaultWorkDays())
            : ($shift->work_days ?? HrCatalog::defaultWorkDays());

        $attendedDates = $attendance->pluck('date')->map(fn($d) => is_string($d) ? $d : $d->toDateString())->toArray();

        $paidLeaveTypes = ['Annual Leave', 'Sick Leave'];
        $approvedLeaves = Leave::where('employee_id', $employee->id)
            ->where('status', 'approved')
            ->where(function ($q) use ($periodStart, $periodEnd) {
                $q->whereBetween('start_date', [$periodStart->toDateString(), $periodEnd->toDateString()])
                  ->orWhereBetween('end_date',   [$periodStart->toDateString(), $periodEnd->toDateString()])
                  ->orWhere(function ($q2) use ($periodStart, $periodEnd) {
                      $q2->where('start_date', '<=', $periodStart->toDateString())
                         ->where('end_date',   '>=', $periodEnd->toDateString());
                  });
            })
            ->get();

        $leaveDates = [];
        foreach ($approvedLeaves as $leave) {
            $cur = $leave->start_date->copy();
            $end = $leave->end_date->copy();
            while ($cur->lte($end)) {
                if ($cur->gte($periodStart) && $cur->lte($periodEnd)) {
                    $leaveDates[$cur->toDateString()] = $leave->leave_type;
                }
                $cur->addDay();
            }
        }

        $absentUnpaidDays = 0;
        $cur = $periodStart->copy();
        $cutoff = min($periodEnd->copy(), now()->endOfDay());
        while ($cur->lte($cutoff)) {
            $dayName = $cur->format('l');
            if (in_array($dayName, $shiftWorkDays)) {
                $dateStr = $cur->toDateString();
                $isPresent = in_array($dateStr, $attendedDates);
                $leaveType = $leaveDates[$dateStr] ?? null;
                $isPaidLeave = $leaveType && in_array($leaveType, $paidLeaveTypes);

                if (!$isPresent && !$isPaidLeave) {
                    $absentUnpaidDays++;
                }
            }
            $cur->addDay();
        }

        $otHours = \App\Models\Overtime::where('employee_id', $employee->id)
            ->where('status', 'approved')
            ->whereBetween('date', [$periodStart->toDateString(), $periodEnd->toDateString()])
            ->sum('hours');

        return [
            'present_days'         => $presentDays,
            'late_days'            => $lateDays,
            'on_time_days'         => $onTimeDays,
            'absent_unpaid_days'   => $absentUnpaidDays,
            'ot_hours'             => (float)$otHours,
            'overtime_amt'         => round($rateOt * (float)$otHours, 2),
            'attendance_bonus_amt' => round($rateBonus * $onTimeDays, 2),
            'allowances_amt'       => round(($rateAllow + $rateDailyAllow) * $presentDays, 2),
            'unpaid_leave_amt'     => round($rateLeave * $absentUnpaidDays, 2),
            'late_penalty_amt'     => round($rateLate * $lateDays, 2),
        ];
    }
}

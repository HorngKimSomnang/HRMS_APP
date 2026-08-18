<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Employee;
use App\Models\Payslip;
use App\Services\PayrollService;
use Carbon\Carbon;

class GenerateBatchPayroll extends Command
{
    protected $signature = 'payroll:generate-batch';
    protected $description = 'Generates batch payroll for employees whose cycle has ended';

    public function handle(PayrollService $payrollService)
    {
        $today = Carbon::today();
        $employees = Employee::where('status', 'active')->get();
        $generatedCount = 0;

        foreach ($employees as $employee) {
            $latestPayslip = Payslip::where('employee_id', $employee->id)
                ->whereNotNull('period_end')
                ->orderBy('period_end', 'desc')
                ->first();
            
            if ($latestPayslip) {
                $periodEnd = Carbon::parse($latestPayslip->period_end)->startOfDay();
                if ($today->gt($periodEnd)) {
                    $nextCycleStart = $periodEnd->copy()->addDay();
                    $month = str_pad($nextCycleStart->month, 2, '0', STR_PAD_LEFT);
                    $year = $nextCycleStart->year;
                    
                    $payslip = $payrollService->generateForEmployee($employee, $month, $year, false);
                    if ($payslip) $generatedCount++;
                }
            } else {
                // First payslip
                $month = str_pad($today->month, 2, '0', STR_PAD_LEFT);
                $year = $today->year;
                $payslip = $payrollService->generateForEmployee($employee, $month, $year, false);
                if ($payslip) $generatedCount++;
            }
        }
        
        $this->info("Batch payroll generated $generatedCount payslips.");
    }
}

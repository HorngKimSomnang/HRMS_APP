<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Employee;
use App\Services\PayrollService;
use App\Models\Contract;

class GenerateMonthlyPayroll extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'payroll:generate-monthly';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Generate draft payroll for all employees with active contracts for the current month.';

    /**
     * Execute the console command.
     */
    public function handle(PayrollService $payrollService)
    {
        $month = date('m');
        $year = date('Y');
        
        $this->info("Starting batch payroll generation for $month/$year...");

        // Get all employees with an active contract
        $employees = Employee::whereHas('contracts', function($query) {
            $query->where('status', 'active');
        })->get();

        $generated = 0;
        $skipped = 0;

        foreach ($employees as $employee) {
            // Check if one already exists
            $exists = \App\Models\Payslip::where('employee_id', $employee->id)
                ->where('month', $month)
                ->where('year', $year)
                ->exists();

            if ($exists) {
                $skipped++;
                continue;
            }

            try {
                // Do not delete existing draft since we just skipped if it exists anyway
                $payrollService->generateForEmployee($employee, $month, $year, false);
                $generated++;
            } catch (\Exception $e) {
                $this->error("Failed for employee {$employee->id}: " . $e->getMessage());
            }
        }

        $this->info("Batch payroll generation completed. Generated: $generated, Skipped: $skipped.");
    }
}

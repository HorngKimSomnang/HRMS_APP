<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Employee;
use App\Models\Payslip;
use Carbon\Carbon;

class PayrollTrendSeeder extends Seeder
{
    public function run(): void
    {
        $employees = Employee::orderBy('id')->get()->take(6);

        if ($employees->isEmpty()) {
            $this->command->warn('No employees found.');
            return;
        }

        // Per-employee salary profile (matches department seeded in DashboardDemoSeeder)
        $salaries = [
            ['basic' => 1200, 'allowance' => 150, 'deduction' => 80],  // HR Manager
            ['basic' => 1400, 'allowance' => 200, 'deduction' => 95],  // Software Developer
            ['basic' => 1000, 'allowance' => 100, 'deduction' => 70],  // Accountant
            ['basic' =>  900, 'allowance' =>  80, 'deduction' => 60],  // Operations Officer
            ['basic' => 1100, 'allowance' => 120, 'deduction' => 75],  // UI/UX Designer
            ['basic' => 1050, 'allowance' => 110, 'deduction' => 72],  // Finance Analyst
        ];

        $today = Carbon::today();

        // Month-level modifiers — keyed by offset (5 = oldest/Jan, 0 = current/Jun)
        // overtime_pool: split across employees; advance: extra deduction per employee
        $monthModifiers = [
            5 => ['overtime_pool' => 0,    'bonus' => 0,    'advance' => 200], // Jan: slow + advance repayments
            4 => ['overtime_pool' => 1800, 'bonus' => 0,    'advance' => 0],   // Feb: heavy overtime crunch
            3 => ['overtime_pool' => 0,    'bonus' => 0,    'advance' => 150], // Mar: quiet + some deductions
            2 => ['overtime_pool' => 1200, 'bonus' => 1500, 'advance' => 0],   // Apr: overtime + annual bonus
            1 => ['overtime_pool' => 300,  'bonus' => 0,    'advance' => 300], // May: small OT, advance repay
            0 => ['overtime_pool' => 800,  'bonus' => 0,    'advance' => 0],   // Jun: moderate OT
        ];

        // Seed Jan → current month (up to 6 months back from now)
        for ($i = 5; $i >= 0; $i--) {
            $period   = $today->copy()->startOfMonth()->subMonths($i);
            $month    = $period->format('m');
            $year     = $period->format('Y');
            $modifier = $monthModifiers[$i];

            // Distribute overtime pool and bonus evenly-ish across employees
            $empCount     = count($employees);
            $otPerEmp     = (int) ($modifier['overtime_pool'] / $empCount);
            $bonusPerEmp  = (int) ($modifier['bonus'] / $empCount);
            $advancePerEmp= $modifier['advance'];

            foreach ($employees as $idx => $employee) {
                $profile    = $salaries[$idx] ?? ['basic' => 900, 'allowance' => 80, 'deduction' => 60];
                $basic      = $profile['basic'];
                $allowance  = $profile['allowance'];
                $deduction  = $profile['deduction'];

                // Per-employee noise ±40 on the variable parts
                $overtime   = max(0, $otPerEmp    + rand(-40, 40));
                $bonus      = max(0, $bonusPerEmp + rand(-40, 40));
                $advance    = max(0, $advancePerEmp + rand(-20, 20));

                $net        = $basic + $allowance + $overtime + $bonus - $deduction - $advance;

                $data = [
                    'basic_salary'      => $basic,
                    'allowances'        => $allowance,
                    'overtime_amount'   => $overtime,
                    'commission'        => 0,
                    'attendance_bonus'  => $bonus,
                    'advance_deduction' => $advance,
                    'deductions'        => $deduction,
                    'net_salary'        => max($net, 0),
                    'status'            => 'paid',
                ];

                Payslip::updateOrCreate(
                    ['employee_id' => $employee->id, 'month' => $month, 'year' => $year],
                    $data
                );
            }

            $total = Payslip::where('month', $month)->where('year', $year)
                ->where('status', 'paid')->sum('net_salary');
            $this->command->info("{$period->format('M Y')}: \${$total}");
        }

        $this->command->newLine();
        $this->command->info('Payroll trend seeded: 6 months × 6 employees.');
    }
}

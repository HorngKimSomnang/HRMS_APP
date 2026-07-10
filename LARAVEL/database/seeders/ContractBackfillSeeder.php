<?php

namespace Database\Seeders;

use App\Models\Contract;
use App\Models\Employee;
use Illuminate\Database\Seeder;

/**
 * One-time backfill: gives every active employee without a contract
 * a permanent, open-ended contract starting from their joining date.
 *
 * Run with: php artisan db:seed --class=ContractBackfillSeeder
 * Safe to re-run — employees who already have a contract are skipped.
 */
class ContractBackfillSeeder extends Seeder
{
    public function run(): void
    {
        $employees = Employee::where('status', 'active')
            ->whereDoesntHave('contracts')
            ->get();

        $created = 0;
        foreach ($employees as $employee) {
            Contract::create([
                'employee_id' => $employee->id,
                'type' => 'permanent',
                'start_date' => $employee->joining_date ?? now()->toDateString(),
                'end_date' => null,
                'status' => 'active',
                'notes' => 'Backfilled from joining date.',
            ]);
            $created++;
        }

        $this->command?->info("Created {$created} contracts for employees without one.");
    }
}

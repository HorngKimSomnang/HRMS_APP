<?php

namespace App\Console\Commands;

use App\Models\Contract;
use App\Models\Employee;
use App\Models\User;
use App\Models\ContractStatusLog;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ProcessExpiredContracts extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'contracts:process-expirations {--date= : Optional date in YYYY-MM-DD}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Process expired contracts, mark them as expired, and auto-generate pending renewals based on contract type.';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $date = $this->option('date')
            ? Carbon::createFromFormat('Y-m-d', (string)$this->option('date'), 'Asia/Phnom_Penh')->startOfDay()
            : Carbon::today('Asia/Phnom_Penh');

        $this->info("Processing contracts that expired before or on: " . $date->toDateString());

        // Find active contracts where the end_date has passed (strictly less than today)
        $expiredContracts = Contract::with('employee.user')
            ->where('status', 'active')
            ->whereNotNull('end_date')
            ->whereDate('end_date', '<', $date)
            ->get();

        if ($expiredContracts->isEmpty()) {
            $this->info("No expired contracts found.");
            return self::SUCCESS;
        }

        $processedCount = 0;

        foreach ($expiredContracts as $contract) {
            DB::transaction(function () use ($contract, $date, &$processedCount) {
                // 1. Mark current contract as expired
                $contract->update(['status' => 'expired']);
                ContractStatusLog::create([
                    'contract_id' => $contract->id,
                    'employee_id' => $contract->employee_id,
                    'status'      => 'expired',
                    'changed_at'  => now(),
                ]);

                // 2. Determine new contract type based on rules
                $newType = $contract->type;
                if ($contract->type === 'probation') {
                    $newType = 'fixed_term';
                }

                // 3. Create the new pending contract with null dates
                $newContract = Contract::create([
                    'employee_id' => $contract->employee_id,
                    'type'        => $newType,
                    'salary'      => $contract->salary,
                    'position'    => $contract->position,
                    'start_date'  => null,
                    'end_date'    => null,
                    'status'      => 'pending',
                    'notes'       => 'Auto-generated renewal contract. Super Admin must activate to resume payroll.',
                ]);
                ContractStatusLog::create([
                    'contract_id' => $newContract->id,
                    'employee_id' => $contract->employee_id,
                    'status'      => 'pending',
                    'changed_at'  => now(),
                ]);

                // 4. Send notification to the employee
                if ($contract->employee && $contract->employee->user) {
                    $contract->employee->user->notify(new \App\Notifications\ContractAutoRenewed($newContract));
                }

                $processedCount++;
            });
        }

        $this->info("Successfully processed {$processedCount} expired contract(s) and generated renewals.");

        return self::SUCCESS;
    }
}

<?php

namespace App\Observers;

use App\Models\Contract;

class ContractObserver
{
    /**
     * Handle the Contract "created" event.
     */
    public function created(Contract $contract): void
    {
        $this->handleActiveStatus($contract);
        $this->bumpLiveData();
    }

    public function updated(Contract $contract): void
    {
        $statusChanged = $contract->wasChanged('status');
        $salaryChanged = $contract->wasChanged('salary');

        if ($statusChanged) {
            $this->handleActiveStatus($contract);
        } elseif ($salaryChanged && $contract->status === 'active') {
            try {
                $payrollService = app(\App\Services\PayrollService::class);
                $payrollService->generateDraftsForContract($contract);
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::error('Failed to auto-generate payslips on salary update: ' . $e->getMessage());
            }
        }
        $this->bumpLiveData();
    }

    protected function handleActiveStatus(Contract $contract): void
    {
        if ($contract->status === 'active') {
            Contract::where('employee_id', $contract->employee_id)
                ->where('id', '!=', $contract->id)
                ->where('status', 'active')
                ->update(['status' => 'expired']);

            $employee = $contract->employee;
            if ($employee && $employee->status !== 'active') {
                $employee->update(['status' => 'active']);
            }

            // Auto-generate draft payslips for the new active contract
            try {
                $payrollService = app(\App\Services\PayrollService::class);
                $payrollService->generateDraftsForContract($contract);
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::error('Failed to auto-generate payslips: ' . $e->getMessage());
            }
        }
    }

    /**
     * Handle the Contract "deleted" event.
     */
    public function deleted(Contract $contract): void
    {
        $this->bumpLiveData();
    }

    /**
     * Handle the Contract "restored" event.
     */
    public function restored(Contract $contract): void
    {
        $this->bumpLiveData();
    }

    /**
     * Handle the Contract "force deleted" event.
     */
    public function forceDeleted(Contract $contract): void
    {
        $this->bumpLiveData();
    }

    protected function bumpLiveData(): void
    {
        try {
            \App\Services\LiveDataVersion::bump('employees');
            \App\Services\LiveDataVersion::bump('payslips');
            \App\Services\LiveDataVersion::bump('lifecycle');
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::warning('Failed to bump live data in ContractObserver: ' . $e->getMessage());
        }
    }
}

<?php

namespace App\Observers;

use App\Models\Employee;
use App\Models\Offboarding;
use Carbon\Carbon;

class EmployeeObserver
{
    /**
     * Handle the Employee "deleted" event.
     */
    public function deleted(Employee $employee): void
    {
        // Ignore force deletes; we only care about soft deletes
        if ($employee->isForceDeleting()) {
            return;
        }

        // Check if an offboarding already exists to avoid duplicates
        $exists = Offboarding::where('employee_id', $employee->id)->exists();
        if (!$exists) {
            Offboarding::create([
                'employee_id' => $employee->id,
                'resignation_date' => Carbon::now()->toDateString(),
                'last_working_day' => Carbon::now()->toDateString(),
                'status' => 'pending',
                'checklist' => Offboarding::DEFAULT_CHECKLIST,
                'reason' => 'Auto-generated upon employee deletion',
                'created_by' => auth()->id() ?? 1,
            ]);
        }
    }
}

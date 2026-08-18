<?php

namespace App\Console\Commands;

use App\Models\Contract;
use App\Models\Employee;
use App\Models\Attendance;
use App\Models\Leave;
use App\Models\Holiday;
use Carbon\Carbon;
use Illuminate\Console\Command;

class ProcessDailyAbsences extends Command
{
    protected $signature = 'attendance:process-absences';
    protected $description = 'At 5 PM daily: checks for employees who have not clocked in and are not on leave or holiday, and increments their Absent Leave.';

    public function handle()
    {
        $today = Carbon::today('Asia/Phnom_Penh');

        // 1. Skip weekends
        if ($today->isWeekend()) {
            $this->info("Today is a weekend. Skipping absent check.");
            return self::SUCCESS;
        }

        // 2. Skip holidays
        $isHoliday = Holiday::whereDate('start_date', '<=', $today)
            ->whereDate('end_date', '>=', $today)
            ->exists();
            
        if ($isHoliday) {
            $this->info("Today is a Public Holiday. Skipping absent check.");
            return self::SUCCESS;
        }

        // 3. Find employees with active contracts
        $activeEmployees = Employee::whereHas('contracts', function($q) {
            $q->where('status', 'active');
        })->get();

        $processedCount = 0;

        foreach ($activeEmployees as $employee) {
            // Check if clocked in today
            $hasAttendance = Attendance::where('employee_id', $employee->id)
                ->whereDate('date', $today)
                ->exists();

            if ($hasAttendance) {
                continue; // They showed up
            }

            // Check if they have an approved leave for today
            $hasLeave = Leave::where('employee_id', $employee->id)
                ->whereIn('status', ['approved'])
                ->whereDate('start_date', '<=', $today)
                ->whereDate('end_date', '>=', $today)
                ->exists();

            if ($hasLeave) {
                continue; // They are on approved leave
            }

            // Otherwise, they are absent.


            // Create an Attendance record as "absent" to prevent dual tracking issues
            Attendance::firstOrCreate(
                ['employee_id' => $employee->id, 'date' => $today->toDateString()],
                [
                    'status' => 'absent',
                    'address' => 'System generated absent',
                ]
            );

            $processedCount++;
        }

        \App\Services\LiveDataVersion::bump('attendance');
        \App\Services\LiveDataVersion::bump('leaves');

        $this->info("Successfully processed {$processedCount} absence(s).");
        return self::SUCCESS;
    }
}

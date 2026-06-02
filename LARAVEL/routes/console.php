<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

\Illuminate\Support\Facades\Schedule::call(function () {
    $now = \Carbon\Carbon::now();
    $today = \Carbon\Carbon::today();

    $activeAttendances = \App\Models\Attendance::with(['employee.shift', 'employee.user'])
        ->where('date', $today)
        ->whereNull('clock_out')
        ->get();

    foreach ($activeAttendances as $attendance) {
        if ($attendance->employee && $attendance->employee->shift) {
            $shift = $attendance->employee->shift;
            $endTime = is_array($shift) ? ($shift['end_time'] ?? null) : $shift->end_time;
            
            if ($endTime) {
                $shiftEnd = \Carbon\Carbon::today()->setTimeFromTimeString($endTime);
                
                // If current time is past shift end + 15 mins
                if ($now->greaterThan($shiftEnd->copy()->addMinutes(15))) {
                    $attendance->update([
                        'clock_out' => $shiftEnd, // Clock out exactly at shift end
                        'early_out_reason' => 'Auto-clocked out by system due to inactivity.',
                    ]);
                    
                    if ($attendance->employee->user) {
                        $attendance->employee->user->notify(new \App\Notifications\AutoClockedOut($attendance, $shiftEnd));
                    }
                }
            }
        }
    }
})->everyFiveMinutes();

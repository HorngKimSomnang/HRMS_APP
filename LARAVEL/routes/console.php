<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Send a clock-out reminder 15 minutes before shift ends.
// We do NOT auto clock-out — that would hide early departures.
// Employees must clock out themselves; missed ones become 'warning' at midnight for HR review.
\Illuminate\Support\Facades\Schedule::call(function () {
    $now   = \Carbon\Carbon::now();
    $today = \Carbon\Carbon::today();

    $defaultEndTime = \App\Models\Setting::where('key', 'default_work_end_time')->value('value') ?? '16:30';
    $defaultEnd     = \Carbon\Carbon::today()->setTimeFromTimeString($defaultEndTime);

    $activeAttendances = \App\Models\Attendance::with(['employee.shift', 'employee.user'])
        ->where('date', $today)
        ->whereNull('clock_out')
        ->whereNotIn('status', ['absent', 'warning'])
        ->get();

    foreach ($activeAttendances as $attendance) {
        if (!$attendance->employee || !$attendance->employee->user) continue;

        $shift   = $attendance->employee->shift;
        $endTime = $shift
            ? (is_array($shift) ? ($shift['end_time'] ?? null) : $shift->end_time)
            : null;

        $shiftEnd = $endTime
            ? \Carbon\Carbon::today()->setTimeFromTimeString($endTime)
            : $defaultEnd;

        $reminderAt = $shiftEnd->copy()->subMinutes(15);

        // Send reminder once, in the 5-minute window before shift end - 15 min
        if ($now->between($reminderAt, $reminderAt->copy()->addMinutes(5))) {
            $attendance->employee->user->notify(
                new \App\Notifications\ClockOutReminder($attendance, $shiftEnd)
            );
        }
    }
})->everyFiveMinutes();

// At midnight, mark any still-unchecked-out attendance from the day as Warning
\Illuminate\Support\Facades\Schedule::command('attendance:mark-missing-checkouts')
    ->dailyAt('00:00')
    ->timezone('Asia/Phnom_Penh')
    ->withoutOverlapping()
    ->runInBackground();

// Each morning, warn employees and admins about contracts/probations ending
// in 14, 7 or 1 day(s).
// Exact-day triggers keep it to three notifications per contract, not daily spam.
\Illuminate\Support\Facades\Schedule::command('contracts:send-expiry-reminders')
    ->dailyAt('08:00')
    ->timezone('Asia/Phnom_Penh')
    ->withoutOverlapping();

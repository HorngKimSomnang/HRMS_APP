<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$emp = App\Models\Employee::find(7);
$shift = $emp->shift ?? json_decode(json_encode([
    'start_time' => '08:00:00',
    'grace_period_minutes' => 15
]));

$now = Carbon\Carbon::parse('2026-08-10T05:48:59.000000Z')->timezone('Asia/Phnom_Penh'); // 12:48:59 Local

$shiftStartStr = is_array($shift) ? $shift['start_time'] : $shift->start_time;
$gracePeriod = is_array($shift) ? $shift['grace_period_minutes'] : $shift->grace_period_minutes;

$shiftStart = Carbon\Carbon::createFromFormat('H:i:s', $shiftStartStr, $now->timezone)->setDateFrom($now);
$graceTime = $shiftStart->copy()->addMinutes($gracePeriod);

$isOnTime = $now->lessThanOrEqualTo($graceTime);

echo "Now: " . $now->toDateTimeString() . " (" . $now->timezoneName . ")\n";
echo "Shift Start: " . $shiftStart->toDateTimeString() . " (" . $shiftStart->timezoneName . ")\n";
echo "Grace Time: " . $graceTime->toDateTimeString() . " (" . $graceTime->timezoneName . ")\n";
echo "Is On Time? " . ($isOnTime ? 'YES' : 'NO') . "\n";

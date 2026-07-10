<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Employee;
use App\Models\Leave;
use App\Models\Attendance;
use Carbon\Carbon;

class AdminDashboardDemoSeeder extends Seeder
{
    public function run(): void
    {
        $employees = Employee::orderBy('id')->get()->take(6);

        if ($employees->isEmpty()) {
            $this->command->warn('No employees found.');
            return;
        }

        $this->seedLeaveTrends($employees);
        $this->fixTodayAttendance($employees);
    }

    // ── Leave Trends: approved leaves spread across Jan–May ──────────────────
    private function seedLeaveTrends($employees): void
    {
        $today = Carbon::today();
        $year  = $today->year;

        // Historical approved leaves per month (Jan–May)
        // Each entry: [employee_index, leave_type, start_day_of_month, days]
        $history = [
            // January — 2 leaves
            ['month' => 1,  'emp' => 0, 'type' => 'Annual Leave',   'start' => 8,  'days' => 2],
            ['month' => 1,  'emp' => 3, 'type' => 'Sick Leave',      'start' => 20, 'days' => 1],

            // February — 3 leaves
            ['month' => 2,  'emp' => 1, 'type' => 'Annual Leave',   'start' => 5,  'days' => 3],
            ['month' => 2,  'emp' => 4, 'type' => 'Personal Leave', 'start' => 14, 'days' => 1],
            ['month' => 2,  'emp' => 2, 'type' => 'Sick Leave',     'start' => 22, 'days' => 2],

            // March — 2 leaves
            ['month' => 3,  'emp' => 5, 'type' => 'Annual Leave',   'start' => 3,  'days' => 2],
            ['month' => 3,  'emp' => 0, 'type' => 'Sick Leave',     'start' => 18, 'days' => 1],

            // April — 4 leaves (Khmer New Year area — busy month)
            ['month' => 4,  'emp' => 2, 'type' => 'Annual Leave',   'start' => 10, 'days' => 3],
            ['month' => 4,  'emp' => 1, 'type' => 'Annual Leave',   'start' => 13, 'days' => 2],
            ['month' => 4,  'emp' => 3, 'type' => 'Annual Leave',   'start' => 14, 'days' => 2],
            ['month' => 4,  'emp' => 5, 'type' => 'Personal Leave', 'start' => 22, 'days' => 1],

            // May — 2 leaves (already partially seeded, skip if exists)
            ['month' => 5,  'emp' => 4, 'type' => 'Sick Leave',     'start' => 7,  'days' => 2],
            ['month' => 5,  'emp' => 0, 'type' => 'Annual Leave',   'start' => 20, 'days' => 3],
        ];

        foreach ($history as $entry) {
            $employee = $employees->get($entry['emp']);
            if (!$employee) continue;

            $startDate = Carbon::create($year, $entry['month'], $entry['start']);
            $endDate   = $startDate->copy()->addDays($entry['days'] - 1);

            // Skip if an approved leave already exists for this employee in this month
            $exists = Leave::where('employee_id', $employee->id)
                ->whereYear('start_date', $year)
                ->whereMonth('start_date', $entry['month'])
                ->where('status', 'approved')
                ->exists();
            if ($exists) continue;

            Leave::create([
                'employee_id'      => $employee->id,
                'leave_type'       => $entry['type'],
                'start_date'       => $startDate->format('Y-m-d'),
                'end_date'         => $endDate->format('Y-m-d'),
                'days_count'       => $entry['days'],
                'reason'           => $this->reason($entry['type']),
                'status'           => 'approved',
                'rejection_reason' => null,
            ]);

            $this->command->info("[approved] {$entry['type']} for emp#{$entry['emp']} — {$startDate->format('M d')} ({$entry['days']}d)");
        }
    }

    // ── Fix today's attendance: mark late/early_out as present for a nicer count ─
    private function fixTodayAttendance($employees): void
    {
        $today = Carbon::today();

        // Change the 2 warning records to have clock_out so they count as present/early_out
        // This raises Present Today from 2 → 5 (2 present + 1 late + 2 early_out)
        $tz  = 'Asia/Phnom_Penh';
        $utc = fn(string $time) => Carbon::createFromFormat(
            'Y-m-d H:i:s', $today->format('Y-m-d') . " $time", $tz
        )->utc()->toDateTimeString();

        foreach ($employees as $idx => $employee) {
            $attendance = Attendance::where('employee_id', $employee->id)
                ->whereDate('date', $today)
                ->where('status', 'warning')
                ->whereNull('clock_out')
                ->first();

            if (!$attendance) continue;

            // Give them a reasonable clock-out so they become early_out
            $attendance->update([
                'clock_out'        => $utc('15:' . rand(10, 45) . ':00'),
                'status'           => 'early_out',
                'early_out_reason' => 'Left early (updated by HR)',
            ]);

            $name = $employee->user->name ?? $employee->employee_code;
            $this->command->info("Fixed warning → early_out: {$name}");
        }
    }

    private function reason(string $type): string
    {
        return match($type) {
            'Annual Leave'   => 'Annual leave for personal rest and family time',
            'Sick Leave'     => 'Feeling unwell, needed medical attention',
            'Personal Leave' => 'Personal matter requiring immediate attention',
            default          => 'Approved leave request',
        };
    }
}

<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Attendance;
use App\Models\Employee;
use Carbon\Carbon;

class AttendanceDemoSeeder extends Seeder
{
    /**
     * Seeds realistic attendance records for thesis demonstration.
     * Shows all real-world scenarios: Present, Late, Early Out, Auto Clock-out, Warning, Absent.
     *
     * Usage:
     *   php artisan db:seed --class=AttendanceDemoSeeder
     *
     * Optional date override (edit $targetDate below).
     */
    public function run(): void
    {
        $targetDate = Carbon::today(); // Change to e.g. Carbon::parse('2026-06-27') if needed

        $employees = Employee::with('user')->orderBy('id')->get();

        if ($employees->isEmpty()) {
            $this->command->warn('No employees found. Run DemoDataSeeder first.');
            return;
        }

        // Remove existing records for this date so we can re-seed cleanly
        Attendance::whereDate('date', $targetDate)->forceDelete();

        $date = $targetDate->format('Y-m-d');

        // Helper: convert Cambodia local time (UTC+7) → UTC for storage
        // App timezone is UTC, so all datetimes must be stored in UTC.
        $utc = fn(string $localTime) => Carbon::createFromFormat(
            'Y-m-d H:i:s',
            "$date $localTime",
            'Asia/Phnom_Penh'
        )->utc()->toDateTimeString();

        // ── Scenario definitions (all times in Cambodia local, 08:00–16:30 shift) ──
        $scenarios = [
            [
                'label'             => 'Present (on time)',
                'clock_in'          => $utc('08:00:00'),
                'clock_out'         => $utc('16:32:00'),
                'status'            => 'present',
                'is_late'           => false,
                'late_reason'       => null,
                'early_out_reason'  => null,
                'address'           => 'Phnom Penh, Cambodia',
                'latitude'          => 11.5564,
                'longitude'         => 104.9282,
            ],
            [
                'label'             => 'Late (with reason)',
                'clock_in'          => $utc('09:15:00'),
                'clock_out'         => $utc('16:35:00'),
                'status'            => 'late',
                'is_late'           => true,
                'late_reason'       => 'Heavy traffic on Monivong Blvd',
                'early_out_reason'  => null,
                'address'           => 'Phnom Penh, Cambodia',
                'latitude'          => 11.5600,
                'longitude'         => 104.9300,
            ],
            [
                'label'             => 'Early Out (with reason)',
                'clock_in'          => $utc('08:05:00'),
                'clock_out'         => $utc('13:45:00'),
                'status'            => 'early_out',
                'is_late'           => false,
                'late_reason'       => null,
                'early_out_reason'  => 'Doctor appointment',
                'address'           => 'Phnom Penh, Cambodia',
                'latitude'          => 11.5530,
                'longitude'         => 104.9250,
            ],
            [
                'label'             => 'Present (on time)',
                'clock_in'          => $utc('07:58:00'),
                'clock_out'         => $utc('16:40:00'),
                'status'            => 'present',
                'is_late'           => false,
                'late_reason'       => null,
                'early_out_reason'  => null,
                'address'           => 'Phnom Penh, Cambodia',
                'latitude'          => 11.5570,
                'longitude'         => 104.9290,
            ],
            [
                'label'             => 'Warning (forgot to clock out — HR to review)',
                'clock_in'          => $utc('08:03:00'),
                'clock_out'         => null,
                'status'            => 'warning',
                'is_late'           => false,
                'late_reason'       => null,
                'early_out_reason'  => null,
                'address'           => 'Phnom Penh, Cambodia',
                'latitude'          => 11.5580,
                'longitude'         => 104.9310,
            ],
            [
                'label'             => 'Late + warning (forgot to clock out — HR to review)',
                'clock_in'          => $utc('09:40:00'),
                'clock_out'         => null,
                'status'            => 'warning',
                'is_late'           => true,
                'late_reason'       => 'Car broke down on the way to work',
                'early_out_reason'  => null,
                'address'           => 'Phnom Penh, Cambodia',
                'latitude'          => 11.5545,
                'longitude'         => 104.9265,
            ],
        ];

        // ── Insert records for the first N employees ──────────────────────────
        foreach ($scenarios as $index => $scenario) {
            $employee = $employees->get($index);
            if (!$employee) break;

            Attendance::create([
                'employee_id'       => $employee->id,
                'date'              => $date,
                'clock_in'          => $scenario['clock_in'],
                'clock_out'         => $scenario['clock_out'],
                'status'            => $scenario['status'],
                'is_late'           => $scenario['is_late'],
                'late_reason'       => $scenario['late_reason'],
                'early_out_reason'  => $scenario['early_out_reason'],
                'address'           => $scenario['address'],
                'latitude'          => $scenario['latitude'],
                'longitude'         => $scenario['longitude'],
                'location_accuracy' => rand(5, 20),
            ]);

            $name = $employee->user->name ?? $employee->employee_code;
            $this->command->info("[{$scenario['label']}] → {$name}");
        }

        $this->command->newLine();
        $this->command->info('Attendance demo data seeded for ' . $targetDate->format('d M Y') . '.');
        $this->command->line('Scenarios: Present × 2 | Late | Early Out | Auto Clock-out × 2');
    }
}

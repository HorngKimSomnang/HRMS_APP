<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Employee;
use App\Models\Attendance;
use Carbon\Carbon;

class DashboardDemoSeeder extends Seeder
{
    public function run(): void
    {
        $employees = Employee::with('user')->orderBy('id')->get();

        if ($employees->isEmpty()) {
            $this->command->warn('No employees found.');
            return;
        }

        // Assign realistic departments & activate employees
        $profiles = [
            ['department' => 'Human Resources',    'job_title' => 'HR Manager'],
            ['department' => 'Information Technology', 'job_title' => 'Software Developer'],
            ['department' => 'Finance',             'job_title' => 'Accountant'],
            ['department' => 'Operations',          'job_title' => 'Operations Officer'],
            ['department' => 'Information Technology', 'job_title' => 'UI/UX Designer'],
            ['department' => 'Finance',             'job_title' => 'Finance Analyst'],
        ];

        foreach ($employees->take(6) as $index => $employee) {
            $profile = $profiles[$index] ?? ['department' => 'General', 'job_title' => 'Staff'];
            $employee->update([
                'status'     => 'active',
                'department' => $profile['department'],
                'job_title'  => $profile['job_title'],
            ]);
            $name = $employee->user->name ?? $employee->employee_code;
            $this->command->info("Updated: {$name} → {$profile['department']} / {$profile['job_title']}");
        }

        // Seed historical attendance for the last 14 working days
        // so charts look populated (attendance trend + punctuality charts)
        $today = Carbon::today();
        $tz    = 'Asia/Phnom_Penh';

        // Helper: build UTC datetime string from local time on a given date
        $utc = fn(Carbon $date, string $time) =>
            Carbon::createFromFormat('Y-m-d H:i:s', $date->format('Y-m-d') . " $time", $tz)
                  ->utc()
                  ->toDateTimeString();

        $statusSets = [
            ['present', 'present', 'present', 'late',    'present', 'early_out'],
            ['present', 'late',    'present', 'present', 'present', 'present'],
            ['present', 'present', 'absent',  'present', 'late',    'present'],
            ['late',    'present', 'present', 'present', 'present', 'present'],
            ['present', 'present', 'present', 'present', 'early_out','present'],
            ['present', 'present', 'late',    'present', 'present', 'present'],
            ['present', 'absent',  'present', 'late',    'present', 'present'],
            ['present', 'present', 'present', 'present', 'present', 'late'],
            ['late',    'present', 'present', 'present', 'present', 'present'],
            ['present', 'present', 'present', 'early_out','present','present'],
            ['present', 'present', 'late',    'present', 'present', 'present'],
            ['present', 'present', 'present', 'present', 'absent',  'present'],
            ['present', 'late',    'present', 'present', 'present', 'present'],
            ['present', 'present', 'present', 'present', 'present', 'early_out'],
        ];

        $day = 0;
        for ($i = 14; $i >= 1; $i--) {
            $date = $today->copy()->subDays($i);
            if ($date->isSunday()) continue;

            $statuses = $statusSets[$day % count($statusSets)];
            $day++;

            foreach ($employees->take(6) as $idx => $employee) {
                // Skip if record already exists for this date
                if (Attendance::where('employee_id', $employee->id)
                    ->whereDate('date', $date)->exists()) continue;

                $status   = $statuses[$idx] ?? 'present';
                $isLate   = $status === 'late';
                $isEarly  = $status === 'early_out';

                if ($status === 'absent') continue; // absent = no record

                $clockIn  = $isLate  ? $utc($date, '09:' . rand(10, 45) . ':00')
                                     : $utc($date, '07:' . rand(55, 59) . ':00');
                $clockOut = $isEarly ? $utc($date, '13:' . rand(30, 59) . ':00')
                                     : $utc($date, '16:' . rand(30, 45) . ':00');

                Attendance::create([
                    'employee_id'      => $employee->id,
                    'date'             => $date->format('Y-m-d'),
                    'clock_in'         => $clockIn,
                    'clock_out'        => $clockOut,
                    'status'           => $status,
                    'is_late'          => $isLate,
                    'late_reason'      => $isLate ? 'Traffic congestion' : null,
                    'early_out_reason' => $isEarly ? 'Personal appointment' : null,
                    'address'          => 'Phnom Penh, Cambodia',
                    'latitude'         => 11.5564 + (rand(-5, 5) * 0.001),
                    'longitude'        => 104.9282 + (rand(-5, 5) * 0.001),
                    'location_accuracy'=> rand(5, 20),
                ]);
            }
        }

        $this->command->newLine();
        $this->command->info('Dashboard demo data seeded: 6 employees activated with departments + 14-day attendance history.');
    }
}

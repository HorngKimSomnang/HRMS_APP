<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DemoDataSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $employees = \App\Models\Employee::factory(26)->create();

        // Let's create some attendances for the last 7 days to populate the bar chart
        // And some attendances for the current month to populate the pie chart
        $today = \Carbon\Carbon::today();
        
        foreach ($employees as $employee) {
            // Generate attendances for the last 15 days
            for ($i = 0; $i < 15; $i++) {
                $date = $today->copy()->subDays($i);
                
                // Skip weekends roughly (if Saturday or Sunday)
                if ($date->isWeekend()) {
                    continue;
                }
                
                // 10% chance of being absent (no record)
                if (rand(1, 100) <= 10) {
                    continue;
                }
                
                // 20% chance of being late
                $isLate = rand(1, 100) <= 20;
                
                $clockIn = $date->copy()->setHour(8)->setMinute($isLate ? rand(15, 59) : rand(0, 10));
                $clockOut = $date->copy()->setHour(17)->setMinute(rand(0, 30));

                \App\Models\Attendance::create([
                    'employee_id' => $employee->id,
                    'date' => $date->format('Y-m-d'),
                    'clock_in' => $clockIn,
                    'clock_out' => $clockOut,
                    'status' => $isLate ? 'late' : 'present',
                    'is_late' => $isLate,
                    'latitude' => 11.5564,
                    'longitude' => 104.9282,
                ]);
            }
            
            // Give 5% of employees a pending leave request
            if (rand(1, 100) <= 5) {
                \App\Models\Leave::create([
                    'employee_id' => $employee->id,
                    'leave_type' => 'Annual Leave',
                    'start_date' => $today->copy()->addDays(rand(1, 5))->format('Y-m-d'),
                    'end_date' => $today->copy()->addDays(rand(6, 10))->format('Y-m-d'),
                    'days_count' => rand(1, 4),
                    'reason' => 'Family vacation',
                    'status' => 'pending',
                ]);
            }

            // Give some employees approved leaves to show in Leave Trends
            if (rand(1, 100) <= 30) {
                \App\Models\Leave::create([
                    'employee_id' => $employee->id,
                    'leave_type' => 'Sick Leave',
                    'start_date' => $today->copy()->subMonths(rand(1, 4))->format('Y-m-d'),
                    'end_date' => $today->copy()->subMonths(rand(1, 4))->addDays(2)->format('Y-m-d'),
                    'days_count' => rand(1, 3),
                    'reason' => 'Medical appointment',
                    'status' => 'approved',
                ]);
            }
        }
    }
}

<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Leave;
use App\Models\Employee;
use Carbon\Carbon;

class LeaveDemoSeeder extends Seeder
{
    public function run(): void
    {
        $employees = Employee::with('user')->orderBy('id')->get();

        if ($employees->count() < 5) {
            $this->command->warn('Need at least 5 employees.');
            return;
        }

        // Clear existing leave demo records (pending only, keep real ones)
        Leave::whereIn('employee_id', $employees->pluck('id'))
            ->where('status', 'pending')
            ->forceDelete();

        $today = Carbon::today();

        $requests = [
            [
                'employee'   => $employees->get(1), // Sophal Soreachpooh
                'leave_type' => 'Annual Leave',
                'start_date' => $today->copy()->addDays(2)->format('Y-m-d'),
                'end_date'   => $today->copy()->addDays(4)->format('Y-m-d'),
                'days_count' => 3,
                'reason'     => 'Family trip planned for the long weekend',
                'status'     => 'pending',
            ],
            [
                'employee'   => $employees->get(2), // Chhheang Oudoum
                'leave_type' => 'Sick Leave',
                'start_date' => $today->copy()->addDay()->format('Y-m-d'),
                'end_date'   => $today->copy()->addDays(2)->format('Y-m-d'),
                'days_count' => 2,
                'reason'     => 'Feeling unwell, visiting doctor tomorrow morning',
                'status'     => 'pending',
            ],
            [
                'employee'   => $employees->get(4), // Horng KimSomnang
                'leave_type' => 'Personal Leave',
                'start_date' => $today->copy()->addDays(5)->format('Y-m-d'),
                'end_date'   => $today->copy()->addDays(5)->format('Y-m-d'),
                'days_count' => 1,
                'reason'     => 'Personal matters to handle at the government office',
                'status'     => 'pending',
            ],
            [
                'employee'   => $employees->get(0), // Heng Camary
                'leave_type' => 'Annual Leave',
                'start_date' => $today->copy()->subDays(5)->format('Y-m-d'),
                'end_date'   => $today->copy()->subDays(3)->format('Y-m-d'),
                'days_count' => 3,
                'reason'     => 'Attended a family ceremony in the province',
                'status'     => 'approved',
            ],
            [
                'employee'   => $employees->get(3), // Rady Ren
                'leave_type' => 'Sick Leave',
                'start_date' => $today->copy()->subDays(10)->format('Y-m-d'),
                'end_date'   => $today->copy()->subDays(9)->format('Y-m-d'),
                'days_count' => 2,
                'reason'     => 'Fever and food poisoning',
                'status'     => 'approved',
            ],
            [
                'employee'   => $employees->get(5), // Oudom Ngoun
                'leave_type' => 'Annual Leave',
                'start_date' => $today->copy()->subDays(3)->format('Y-m-d'),
                'end_date'   => $today->copy()->subDays(2)->format('Y-m-d'),
                'days_count' => 2,
                'reason'     => 'Attending a wedding ceremony',
                'status'     => 'rejected',
                'rejection_reason' => 'Too many staff already on leave that week',
            ],
        ];

        foreach ($requests as $data) {
            $employee = $data['employee'];
            if (!$employee) continue;

            Leave::create([
                'employee_id'      => $employee->id,
                'leave_type'       => $data['leave_type'],
                'start_date'       => $data['start_date'],
                'end_date'         => $data['end_date'],
                'days_count'       => $data['days_count'],
                'reason'           => $data['reason'],
                'status'           => $data['status'],
                'rejection_reason' => $data['rejection_reason'] ?? null,
            ]);

            $name = $employee->user->name ?? $employee->employee_code;
            $this->command->info("[{$data['status']}] {$name} → {$data['leave_type']} ({$data['days_count']} day/s)");
        }

        $this->command->newLine();
        $this->command->info('Leave demo data seeded: 3 Pending | 2 Approved | 1 Rejected');
    }
}

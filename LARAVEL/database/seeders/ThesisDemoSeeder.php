<?php

namespace Database\Seeders;

use App\Models\Announcement;
use App\Models\Attendance;
use App\Models\Employee;
use App\Models\Leave;
use App\Models\Overtime;
use App\Models\Payslip;
use App\Models\Task;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class ThesisDemoSeeder extends Seeder
{
    private string $tz      = 'Asia/Phnom_Penh';
    private string $lat     = '11.5564';
    private string $lng     = '104.9282';
    private string $address = 'Hen Chen Investment Co., Ltd., Phnom Penh';

    public function run(): void
    {
        $this->updateProfiles();
        $this->seedAttendance();
        $this->seedLeaves();
        $this->seedOvertime();
        $this->seedPayslips();
        $this->seedAnnouncements();
        $this->seedTasks();

        $this->command->info('Thesis demo data seeded successfully!');
    }

    // -------------------------------------------------------------------------
    // 1. Employee profiles
    // -------------------------------------------------------------------------
    private function updateProfiles(): void
    {
        $profiles = [
            'EMP001' => [
                'first_name'   => 'Heng',
                'last_name'    => 'Camary',
                'job_title'    => 'HR Manager',
                'department'   => 'Human Resources',
                'gender'       => 'Female',
                'dob'          => '1990-03-15',
                'joining_date' => '2022-01-10',
                'phone'        => '0716666017',
                'address'      => 'St. 271, Toul Kork, Phnom Penh',
                'basic_salary' => 800.00,
            ],
            'EMP002' => [
                'first_name'   => 'Sophal',
                'last_name'    => 'Soreachpooh',
                'job_title'    => 'Software Developer',
                'department'   => 'Information Technology',
                'gender'       => 'Male',
                'dob'          => '1998-06-12',
                'joining_date' => '2023-09-01',
                'phone'        => '086254456',
                'address'      => 'St. 598, Boeung Keng Kang, Phnom Penh',
                'basic_salary' => 700.00,
            ],
            'EMP007' => [
                'first_name'   => 'Chhheang',
                'last_name'    => 'Oudoum',
                'job_title'    => 'Accountant',
                'department'   => 'Finance',
                'gender'       => 'Male',
                'dob'          => '1993-11-20',
                'joining_date' => '2022-07-15',
                'phone'        => '0677848474',
                'address'      => 'St. 113, Daun Penh, Phnom Penh',
                'basic_salary' => 650.00,
            ],
            'EMP008' => [
                'first_name'   => 'Rady',
                'last_name'    => 'Ren',
                'job_title'    => 'Operations Officer',
                'department'   => 'Operations',
                'gender'       => 'Female',
                'dob'          => '1995-04-08',
                'joining_date' => '2023-03-20',
                'phone'        => '010260074',
                'address'      => 'St. 63, Chamkar Mon, Phnom Penh',
                'basic_salary' => 600.00,
            ],
            'EMP009' => [
                'first_name'   => 'Horng',
                'last_name'    => 'KimSomnang',
                'job_title'    => 'UI/UX Designer',
                'department'   => 'Information Technology',
                'gender'       => 'Male',
                'dob'          => '1997-02-14',
                'joining_date' => '2024-01-08',
                'phone'        => '099655886',
                'address'      => 'St. 430, Por Sen Chey, Phnom Penh',
                'basic_salary' => 580.00,
            ],
            'EMP010' => [
                'first_name'   => 'Oudom',
                'last_name'    => 'Ngoun',
                'job_title'    => 'Finance Analyst',
                'department'   => 'Finance',
                'gender'       => 'Male',
                'dob'          => '1992-08-25',
                'joining_date' => '2022-11-01',
                'phone'        => '0962089546',
                'address'      => 'St. 169, Sen Sok, Phnom Penh',
                'basic_salary' => 700.00,
            ],
        ];

        foreach ($profiles as $code => $data) {
            Employee::where('employee_code', $code)->update($data);
        }

        $this->command->info('Employee profiles updated.');
    }

    // -------------------------------------------------------------------------
    // 2. Attendance – April 1 → yesterday, plus today's partial clock-ins
    // -------------------------------------------------------------------------
    private function seedAttendance(): void
    {
        $employees = Employee::whereIn('employee_code', ['EMP001','EMP002','EMP007','EMP008','EMP009','EMP010'])
            ->get()->keyBy('employee_code');

        // Days each employee was late (clocked in after 08:15)
        $lateOn = [
            'EMP001' => ['2026-04-08', '2026-05-14', '2026-06-03'],
            'EMP002' => ['2026-04-15', '2026-04-29', '2026-05-07', '2026-06-10'],
            'EMP007' => ['2026-04-22', '2026-05-20'],
            'EMP008' => ['2026-04-10', '2026-05-12', '2026-06-18'],
            'EMP009' => ['2026-04-17', '2026-05-05', '2026-06-08'],
            'EMP010' => ['2026-04-24', '2026-05-28'],
        ];

        // Days each employee left early
        $earlyOutOn = [
            'EMP001' => ['2026-04-25'],
            'EMP002' => ['2026-05-22'],
            'EMP007' => ['2026-06-12'],
            'EMP008' => ['2026-04-18'],
            'EMP009' => ['2026-05-15'],
            'EMP010' => ['2026-06-05'],
        ];

        // Days each employee was absent (no attendance record)
        $absentOn = [
            'EMP002' => ['2026-04-14', '2026-04-15', '2026-04-16'], // sick leave
            'EMP007' => ['2026-05-19'],                               // annual leave
            'EMP008' => ['2026-05-26', '2026-05-27', '2026-05-28'], // annual leave
            'EMP009' => ['2026-06-22'],                               // unexplained absence
        ];

        $start = Carbon::parse('2026-04-01', $this->tz);
        $yesterday = Carbon::yesterday($this->tz);
        $current = $start->copy();

        while ($current->lte($yesterday)) {
            if ($current->isWeekend()) {
                $current->addDay();
                continue;
            }

            $dateStr = $current->format('Y-m-d');

            foreach ($employees as $code => $employee) {
                // Skip absent days
                if (in_array($dateStr, $absentOn[$code] ?? [])) {
                    continue;
                }
                // Don't duplicate existing records
                if (Attendance::where('employee_id', $employee->id)->where('date', $dateStr)->exists()) {
                    continue;
                }

                $isLate     = in_array($dateStr, $lateOn[$code] ?? []);
                $isEarlyOut = in_array($dateStr, $earlyOutOn[$code] ?? []);

                $inMin  = $isLate ? rand(20, 50) : rand(0, 12);
                $outH   = $isEarlyOut ? rand(15, 16) : 17;
                $outMin = $isEarlyOut ? rand(0, 30) : rand(0, 25);

                $clockIn  = Carbon::parse("{$dateStr} 08:{$inMin}:00", $this->tz)->utc();
                $clockOut = Carbon::parse("{$dateStr} {$outH}:{$outMin}:00", $this->tz)->utc();

                $status = 'present';
                if ($isEarlyOut) $status = 'early_out';
                elseif ($isLate) $status = 'late';

                Attendance::create([
                    'employee_id'      => $employee->id,
                    'date'             => $dateStr,
                    'clock_in'         => $clockIn,
                    'clock_out'        => $clockOut,
                    'status'           => $status,
                    'is_late'          => $isLate,
                    'late_reason'      => $isLate    ? 'Traffic congestion on road to office' : null,
                    'early_out_reason' => $isEarlyOut ? 'Medical appointment' : null,
                    'latitude'         => $this->lat,
                    'longitude'        => $this->lng,
                    'address'          => $this->address,
                ]);
            }

            $current->addDay();
        }

        // Today – 4 employees clocked in, 2 not yet (realistic live demo)
        $todayStr      = Carbon::today($this->tz)->format('Y-m-d');
        $clockedToday  = ['EMP001', 'EMP002', 'EMP007', 'EMP008'];

        foreach ($clockedToday as $code) {
            $employee = $employees[$code] ?? null;
            if (!$employee) continue;
            if (Attendance::where('employee_id', $employee->id)->where('date', $todayStr)->exists()) continue;

            $clockIn = Carbon::parse("{$todayStr} 08:00:00", $this->tz)->addMinutes(rand(0, 15))->utc();
            Attendance::create([
                'employee_id' => $employee->id,
                'date'        => $todayStr,
                'clock_in'    => $clockIn,
                'clock_out'   => null,
                'status'      => 'present',
                'is_late'     => false,
                'latitude'    => $this->lat,
                'longitude'   => $this->lng,
                'address'     => $this->address,
            ]);
        }

        $this->command->info('Attendance records seeded.');
    }

    // -------------------------------------------------------------------------
    // 3. Leaves
    // -------------------------------------------------------------------------
    private function seedLeaves(): void
    {
        $employees = Employee::whereIn('employee_code', ['EMP001','EMP002','EMP007','EMP008','EMP009','EMP010'])
            ->get()->keyBy('employee_code');
        $admin = User::role('Admin')->first();

        $leaves = [
            // EMP002 – sick leave matching absent days
            [
                'code'   => 'EMP002',
                'type'   => 'Sick Leave',
                'start'  => '2026-04-14', 'end' => '2026-04-16', 'days' => 3,
                'reason' => 'Fever and flu; doctor advised bed rest for 3 days.',
                'status' => 'approved',
            ],
            // EMP007 – annual leave 1 day matching absent day
            [
                'code'   => 'EMP007',
                'type'   => 'Annual Leave',
                'start'  => '2026-05-19', 'end' => '2026-05-19', 'days' => 1,
                'reason' => 'Personal family matters.',
                'status' => 'approved',
            ],
            // EMP008 – annual leave matching absent days
            [
                'code'   => 'EMP008',
                'type'   => 'Annual Leave',
                'start'  => '2026-05-26', 'end' => '2026-05-28', 'days' => 3,
                'reason' => 'Family trip to Siem Reap.',
                'status' => 'approved',
            ],
            // EMP009 – rejected leave (no matching absent day — arrived as usual)
            [
                'code'      => 'EMP009',
                'type'      => 'Emergency Leave',
                'start'     => '2026-06-09', 'end' => '2026-06-09', 'days' => 1,
                'reason'    => 'Personal emergency at home.',
                'status'    => 'rejected',
                'rejection' => 'Insufficient documentation provided. Please submit supporting evidence.',
            ],
            // EMP010 – upcoming pending sick leave
            [
                'code'   => 'EMP010',
                'type'   => 'Sick Leave',
                'start'  => '2026-07-07', 'end' => '2026-07-09', 'days' => 3,
                'reason' => 'Scheduled medical check-up and post-procedure recovery.',
                'status' => 'pending',
            ],
            // EMP001 – upcoming pending annual leave
            [
                'code'   => 'EMP001',
                'type'   => 'Annual Leave',
                'start'  => '2026-07-14', 'end' => '2026-07-16', 'days' => 3,
                'reason' => 'Annual family vacation.',
                'status' => 'pending',
            ],
        ];

        foreach ($leaves as $l) {
            $employee = $employees[$l['code']] ?? null;
            if (!$employee) continue;

            // Avoid duplicates
            if (Leave::where('employee_id', $employee->id)->where('start_date', $l['start'])->exists()) continue;

            Leave::create([
                'employee_id'      => $employee->id,
                'leave_type'       => $l['type'],
                'start_date'       => $l['start'],
                'end_date'         => $l['end'],
                'days_count'       => $l['days'],
                'reason'           => $l['reason'],
                'status'           => $l['status'],
                'approved_by'      => in_array($l['status'], ['approved', 'rejected']) ? $admin?->id : null,
                'rejection_reason' => $l['rejection'] ?? null,
            ]);
        }

        $this->command->info('Leave records seeded.');
    }

    // -------------------------------------------------------------------------
    // 4. Overtime
    // -------------------------------------------------------------------------
    private function seedOvertime(): void
    {
        $employees = Employee::whereIn('employee_code', ['EMP001','EMP002','EMP007','EMP008','EMP009','EMP010'])
            ->get()->keyBy('employee_code');
        $admin = User::role('Admin')->first();

        $overtimes = [
            ['code' => 'EMP002', 'date' => '2026-05-17', 'start' => '17:30', 'end' => '20:30', 'hours' => 3.00,
             'reason' => 'Project deadline – fixing critical login authentication bug before go-live.', 'status' => 'approved'],

            ['code' => 'EMP002', 'date' => '2026-06-14', 'start' => '17:00', 'end' => '19:00', 'hours' => 2.00,
             'reason' => 'System integration testing session before HRMS production release.', 'status' => 'approved'],

            ['code' => 'EMP007', 'date' => '2026-05-31', 'start' => '17:30', 'end' => '19:00', 'hours' => 1.50,
             'reason' => 'Month-end financial report preparation and account reconciliation.', 'status' => 'approved'],

            ['code' => 'EMP010', 'date' => '2026-05-30', 'start' => '17:30', 'end' => '19:30', 'hours' => 2.00,
             'reason' => 'Quarterly financial analysis and variance report for Q2.', 'status' => 'approved'],

            ['code' => 'EMP008', 'date' => '2026-06-20', 'start' => '17:00', 'end' => '19:00', 'hours' => 2.00,
             'reason' => 'Operational audit documentation and compliance review.', 'status' => 'pending'],

            ['code' => 'EMP009', 'date' => '2026-06-21', 'start' => '17:00', 'end' => '19:30', 'hours' => 2.50,
             'reason' => 'UI design revisions and prototype update for client presentation.', 'status' => 'pending'],
        ];

        foreach ($overtimes as $o) {
            $employee = $employees[$o['code']] ?? null;
            if (!$employee) continue;
            if (Overtime::where('employee_id', $employee->id)->where('date', $o['date'])->exists()) continue;

            Overtime::create([
                'employee_id' => $employee->id,
                'date'        => $o['date'],
                'start_time'  => $o['start'],
                'end_time'    => $o['end'],
                'hours'       => $o['hours'],
                'reason'      => $o['reason'],
                'status'      => $o['status'],
                'approved_by' => $o['status'] === 'approved' ? $admin?->id : null,
            ]);
        }

        $this->command->info('Overtime records seeded.');
    }

    // -------------------------------------------------------------------------
    // 5. Payslips – April (paid) and May (approved) for all 6 employees
    // -------------------------------------------------------------------------
    private function seedPayslips(): void
    {
        $employees = Employee::whereIn('employee_code', ['EMP001','EMP002','EMP007','EMP008','EMP009','EMP010'])
            ->get()->keyBy('employee_code');

        // [code, month, year, overtime_amount, attendance_bonus, allowances, deductions, notes, status]
        $slips = [
            // EMP001 – HR Manager ($800)
            ['EMP001', 'April', '2026', 0,     50,  100, 20, 'Perfect attendance. April bonus applied.',             'paid'],
            ['EMP001', 'May',   '2026', 0,     50,  100, 20, null,                                                   'approved'],

            // EMP002 – Software Developer ($700)
            ['EMP002', 'April', '2026', 0,     0,   80,  15, '3 days sick leave in April.',                          'paid'],
            ['EMP002', 'May',   '2026', 112.50,50,  80,  15, 'Approved 3h OT on May 17 at $37.50/h (basic/20).',   'approved'],

            // EMP007 – Accountant ($650)
            ['EMP007', 'April', '2026', 0,     50,  60,  10, 'Perfect attendance. April bonus applied.',             'paid'],
            ['EMP007', 'May',   '2026', 48.75, 0,   60,  10, '1.5h OT on May 31 for month-end report.',             'approved'],

            // EMP008 – Operations Officer ($600)
            ['EMP008', 'April', '2026', 0,     50,  60,  10, 'Perfect attendance. April bonus applied.',             'paid'],
            ['EMP008', 'May',   '2026', 0,     0,   60,  10, '3 days annual leave in May.',                          'approved'],

            // EMP009 – UI/UX Designer ($580)
            ['EMP009', 'April', '2026', 0,     50,  60,  10, 'Perfect attendance. April bonus applied.',             'paid'],
            ['EMP009', 'May',   '2026', 0,     0,   60,  10, 'Emergency leave rejected; absent 1 day deducted.',    'approved'],

            // EMP010 – Finance Analyst ($700)
            ['EMP010', 'April', '2026', 0,     50,  60,  10, 'Perfect attendance. April bonus applied.',             'paid'],
            ['EMP010', 'May',   '2026', 70,    50,  60,  10, '2h OT on May 30 for quarterly analysis.',             'approved'],
        ];

        foreach ($slips as [$code, $month, $year, $ot, $bonus, $allow, $ded, $notes, $status]) {
            $employee = $employees[$code] ?? null;
            if (!$employee) continue;
            if (Payslip::where('employee_id', $employee->id)->where('month', $month)->where('year', $year)->exists()) continue;

            $basic = (float) ($employee->basic_salary ?? 0);
            $net   = $basic + $ot + $bonus + $allow - $ded;

            Payslip::create([
                'employee_id'       => $employee->id,
                'month'             => $month,
                'year'              => $year,
                'basic_salary'      => $basic,
                'overtime_amount'   => $ot,
                'commission'        => 0,
                'attendance_bonus'  => $bonus,
                'allowances'        => $allow,
                'advance_deduction' => 0,
                'deductions'        => $ded,
                'net_salary'        => $net,
                'status'            => $status,
                'notes'             => $notes,
                'is_signed'         => $status === 'paid',
                'signed_at'         => $status === 'paid' ? Carbon::parse('2026-05-05') : null,
            ]);
        }

        $this->command->info('Payslip records seeded.');
    }

    // -------------------------------------------------------------------------
    // 6. Announcements
    // -------------------------------------------------------------------------
    private function seedAnnouncements(): void
    {
        if (Announcement::count() > 0) return;

        $admin = User::role('Admin')->first();

        $announcements = [
            [
                'type'       => 'Holiday',
                'title'      => 'Khmer New Year Holiday Notice',
                'content'    => 'The company will be closed from April 14–16, 2026 in observance of Khmer New Year (ចូលឆ្នាំខ្មែរ). Wishing all employees and their families a joyful and prosperous celebration.',
                'start_date' => '2026-04-14',
                'end_date'   => '2026-04-16',
                'created_at' => '2026-04-10',
            ],
            [
                'type'       => 'General',
                'title'      => 'Monthly All-Staff Meeting – May 2026',
                'content'    => 'A mandatory all-staff meeting will be held on Tuesday, May 5, 2026 at 10:00 AM in the main conference room. All department heads must attend and prepare a brief progress update. Light refreshments will be provided.',
                'start_date' => '2026-05-05',
                'end_date'   => null,
                'created_at' => '2026-04-28',
            ],
            [
                'type'       => 'Info',
                'title'      => 'Office Dress Code Reminder',
                'content'    => 'As a reminder to all staff: smart casual attire is required Monday through Thursday. Business casual applies on Fridays. Clothing with offensive graphics or slogans is not permitted at any time. Please ensure your appearance reflects our professional standards.',
                'start_date' => null,
                'end_date'   => null,
                'created_at' => '2026-05-12',
            ],
            [
                'type'       => 'General',
                'title'      => 'Q2 Performance Review Schedule',
                'content'    => 'Individual performance review sessions for Q2 2026 are scheduled from June 23–27. Your line manager will contact you directly with your appointment time. Please complete your self-assessment form in the HR system before your session.',
                'start_date' => '2026-06-23',
                'end_date'   => '2026-06-27',
                'created_at' => '2026-06-15',
            ],
            [
                'type'       => 'Urgent',
                'title'      => 'HR System Maintenance – June 29',
                'content'    => 'The HR Management System will undergo scheduled maintenance on Sunday, June 29, 2026 from 10:00 PM to 2:00 AM. Clock-in/clock-out via the mobile app will be unavailable during this window. Please plan accordingly.',
                'start_date' => '2026-06-29',
                'end_date'   => null,
                'created_at' => '2026-06-25',
            ],
        ];

        foreach ($announcements as $a) {
            Announcement::create([
                'type'         => $a['type'],
                'title'        => $a['title'],
                'content'      => $a['content'],
                'start_date'   => $a['start_date'],
                'end_date'     => $a['end_date'],
                'is_published' => true,
                'created_by'   => $admin?->id,
                'created_at'   => Carbon::parse($a['created_at']),
                'updated_at'   => Carbon::parse($a['created_at']),
            ]);
        }

        $this->command->info('Announcements seeded.');
    }

    // -------------------------------------------------------------------------
    // 7. Tasks
    // -------------------------------------------------------------------------
    private function seedTasks(): void
    {
        if (Task::count() > 0) return;

        $employees = Employee::whereIn('employee_code', ['EMP001','EMP002','EMP007','EMP008','EMP009','EMP010'])
            ->get()->keyBy('employee_code');
        $admin = User::role('Admin')->first();

        $tasks = [
            // Software Developer
            ['EMP002', 'Implement Employee API Integration',
             'Build and test REST API endpoints for employee clock-in/clock-out synchronization with the Flutter mobile application.',
             'completed', 'high', '2026-05-30'],

            ['EMP002', 'Fix Attendance Timezone Bug',
             'Investigate and resolve the timezone mismatch bug in attendance hours calculation affecting cross-midnight clock-outs in Cambodia (UTC+7).',
             'completed', 'high', '2026-06-10'],

            ['EMP002', 'Mobile App Push Notifications',
             'Implement push notifications for clock-out reminders 15 minutes before shift end using Firebase Cloud Messaging (FCM).',
             'in_progress', 'medium', '2026-07-05'],

            // UI/UX Designer
            ['EMP009', 'Redesign Employee Dashboard',
             'Redesign the mobile dashboard layout with improved UX – attendance summary card, leave balance widget, and upcoming task preview.',
             'completed', 'high', '2026-05-20'],

            ['EMP009', 'Design Payslip PDF Template',
             'Create a professional, branded PDF template for payslips including company logo, employee details, earnings breakdown, and digital signature field.',
             'in_progress', 'medium', '2026-07-10'],

            // Accountant
            ['EMP007', 'Prepare Q1 2026 Financial Report',
             'Compile and review all financial transactions for Q1 2026. Submit finalized report to Finance Manager by end of April.',
             'completed', 'high', '2026-04-30'],

            ['EMP007', 'Payroll Reconciliation – May 2026',
             'Verify all payroll entries for May, cross-check with attendance and overtime records, and submit for Finance Manager approval by June 5.',
             'completed', 'high', '2026-06-05'],

            // Finance Analyst
            ['EMP010', 'Q2 Budget Variance Analysis',
             'Analyze Q2 departmental spending versus approved budget. Prepare variance report and submit management recommendations by mid-July.',
             'in_progress', 'high', '2026-07-15'],

            // Operations Officer
            ['EMP008', 'Update Office Operations SOP',
             'Review and update the Standard Operating Procedures document for office operations to reflect the new HR system attendance and overtime policies.',
             'in_progress', 'medium', '2026-07-01'],

            // HR Manager
            ['EMP001', 'Conduct Q2 Performance Reviews',
             'Schedule and facilitate individual performance review sessions for all 6 employees. Record scores and submit final report to management by June 30.',
             'in_progress', 'high', '2026-06-30'],

            ['EMP001', 'Revise Employee Handbook 2026',
             'Update the employee handbook to include the new remote work policy, updated leave entitlements, and overtime claim guidelines effective July 2026.',
             'pending', 'low', '2026-07-31'],
        ];

        foreach ($tasks as [$code, $title, $desc, $status, $priority, $due]) {
            $employee = $employees[$code] ?? null;
            if (!$employee) continue;

            Task::create([
                'title'       => $title,
                'description' => $desc,
                'assigned_to' => $employee->id,
                'assigned_by' => $admin?->id,
                'status'      => $status,
                'priority'    => $priority,
                'due_date'    => $due,
            ]);
        }

        $this->command->info('Tasks seeded.');
    }
}

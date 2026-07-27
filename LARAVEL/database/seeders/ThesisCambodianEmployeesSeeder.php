<?php

namespace Database\Seeders;

use App\Models\Asset;
use App\Models\AssetAssignment;
use App\Models\Attendance;
use App\Models\Contract;
use App\Models\Employee;
use App\Models\EmployeeEvent;
use App\Models\Leave;
use App\Models\Overtime;
use App\Models\Payslip;
use App\Models\Setting;
use App\Models\Task;
use App\Models\User;
use App\Support\HrCatalog;
use Carbon\Carbon;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Adds ten synthetic Cambodian employees and a complete, report-ready history.
 *
 * This seeder is intentionally NOT included in DatabaseSeeder. Run it explicitly
 * after taking a backup:
 *
 *   php artisan db:seed --class=ThesisCambodianEmployeesSeeder
 *
 * Safe to re-run: legacy thesis identifiers and natural record keys are reused.
 * Existing real employees and their records are never selected or modified.
 */
class ThesisCambodianEmployeesSeeder extends Seeder
{
    use WithoutModelEvents;

    private const TIMEZONE = 'Asia/Phnom_Penh';
    private const WORKPLACE_ADDRESS = 'Norton University, St. Keo Chenda, Sangkat Chroy Changvar, Khan Chroy Changvar, Phnom Penh, Cambodia';
    private const WORKPLACE_LATITUDE = 11.58817;
    private const WORKPLACE_LONGITUDE = 104.93074;
    private const SHIFT_START_TIME = '08:00:00';
    private const SHIFT_END_TIME = '16:55:00';
    private const LATE_GRACE_MINUTES = 15;
    private const EARLY_OUT_FLEX_MINUTES = 10;

    public function run(): void
    {
        $approver = User::role('Super Admin')->first() ?? User::role('Admin')->first();

        if (!$approver) {
            throw new \RuntimeException(
                'Create a Super Admin or Admin before running ThesisCambodianEmployeesSeeder.'
            );
        }

        $profiles = $this->profiles();
        $today = Carbon::today(self::TIMEZONE);
        $demoPassword = Str::password(16);
        $createdEmails = [];

        DB::transaction(function () use (
            $approver,
            $profiles,
            $today,
            $demoPassword,
            &$createdEmails
        ): void {
            $this->configureThesisWorkplace();

            foreach ($profiles as $index => $profile) {
                [$employee, $wasCreated] = $this->upsertEmployee($profile, $demoPassword);

                if ($wasCreated) {
                    $createdEmails[] = $profile['email'];
                }

                $this->seedLeaves($employee, $index, $today, $approver);
                $this->seedAttendance($employee, $index, $today);
                $this->seedOvertime($employee, $index, $today, $approver);
                $this->seedPayslips($employee, $index, $today);
                $this->seedTasks($employee, $index, $today, $approver);
                $this->seedLifecycle($employee, $index, $today, $approver);
                $this->seedAsset($employee, $index, $today);
            }

            $this->normalizeAttendanceRecords();
            $this->adjustHengCamarySalary();
        });

        $this->command?->newLine();
        $this->command?->info('Thesis dataset ready: 10 synthetic Cambodian employees.');
        $this->command?->line('Coverage: attendance, leave, overtime, payroll, tasks, contracts, lifecycle, and assets.');
        $this->command?->line('Workplace: Norton University. Morning shift is 8:00 AM-4:55 PM; attendance locations and status labels normalized.');

        if ($createdEmails !== []) {
            $this->command?->warn('Save these new demo credentials now:');
            $this->command?->line('Emails: ' . implode(', ', $createdEmails));
            $this->command?->line('Shared one-time password: ' . $demoPassword);
        } else {
            $this->command?->line('All demo accounts already existed; their passwords were left unchanged.');
        }
    }

    private function upsertEmployee(array $profile, string $demoPassword): array
    {
        $user = User::withTrashed()
            ->whereIn('email', array_merge([$profile['email']], $profile['legacy_emails']))
            ->first();
        $wasCreated = $user === null;

        if (!$user) {
            $user = new User();
            $user->password = Hash::make($demoPassword);
            $user->email_verified_at = now();
            $user->password_changed_at = now();
        } elseif ($user->trashed()) {
            $user->restore();
        }

        $emailConflict = User::withTrashed()
            ->where('email', $profile['email'])
            ->when($user->exists, fn ($query) => $query->whereKeyNot($user->id))
            ->exists();
        if ($emailConflict) {
            throw new \RuntimeException("Cannot use {$profile['email']}: that email already exists.");
        }

        $user->name = $profile['last_name'] . ' ' . $profile['first_name'];
        $user->email = $profile['email'];
        $user->save();

        if (!$user->hasRole('Employee')) {
            $user->assignRole('Employee');
        }

        $employee = Employee::withTrashed()->where('user_id', $user->id)->first()
            ?? Employee::withTrashed()->where('employee_code', $profile['legacy_code'])->first();

        if (!$employee) {
            $employee = new Employee();
        } elseif ($employee->trashed()) {
            $employee->restore();
        }

        $employee->fill([
            'user_id' => $user->id,
            'employee_code' => $this->resolveEmployeeCode($profile, $employee),
            'first_name' => $profile['first_name'],
            'last_name' => $profile['last_name'],
            'job_title' => $profile['job_title'],
            'department' => $profile['department'],
            'phone' => $profile['phone'],
            'gender' => $profile['gender'],
            'dob' => $profile['dob'],
            'joining_date' => $profile['joining_date'],
            'address' => $profile['address'],
            'status' => 'active',
            'basic_salary' => $profile['basic_salary'],
            'shift_id' => 1,
            'documents' => [
                'name_kh' => $profile['name_kh'],
                'marital_status' => $profile['marital_status'],
                'emergency_contact' => $profile['emergency_contact'],
                'attachments' => [],
            ],
        ]);
        $employee->save();

        return [$employee, $wasCreated];
    }

    private function resolveEmployeeCode(array $profile, Employee $employee): string
    {
        $desiredCode = $profile['employee_code'];
        $hasConflict = Employee::withTrashed()
            ->where('employee_code', $desiredCode)
            ->when($employee->exists, fn ($query) => $query->whereKeyNot($employee->id))
            ->exists();

        if (!$hasConflict) {
            return $desiredCode;
        }

        if ($employee->exists && str_starts_with($employee->employee_code, 'EMP')) {
            return $employee->employee_code;
        }

        $highestNumber = Employee::withTrashed()
            ->where('employee_code', 'like', 'EMP%')
            ->get(['employee_code'])
            ->map(fn (Employee $item) => (int) substr($item->employee_code, 3))
            ->max() ?? 0;

        return 'EMP' . str_pad((string) ($highestNumber + 1), 3, '0', STR_PAD_LEFT);
    }

    private function seedAttendance(Employee $employee, int $employeeIndex, Carbon $today): void
    {
        $workdayIndex = 0;
        $joiningDate = Carbon::parse($employee->joining_date, self::TIMEZONE)->startOfDay();
        $historyLimit = $today->copy()->subMonths(8)->startOfDay();
        $startDate = $joiningDate->greaterThan($historyLimit) ? $joiningDate : $historyLimit;
        $approvedLeaveDates = $this->approvedLeaveDates($employee);

        for ($date = $startDate->copy(); $date->lte($today); $date->addDay()) {
            if ($date->isWeekend()) {
                continue;
            }

            if (isset($approvedLeaveDates[$date->toDateString()])) {
                Attendance::where('employee_id', $employee->id)
                    ->whereDate('date', $date)
                    ->delete();
                continue;
            }

            $pattern = ($workdayIndex + ($employeeIndex * 3)) % 20;
            $status = match (true) {
                $pattern === 0 => 'absent',
                in_array($pattern, [4, 13], true) => 'late',
                $pattern === 9 => 'early_out',
                default => 'present',
            };

            $attendance = Attendance::withTrashed()->firstOrNew([
                'employee_id' => $employee->id,
                'date' => $date->toDateString(),
            ]);

            if ($status === 'absent') {
                $attendance->fill([
                    'clock_in' => null,
                    'clock_out' => null,
                    'status' => 'absent',
                    'is_late' => false,
                    'late_reason' => null,
                    'early_out_reason' => null,
                    'address' => null,
                    'latitude' => null,
                    'longitude' => null,
                    'location_accuracy' => null,
                ]);
            } else {
                $clockInTime = $status === 'late'
                    ? $date->copy()
                        ->setTime(8, 16)
                        ->addMinutes(($workdayIndex + ($employeeIndex * 2)) % 10)
                        ->format('H:i:s')
                    : $date->copy()
                        ->setTime(7, 55)
                        ->addMinutes(($workdayIndex + ($employeeIndex * 2)) % 16)
                        ->format('H:i:s');
                $clockOutTime = $status === 'early_out'
                    ? $date->copy()
                        ->setTime(16, 35)
                        ->addMinutes(($workdayIndex + ($employeeIndex * 3)) % 16)
                        ->format('H:i:s')
                    : $date->copy()
                        ->setTime(16, 55)
                        ->addMinutes(($workdayIndex + ($employeeIndex * 3)) % 6)
                        ->format('H:i:s');

                $attendance->fill([
                    'clock_in' => $this->localTimeToUtc($date, $clockInTime),
                    'clock_out' => $this->localTimeToUtc($date, $clockOutTime),
                    'status' => $status,
                    'is_late' => $status === 'late',
                    'late_reason' => $status === 'late' ? 'Heavy traffic in Phnom Penh' : null,
                    'early_out_reason' => $status === 'early_out' ? 'Approved personal appointment' : null,
                    'address' => self::WORKPLACE_ADDRESS,
                    'latitude' => (string) (self::WORKPLACE_LATITUDE + ($employeeIndex * 0.00001)),
                    'longitude' => (string) (self::WORKPLACE_LONGITUDE + ($employeeIndex * 0.00001)),
                    'location_accuracy' => (string) (5 + ($employeeIndex % 8)),
                ]);
            }

            $attendance->save();
            if ($attendance->trashed()) {
                $attendance->restore();
            }

            $workdayIndex++;
        }
    }

    private function configureThesisWorkplace(): void
    {
        Setting::updateOrCreate(
            ['key' => 'work_start_time'],
            [
                'value' => '08:00',
                'type' => 'time',
                'group' => 'attendance',
            ]
        );
        Setting::updateOrCreate(
            ['key' => 'late_grace_period_minutes'],
            [
                'value' => (string) self::LATE_GRACE_MINUTES,
                'type' => 'number',
                'group' => 'attendance',
            ]
        );
        Setting::updateOrCreate(
            ['key' => 'office_latitude'],
            [
                'value' => (string) self::WORKPLACE_LATITUDE,
                'type' => 'text',
                'group' => 'attendance',
            ]
        );
        Setting::updateOrCreate(
            ['key' => 'office_longitude'],
            [
                'value' => (string) self::WORKPLACE_LONGITUDE,
                'type' => 'text',
                'group' => 'attendance',
            ]
        );

        $shifts = HrCatalog::getShifts();
        $morningShiftFound = false;

        foreach ($shifts as &$shift) {
            if ((int) ($shift['id'] ?? 0) !== 1) {
                continue;
            }

            $shift['start_time'] = self::SHIFT_START_TIME;
            $shift['end_time'] = self::SHIFT_END_TIME;
            $shift['grace_period_minutes'] = self::LATE_GRACE_MINUTES;
            $morningShiftFound = true;
            break;
        }
        unset($shift);

        if (!$morningShiftFound) {
            $shifts[] = [
                'id' => 1,
                'name' => 'Morning Shift',
                'start_time' => self::SHIFT_START_TIME,
                'end_time' => self::SHIFT_END_TIME,
                'grace_period_minutes' => self::LATE_GRACE_MINUTES,
            ];
        }

        HrCatalog::saveShifts($shifts);
    }

    private function normalizeAttendanceRecords(): void
    {
        Attendance::withTrashed()
            ->whereNotNull('clock_in')
            ->chunkById(250, function ($attendances): void {
                foreach ($attendances as $attendance) {
                    $coordinateOffset = ((int) $attendance->employee_id % 10) * 0.00001;
                    $clockIn = Carbon::parse(
                        $attendance->getRawOriginal('clock_in'),
                        'UTC'
                    )->setTimezone(self::TIMEZONE);
                    $lateThreshold = $clockIn->copy()
                        ->startOfDay()
                        ->setTimeFromTimeString(self::SHIFT_START_TIME)
                        ->addMinutes(self::LATE_GRACE_MINUTES);
                    $isLate = $clockIn->gt($lateThreshold);
                    $isEarlyOut = $attendance->status === 'early_out';

                    if (!$isEarlyOut && $attendance->clock_out) {
                        $clockOut = Carbon::parse(
                            $attendance->getRawOriginal('clock_out'),
                            'UTC'
                        )->setTimezone(self::TIMEZONE);
                        $earliestFlexibleClockOut = $clockOut->copy()
                            ->startOfDay()
                            ->setTimeFromTimeString(self::SHIFT_END_TIME)
                            ->subMinutes(self::EARLY_OUT_FLEX_MINUTES);
                        $isEarlyOut = $clockOut->lt($earliestFlexibleClockOut);
                    }

                    $status = $attendance->status === 'warning'
                        ? 'warning'
                        : ($isEarlyOut ? 'early_out' : ($isLate ? 'late' : 'present'));

                    $attendance->forceFill([
                        'address' => self::WORKPLACE_ADDRESS,
                        'latitude' => (string) (self::WORKPLACE_LATITUDE + $coordinateOffset),
                        'longitude' => (string) (self::WORKPLACE_LONGITUDE + $coordinateOffset),
                        'location_accuracy' => $attendance->location_accuracy ?: '8',
                        'status' => $status,
                        'is_late' => $isLate,
                        'late_reason' => $isLate
                            ? ($attendance->late_reason ?: 'Traffic delay in Phnom Penh')
                            : null,
                        'early_out_reason' => $isEarlyOut
                            ? ($attendance->early_out_reason ?: 'Approved early departure')
                            : null,
                    ])->save();
                }
            });
    }

    private function approvedLeaveDates(Employee $employee): array
    {
        $dates = [];

        Leave::where('employee_id', $employee->id)
            ->where('status', 'approved')
            ->get()
            ->each(function (Leave $leave) use (&$dates): void {
                $date = Carbon::parse($leave->start_date)->startOfDay();
                $endDate = Carbon::parse($leave->end_date)->startOfDay();

                while ($date->lte($endDate)) {
                    $dates[$date->toDateString()] = true;
                    $date->addDay();
                }
            });

        return $dates;
    }

    private function seedLeaves(Employee $employee, int $index, Carbon $today, User $approver): void
    {
        $joiningDate = Carbon::parse($employee->joining_date)->startOfDay();
        $approvedStart = $today->copy()
            ->subMonths(($index % 5) + 1)
            ->startOfMonth()
            ->addDays(3 + (($index * 2) % 15));
        $earliestAnnualLeave = $joiningDate->copy()->addDays(30);
        if ($approvedStart->lt($earliestAnnualLeave)) {
            $approvedStart = $earliestAnnualLeave;
        }

        $this->upsertLeave($employee, [
            'leave_type' => 'Annual Leave',
            'start_date' => $approvedStart,
            'days_count' => 2 + ($index % 2),
            'reason' => 'Family ceremony in home province',
            'status' => 'approved',
            'approved_by' => $approver->id,
        ]);

        $sickStart = $today->copy()->subDays(18 + ($index * 3));
        $earliestSickLeave = $joiningDate->copy()->addDays(14);
        if ($sickStart->lt($earliestSickLeave)) {
            $sickStart = $earliestSickLeave;
        }
        $this->upsertLeave($employee, [
            'leave_type' => 'Sick Leave',
            'start_date' => $sickStart,
            'days_count' => 1,
            'reason' => 'Medical appointment and recovery',
            'status' => 'approved',
            'approved_by' => $approver->id,
        ]);

        $pendingStart = $today->copy()->addDays(10 + ($index * 2));
        $this->upsertLeave($employee, [
            'leave_type' => 'Annual Leave',
            'start_date' => $pendingStart,
            'days_count' => 2,
            'reason' => 'Planned family visit',
            'status' => 'pending',
            'approved_by' => null,
        ]);

        $rejectedStart = $today->copy()->subDays(8 + $index);
        $this->upsertLeave($employee, [
            'leave_type' => 'Unpaid Leave',
            'start_date' => $rejectedStart,
            'days_count' => 1,
            'reason' => 'Personal errand during peak workload',
            'status' => 'rejected',
            'approved_by' => $approver->id,
            'rejection_reason' => 'Insufficient staffing coverage on the requested date',
        ]);
    }

    private function upsertLeave(Employee $employee, array $data): void
    {
        $leave = Leave::withTrashed()->firstOrNew([
            'employee_id' => $employee->id,
            'leave_type' => $data['leave_type'],
            'reason' => $data['reason'],
        ]);

        $startDate = $data['start_date']->copy();
        $leave->fill([
            'start_date' => $startDate->toDateString(),
            'end_date' => $startDate->addDays($data['days_count'] - 1)->toDateString(),
            'days_count' => $data['days_count'],
            'status' => $data['status'],
            'approved_by' => $data['approved_by'],
            'rejection_reason' => $data['rejection_reason'] ?? null,
        ]);
        $leave->save();

        if ($leave->trashed()) {
            $leave->restore();
        }
    }

    private function seedOvertime(Employee $employee, int $index, Carbon $today, User $approver): void
    {
        $requests = [
            [
                'date' => $today->copy()->subDays(6 + $index),
                'start_time' => '18:00',
                'end_time' => '20:30',
                'hours' => 2.5,
                'reason' => 'Month-end reporting support',
                'status' => 'approved',
                'approved_by' => $approver->id,
            ],
            [
                'date' => $today->copy()->subDays(20 + $index),
                'start_time' => '18:00',
                'end_time' => '20:00',
                'hours' => 2,
                'reason' => 'Urgent client document preparation',
                'status' => 'approved',
                'approved_by' => $approver->id,
            ],
            [
                'date' => $today->copy()->addDays(3 + $index),
                'start_time' => '18:00',
                'end_time' => '19:30',
                'hours' => 1.5,
                'reason' => 'Planned system data verification',
                'status' => $index % 3 === 0 ? 'rejected' : 'pending',
                'approved_by' => $index % 3 === 0 ? $approver->id : null,
            ],
        ];

        foreach ($requests as $data) {
            $overtime = Overtime::withTrashed()->firstOrNew([
                'employee_id' => $employee->id,
                'reason' => $data['reason'],
            ]);
            $overtime->fill([
                'date' => $data['date']->toDateString(),
                'start_time' => $data['start_time'],
                'end_time' => $data['end_time'],
                'hours' => $data['hours'],
                'status' => $data['status'],
                'approved_by' => $data['approved_by'],
            ]);
            $overtime->save();

            if ($overtime->trashed()) {
                $overtime->restore();
            }
        }
    }

    private function seedPayslips(Employee $employee, int $index, Carbon $today): void
    {
        $basicSalary = (float) $employee->basic_salary;
        $joiningDate = Carbon::parse($employee->joining_date)->startOfDay();

        // Earlier seeder versions created six months for everyone. Archive any
        // synthetic payslip whose pay period ended before employment started.
        Payslip::where('employee_id', $employee->id)
            ->get()
            ->each(function (Payslip $payslip) use ($joiningDate): void {
                $periodEnd = Carbon::create(
                    (int) $payslip->year,
                    (int) $payslip->month,
                    1
                )->endOfMonth();

                if ($periodEnd->lt($joiningDate)) {
                    $payslip->delete();
                }
            });

        for ($monthsAgo = 5; $monthsAgo >= 0; $monthsAgo--) {
            $period = $today->copy()->startOfMonth()->subMonths($monthsAgo);
            if ($period->copy()->endOfMonth()->lt($joiningDate)) {
                continue;
            }

            $overtimeAmount = 15 + (($index * 5 + $monthsAgo * 7) % 30);
            $allowances = 25 + (($index % 4) * 5);
            $attendanceBonus = ($index + $monthsAgo) % 4 === 0 ? 15 : 0;
            $deductions = 10 + ($index % 5);
            $advanceDeduction = ($index + $monthsAgo) % 7 === 0 ? 20 : 0;
            $status = 'paid';
            $netSalary = $basicSalary
                + $overtimeAmount
                + $allowances
                + $attendanceBonus
                - $deductions
                - $advanceDeduction;

            $payslip = Payslip::withTrashed()->firstOrNew([
                'employee_id' => $employee->id,
                'month' => $period->format('m'),
                'year' => $period->format('Y'),
            ]);
            $payslip->fill([
                'basic_salary' => $basicSalary,
                'overtime_amount' => $overtimeAmount,
                'commission' => $index % 3 === 0 ? 15 : 0,
                'attendance_bonus' => $attendanceBonus,
                'allowances' => $allowances,
                'advance_deduction' => $advanceDeduction,
                'unpaid_leave_deduction' => 0,
                'deductions' => $deductions,
                'net_salary' => $netSalary + ($index % 3 === 0 ? 15 : 0),
                'status' => $status,
                'notes' => 'Monthly payroll processed and reviewed by Finance',
                'requires_signature' => true,
                'is_signed' => true,
                'signed_at' => $period->copy()->day(min(24, $period->daysInMonth))->endOfDay(),
            ]);

            $createdAt = $period->copy()->day(min(25, $period->daysInMonth))->endOfDay();
            if ($createdAt->isFuture()) {
                $createdAt = $today->copy()->endOfDay();
            }
            $payslip->created_at = $createdAt;
            $payslip->save();

            if ($payslip->trashed()) {
                $payslip->restore();
            }
        }
    }

    private function adjustHengCamarySalary(): void
    {
        $employee = Employee::with('user')
            ->get()
            ->first(function (Employee $candidate): bool {
                $names = [
                    strtolower(trim($candidate->first_name . ' ' . $candidate->last_name)),
                    strtolower(trim($candidate->last_name . ' ' . $candidate->first_name)),
                    strtolower(trim((string) $candidate->user?->name)),
                ];

                return in_array('heng camary', $names, true)
                    || in_array('camary heng', $names, true);
            });

        if (!$employee) {
            $this->command?->warn('Heng Camary was not found; no existing employee salary was changed.');
            return;
        }

        $employee->update(['basic_salary' => 600]);

        Payslip::where('employee_id', $employee->id)
            ->where('basic_salary', 0)
            ->each(function (Payslip $payslip): void {
                $basicSalary = 600;
                $netSalary = $basicSalary
                    + (float) $payslip->overtime_amount
                    + (float) $payslip->commission
                    + (float) $payslip->attendance_bonus
                    + (float) $payslip->allowances
                    - (float) $payslip->advance_deduction
                    - (float) $payslip->unpaid_leave_deduction
                    - (float) $payslip->deductions;

                $payslip->update([
                    'basic_salary' => $basicSalary,
                    'net_salary' => max(0, $netSalary),
                ]);
            });

        $this->command?->line('Heng Camary salary normalized to $600; zero-value payslips recalculated.');
    }

    private function seedTasks(Employee $employee, int $index, Carbon $today, User $assigner): void
    {
        $tasks = [
            [
                'title' => 'Update monthly department records',
                'description' => 'Review the department tracker and submit verified monthly figures.',
                'status' => 'completed',
                'priority' => 'high',
                'due_date' => $today->copy()->subDays(12 + $index),
                'submission_note' => 'Completed and figures cross-checked with source documents.',
            ],
            [
                'title' => 'Prepare weekly activity summary',
                'description' => 'Summarize completed work, blockers, and next-week priorities.',
                'status' => 'in_progress',
                'priority' => 'medium',
                'due_date' => $today->copy()->addDays(4 + ($index % 4)),
                'submission_note' => null,
            ],
            [
                'title' => 'Verify assigned company asset',
                'description' => 'Confirm the asset tag, condition, and current physical location.',
                'status' => 'pending',
                'priority' => 'low',
                'due_date' => $today->copy()->addDays(10 + ($index % 5)),
                'submission_note' => null,
            ],
        ];

        foreach ($tasks as $data) {
            $task = Task::withTrashed()->firstOrNew([
                'assigned_to' => $employee->id,
                'title' => $data['title'],
            ]);
            $task->fill([
                'description' => $data['description'],
                'assigned_by' => $assigner->id,
                'status' => $data['status'],
                'priority' => $data['priority'],
                'due_date' => $data['due_date']->toDateString(),
                'submission_note' => $data['submission_note'],
            ]);
            $task->save();

            if ($task->trashed()) {
                $task->restore();
            }
        }
    }

    private function seedLifecycle(Employee $employee, int $index, Carbon $today, User $creator): void
    {
        $joiningDate = Carbon::parse($employee->joining_date);
        $contractType = match (true) {
            $index === 9 => 'probation',
            $index >= 7 => 'fixed_term',
            default => 'permanent',
        };

        $endDate = match ($contractType) {
            'probation' => $today->copy()->addDays(21)->toDateString(),
            'fixed_term' => $today->copy()->addMonths(6 + ($index - 7))->toDateString(),
            default => null,
        };

        Contract::updateOrCreate(
            ['employee_id' => $employee->id, 'type' => $contractType],
            [
                'start_date' => $joiningDate->toDateString(),
                'end_date' => $endDate,
                'status' => 'active',
                'notes' => 'Standard employment contract issued by Human Resources',
            ]
        );

        EmployeeEvent::updateOrCreate(
            [
                'employee_id' => $employee->id,
                'type' => 'salary_change',
                'notes' => 'Annual performance and salary review',
            ],
            [
                'old_value' => number_format(max(0, (float) $employee->basic_salary - 50), 2, '.', ''),
                'new_value' => number_format((float) $employee->basic_salary, 2, '.', ''),
                'effective_date' => $this->realisticSalaryReviewDate($joiningDate, $today),
                'created_by' => $creator->id,
            ]
        );
    }

    private function seedAsset(Employee $employee, int $index, Carbon $today): void
    {
        $number = str_pad((string) ($index + 1), 3, '0', STR_PAD_LEFT);
        $isPhone = $index >= 8;
        $assetNumber = str_pad((string) (101 + $index), 3, '0', STR_PAD_LEFT);
        $assetCode = $isPhone ? "HC-PH-{$assetNumber}" : "HC-LT-{$assetNumber}";
        $legacyAssetCode = $isPhone ? "DEMO-PH-{$number}" : "DEMO-LT-{$number}";

        $asset = Asset::withTrashed()
            ->whereIn('code', [$assetCode, $legacyAssetCode])
            ->first();
        if (!$asset) {
            $asset = new Asset(['code' => $assetCode]);
        } elseif ($asset->trashed()) {
            $asset->restore();
        }

        $asset->fill([
            'code' => $assetCode,
            'name' => $isPhone ? 'Samsung Galaxy A55' : 'Dell Latitude 5440',
            'category' => $isPhone ? 'phone' : 'laptop',
            'serial_no' => 'HC-2026-' . $number,
            'purchase_date' => $today->copy()->subMonths(8 + $index)->toDateString(),
            'purchase_cost' => $isPhone ? 420 : 950,
            'status' => 'assigned',
            'condition' => $index % 4 === 0 ? 'new' : 'good',
            'notes' => 'Company equipment issued for operational use',
        ]);
        $asset->save();

        $joiningDate = Carbon::parse($employee->joining_date)->startOfDay();
        $assignedAt = $today->copy()->subDays(45 + ($index * 4));
        if ($assignedAt->lt($joiningDate)) {
            $assignedAt = $joiningDate->copy()->addDays(3);
        }

        AssetAssignment::updateOrCreate(
            [
                'asset_id' => $asset->id,
                'employee_id' => $employee->id,
                'returned_at' => null,
            ],
            [
                'assigned_at' => $assignedAt->toDateString(),
                'notes' => 'Issued for daily work',
            ]
        );
    }

    private function realisticSalaryReviewDate(Carbon $joiningDate, Carbon $today): string
    {
        $reviewDate = $joiningDate->copy()->addMonths(2)->startOfDay();
        if ($reviewDate->gt($today)) {
            $reviewDate = $today->copy();
        }

        return $reviewDate->toDateString();
    }

    private function localTimeToUtc(Carbon $date, string $time): string
    {
        return Carbon::createFromFormat(
            'Y-m-d H:i:s',
            $date->toDateString() . ' ' . $time,
            self::TIMEZONE
        )->utc()->toDateTimeString();
    }

    private function profiles(): array
    {
        return [
            [
                'employee_code' => 'EMP007',
                'legacy_code' => 'DEMO001',
                'first_name' => 'Dara',
                'last_name' => 'Sok',
                'name_kh' => 'សុខ ដារ៉ា',
                'email' => 'dara.sok.henchen@gmail.com',
                'legacy_emails' => ['dara.sok@henchen.com.kh', 'dara.sok.demo@henchen.test'],
                'phone' => '012410201',
                'gender' => 'Male',
                'dob' => '1994-03-12',
                'joining_date' => '2025-12-01',
                'department' => 'Human Resources',
                'job_title' => 'HR Officer',
                'basic_salary' => 500,
                'address' => 'Boeung Keng Kang, Phnom Penh, Cambodia',
                'marital_status' => 'Married',
                'emergency_contact' => 'Sok Sopheak (+855 12 610 201)',
            ],
            [
                'employee_code' => 'EMP008',
                'legacy_code' => 'DEMO002',
                'first_name' => 'Sreyneang',
                'last_name' => 'Chan',
                'name_kh' => 'ចាន់ ស្រីនាង',
                'email' => 'sreyneang.chan.henchen@gmail.com',
                'legacy_emails' => ['sreyneang.chan@henchen.com.kh', 'sreyneang.chan.demo@henchen.test'],
                'phone' => '015410202',
                'gender' => 'Female',
                'dob' => '1996-08-25',
                'joining_date' => '2025-12-15',
                'department' => 'Finance',
                'job_title' => 'Senior Accountant',
                'basic_salary' => 650,
                'address' => 'Tuol Kork, Phnom Penh, Cambodia',
                'marital_status' => 'Single',
                'emergency_contact' => 'Chan Sophal (+855 15 610 202)',
            ],
            [
                'employee_code' => 'EMP009',
                'legacy_code' => 'DEMO003',
                'first_name' => 'Piseth',
                'last_name' => 'Chea',
                'name_kh' => 'ជា ពិសិដ្ឋ',
                'email' => 'piseth.chea.henchen@gmail.com',
                'legacy_emails' => ['piseth.chea@henchen.com.kh', 'piseth.chea.demo@henchen.test'],
                'phone' => '016410203',
                'gender' => 'Male',
                'dob' => '1993-11-04',
                'joining_date' => '2026-01-05',
                'department' => 'Information Technology',
                'job_title' => 'Software Developer',
                'basic_salary' => 750,
                'address' => 'Sen Sok, Phnom Penh, Cambodia',
                'marital_status' => 'Married',
                'emergency_contact' => 'Chea Vicheka (+855 16 610 203)',
            ],
            [
                'employee_code' => 'EMP010',
                'legacy_code' => 'DEMO004',
                'first_name' => 'Sophea',
                'last_name' => 'Lim',
                'name_kh' => 'លឹម សុភា',
                'email' => 'sophea.lim.henchen@gmail.com',
                'legacy_emails' => ['sophea.lim@henchen.com.kh', 'sophea.lim.demo@henchen.test'],
                'phone' => '017410204',
                'gender' => 'Female',
                'dob' => '1997-01-19',
                'joining_date' => '2026-01-19',
                'department' => 'Operations',
                'job_title' => 'Operations Coordinator',
                'basic_salary' => 500,
                'address' => 'Chbar Ampov, Phnom Penh, Cambodia',
                'marital_status' => 'Single',
                'emergency_contact' => 'Lim Sokun (+855 17 610 204)',
            ],
            [
                'employee_code' => 'EMP011',
                'legacy_code' => 'DEMO005',
                'first_name' => 'Vannak',
                'last_name' => 'Heng',
                'name_kh' => 'ហេង វណ្ណៈ',
                'email' => 'vannak.heng.henchen@gmail.com',
                'legacy_emails' => ['vannak.heng@henchen.com.kh', 'vannak.heng.demo@henchen.test'],
                'phone' => '018410205',
                'gender' => 'Male',
                'dob' => '1992-06-07',
                'joining_date' => '2026-02-02',
                'department' => 'Sales',
                'job_title' => 'Sales Executive',
                'basic_salary' => 550,
                'address' => 'Daun Penh, Phnom Penh, Cambodia',
                'marital_status' => 'Married',
                'emergency_contact' => 'Heng Sreymao (+855 18 610 205)',
            ],
            [
                'employee_code' => 'EMP012',
                'legacy_code' => 'DEMO006',
                'first_name' => 'Sreypov',
                'last_name' => 'Touch',
                'name_kh' => 'ទូច ស្រីពៅ',
                'email' => 'sreypov.touch.henchen@gmail.com',
                'legacy_emails' => ['sreypov.touch@henchen.com.kh', 'sreypov.touch.demo@henchen.test'],
                'phone' => '060410206',
                'gender' => 'Female',
                'dob' => '1998-12-15',
                'joining_date' => '2026-02-16',
                'department' => 'Marketing',
                'job_title' => 'Digital Marketing Officer',
                'basic_salary' => 500,
                'address' => 'Mean Chey, Phnom Penh, Cambodia',
                'marital_status' => 'Single',
                'emergency_contact' => 'Touch Ravy (+855 60 610 206)',
            ],
            [
                'employee_code' => 'EMP013',
                'legacy_code' => 'DEMO007',
                'first_name' => 'Ratha',
                'last_name' => 'Yim',
                'name_kh' => 'យឹម រដ្ឋា',
                'email' => 'ratha.yim.henchen@gmail.com',
                'legacy_emails' => ['ratha.yim@henchen.com.kh', 'ratha.yim.demo@henchen.test'],
                'phone' => '069410207',
                'gender' => 'Male',
                'dob' => '1995-05-30',
                'joining_date' => '2026-03-02',
                'department' => 'Procurement',
                'job_title' => 'Procurement Officer',
                'basic_salary' => 480,
                'address' => 'Por Sen Chey, Phnom Penh, Cambodia',
                'marital_status' => 'Married',
                'emergency_contact' => 'Yim Sovan (+855 69 610 207)',
            ],
            [
                'employee_code' => 'EMP014',
                'legacy_code' => 'DEMO008',
                'first_name' => 'Sokha',
                'last_name' => 'Keo',
                'name_kh' => 'កែវ សុខា',
                'email' => 'sokha.keo.henchen@gmail.com',
                'legacy_emails' => ['sokha.keo@henchen.com.kh', 'sokha.keo.demo@henchen.test'],
                'phone' => '070410208',
                'gender' => 'Female',
                'dob' => '1999-02-10',
                'joining_date' => '2026-03-23',
                'department' => 'Administration',
                'job_title' => 'Administrative Assistant',
                'basic_salary' => 400,
                'address' => 'Russey Keo, Phnom Penh, Cambodia',
                'marital_status' => 'Single',
                'emergency_contact' => 'Keo Chantha (+855 70 610 208)',
            ],
            [
                'employee_code' => 'EMP015',
                'legacy_code' => 'DEMO009',
                'first_name' => 'Bopha',
                'last_name' => 'Meas',
                'name_kh' => 'មាស បុប្ផា',
                'email' => 'bopha.meas.henchen@gmail.com',
                'legacy_emails' => ['bopha.meas@henchen.com.kh', 'bopha.meas.demo@henchen.test'],
                'phone' => '071410209',
                'gender' => 'Female',
                'dob' => '1997-09-22',
                'joining_date' => '2026-04-06',
                'department' => 'Customer Service',
                'job_title' => 'Customer Service Officer',
                'basic_salary' => 420,
                'address' => 'Kamboul, Phnom Penh, Cambodia',
                'marital_status' => 'Single',
                'emergency_contact' => 'Meas Sreymom (+855 71 610 209)',
            ],
            [
                'employee_code' => 'EMP016',
                'legacy_code' => 'DEMO010',
                'first_name' => 'Visal',
                'last_name' => 'Ouk',
                'name_kh' => 'អ៊ុក វិសាល',
                'email' => 'visal.ouk.henchen@gmail.com',
                'legacy_emails' => ['visal.ouk@henchen.com.kh', 'visal.ouk.demo@henchen.test'],
                'phone' => '076410210',
                'gender' => 'Male',
                'dob' => '2000-04-18',
                'joining_date' => '2026-05-04',
                'department' => 'Information Technology',
                'job_title' => 'IT Support Technician',
                'basic_salary' => 450,
                'address' => 'Dangkao, Phnom Penh, Cambodia',
                'marital_status' => 'Single',
                'emergency_contact' => 'Ouk Kimsan (+855 76 610 210)',
            ],
        ];
    }
}

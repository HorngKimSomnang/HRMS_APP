<?php

namespace Tests\Feature;

use App\Models\AssetAssignment;
use App\Models\Attendance;
use App\Models\Contract;
use App\Models\Employee;
use App\Models\EmployeeEvent;
use App\Models\Leave;
use App\Models\Overtime;
use App\Models\Payslip;
use App\Models\Task;
use App\Models\User;
use App\Support\HrCatalog;
use Database\Seeders\RolePermissionSeeder;
use Database\Seeders\ThesisCambodianEmployeesSeeder;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class ThesisCambodianEmployeesSeederTest extends TestCase
{
    use DatabaseTransactions;

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_it_adds_complete_demo_employees_without_duplication(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-07-27 12:00:00', 'Asia/Phnom_Penh'));
        $this->seed(RolePermissionSeeder::class);

        $admin = User::factory()->create();
        $admin->assignRole('Super Admin');

        $hengUser = User::factory()->create([
            'name' => 'Heng Camary',
            'email' => 'heng.camary@gmail.com',
        ]);
        $hengUser->assignRole('Employee');
        $hengCamary = Employee::factory()->for($hengUser)->create([
            'first_name' => 'Heng',
            'last_name' => 'Camary',
            'job_title' => 'Administrator',
            'joining_date' => '2026-01-05',
            'basic_salary' => 0,
        ]);
        $hengPayslip = Payslip::create([
            'employee_id' => $hengCamary->id,
            'month' => now()->format('m'),
            'year' => now()->format('Y'),
            'basic_salary' => 0,
            'allowances' => 25,
            'deductions' => 5,
            'net_salary' => 20,
            'status' => 'paid',
        ]);
        $hengAttendance = Attendance::create([
            'employee_id' => $hengCamary->id,
            'date' => '2026-07-24',
            'clock_in' => Carbon::parse('2026-07-24 08:01:00', 'Asia/Phnom_Penh')->utc(),
            'clock_out' => Carbon::parse('2026-07-24 16:49:00', 'Asia/Phnom_Penh')->utc(),
            'status' => 'present',
            'address' => 'Khan Chamkar Mon, Phnom Penh, Cambodia',
            'latitude' => '11.5480',
            'longitude' => '104.9210',
        ]);
        $lateAttendance = Attendance::create([
            'employee_id' => $hengCamary->id,
            'date' => '2026-07-23',
            'clock_in' => Carbon::parse('2026-07-23 08:50:00', 'Asia/Phnom_Penh')->utc(),
            'clock_out' => Carbon::parse('2026-07-23 16:58:00', 'Asia/Phnom_Penh')->utc(),
            'status' => 'present',
            'is_late' => false,
            'address' => 'Khan Chamkar Mon, Phnom Penh, Cambodia',
            'latitude' => '11.5480',
            'longitude' => '104.9210',
        ]);
        $otherExistingEmployees = Employee::factory()
            ->count(5)
            ->create([
                'joining_date' => '2026-01-05',
                'status' => 'active',
            ]);
        $originalTestEmployeeIds = $otherExistingEmployees
            ->pluck('id')
            ->push($hengCamary->id);

        $existingEmployeeCount = Employee::count();

        $this->seed(ThesisCambodianEmployeesSeeder::class);

        $originalEmployees = Employee::whereBetween('employee_code', ['EMP007', 'EMP016'])
            ->orderBy('employee_code')
            ->get();
        $originalIds = $originalEmployees->pluck('id')->all();

        // Recreate the identifiers used by the first deployed version, then
        // confirm a rerun normalizes those same rows instead of duplicating them.
        $originalEmployees->each(function (Employee $employee, int $index): void {
            $employee->update([
                'employee_code' => 'DEMO' . str_pad((string) ($index + 1), 3, '0', STR_PAD_LEFT),
            ]);
            $employee->user->update([
                'email' => str_replace('.henchen@gmail.com', '@henchen.com.kh', $employee->user->email),
            ]);
        });

        $this->seed(ThesisCambodianEmployeesSeeder::class);

        $employees = Employee::whereBetween('employee_code', ['EMP007', 'EMP016'])
            ->orderBy('employee_code')
            ->get();
        $employeeIds = $employees->pluck('id');

        $this->assertCount(10, $employees);
        $this->assertSame($originalIds, $employeeIds->all());
        $this->assertSame($existingEmployeeCount + 10, Employee::count());
        $this->assertSame(10, User::where('email', 'like', '%.henchen@gmail.com')->count());
        $this->assertSame('600.00', $hengCamary->fresh()->basic_salary);
        $this->assertSame('600.00', $hengPayslip->fresh()->basic_salary);
        $this->assertSame('620.00', $hengPayslip->fresh()->net_salary);
        $this->assertStringStartsWith('Norton University', $hengAttendance->fresh()->address);
        $this->assertSame('early_out', $hengAttendance->fresh()->status);
        $this->assertStringContainsString(
            'pending HR review',
            $hengAttendance->fresh()->early_out_reason
        );
        $this->assertSame('late', $lateAttendance->fresh()->status);
        $this->assertTrue($lateAttendance->fresh()->is_late);
        $this->assertNotEmpty($lateAttendance->fresh()->late_reason);
        $this->assertSame('08:00:00', HrCatalog::findShiftById(1)['start_time']);
        $this->assertSame('16:55:00', HrCatalog::findShiftById(1)['end_time']);
        $hengAttendanceHistory = Attendance::where(
            'employee_id',
            $hengCamary->id
        )->get();
        $this->assertGreaterThan(100, $hengAttendanceHistory->count());
        $this->assertLessThan(
            0.1,
            $hengAttendanceHistory->where('status', 'absent')->count()
                / $hengAttendanceHistory->count()
        );
        $this->assertDatabaseHas('attendances', [
            'employee_id' => $hengCamary->id,
            'date' => '2026-07-25',
        ]);
        $july25OriginalEmployeeAttendance = Attendance::whereIn(
            'employee_id',
            $originalTestEmployeeIds
        )->whereDate('date', '2026-07-25')->get();
        $this->assertCount(6, $july25OriginalEmployeeAttendance);
        $this->assertLessThanOrEqual(
            1,
            $july25OriginalEmployeeAttendance->where('status', 'absent')->count()
        );
        $this->assertSame(40, Leave::whereIn('employee_id', $employeeIds)->count());
        $this->assertSame(30, Overtime::whereIn('employee_id', $employeeIds)->count());
        $this->assertSame(53, Payslip::whereIn('employee_id', $employeeIds)->count());
        $this->assertSame(30, Task::whereIn('assigned_to', $employeeIds)->count());
        $this->assertSame(10, Contract::whereIn('employee_id', $employeeIds)->count());
        $this->assertSame(10, EmployeeEvent::whereIn('employee_id', $employeeIds)->count());
        $this->assertSame(10, AssetAssignment::whereIn('employee_id', $employeeIds)->count());
        $this->assertGreaterThanOrEqual(
            1000,
            Attendance::whereIn('employee_id', $employeeIds)->count()
        );
        $this->assertSame(
            10,
            Attendance::whereIn('employee_id', $employeeIds)
                ->whereDate('date', '2026-07-27')
                ->count()
        );
        $this->assertTrue(
            Attendance::whereIn('employee_id', $employeeIds)
                ->whereIn('status', ['present', 'late', 'early_out', 'absent'])
                ->distinct()
                ->count('status') === 4
        );
        $locatedAttendances = Attendance::whereIn('employee_id', $employeeIds)
            ->whereIn('status', ['present', 'late', 'early_out']);
        $this->assertSame(
            (clone $locatedAttendances)->count(),
            (clone $locatedAttendances)->where('address', 'like', 'Norton University%')->count()
        );
        $this->assertSame(
            0,
            (clone $locatedAttendances)
                ->whereNotBetween('latitude', [11.58800, 11.58850])
                ->count()
        );
        $this->assertSame(
            0,
            (clone $locatedAttendances)
                ->whereNotBetween('longitude', [104.93050, 104.93110])
                ->count()
        );
        $invalidClockOuts = Attendance::whereIn('employee_id', $employeeIds)
            ->whereIn('status', ['present', 'late'])
            ->get()
            ->filter(function (Attendance $attendance): bool {
                $clockOut = Carbon::parse(
                    $attendance->getRawOriginal('clock_out'),
                    'UTC'
                )->setTimezone('Asia/Phnom_Penh');
                $minutes = ($clockOut->hour * 60) + $clockOut->minute;

                return $minutes < (16 * 60 + 55) || $minutes > (17 * 60 + 5);
            });
        $this->assertSame(
            0,
            $invalidClockOuts->count(),
            $invalidClockOuts
                ->take(3)
                ->map(fn (Attendance $attendance) => $attendance->getRawOriginal('clock_out'))
                ->implode(', ')
        );
        $invalidNormalClockIns = Attendance::whereIn('employee_id', $employeeIds)
            ->whereIn('status', ['present', 'early_out'])
            ->get()
            ->filter(function (Attendance $attendance): bool {
                $clockIn = Carbon::parse(
                    $attendance->getRawOriginal('clock_in'),
                    'UTC'
                )->setTimezone('Asia/Phnom_Penh');
                $minutes = ($clockIn->hour * 60) + $clockIn->minute;

                return $minutes < (7 * 60 + 55) || $minutes > (8 * 60 + 8);
            });
        $this->assertSame(0, $invalidNormalClockIns->count());
        $invalidLateClockIns = Attendance::whereIn('employee_id', $employeeIds)
            ->where('status', 'late')
            ->get()
            ->filter(function (Attendance $attendance): bool {
                $clockIn = Carbon::parse(
                    $attendance->getRawOriginal('clock_in'),
                    'UTC'
                )->setTimezone('Asia/Phnom_Penh');
                $minutes = ($clockIn->hour * 60) + $clockIn->minute;

                return $minutes < (8 * 60 + 16) || $minutes > (8 * 60 + 28);
            });
        $this->assertSame(0, $invalidLateClockIns->count());
        $this->assertGreaterThan(
            1,
            Attendance::whereIn('employee_id', $employeeIds)
                ->where('status', 'late')
                ->distinct()
                ->count('late_reason')
        );
        $currentDayAttendances = Attendance::whereIn('employee_id', $employeeIds)
            ->whereDate('date', '2026-07-27')
            ->get();
        $this->assertGreaterThanOrEqual(
            1,
            $currentDayAttendances->where('status', 'early_out')->count()
        );
        $this->assertGreaterThanOrEqual(
            1,
            $currentDayAttendances
                ->whereIn('status', ['present', 'late'])
                ->filter(function (Attendance $attendance): bool {
                    return Carbon::parse(
                        $attendance->getRawOriginal('clock_out'),
                        'UTC'
                    )->setTimezone('Asia/Phnom_Penh')->format('H:i') === '16:55';
                })
                ->count()
        );
        $this->assertGreaterThanOrEqual(
            1,
            $currentDayAttendances
                ->whereIn('status', ['present', 'late'])
                ->filter(function (Attendance $attendance): bool {
                    return Carbon::parse(
                        $attendance->getRawOriginal('clock_out'),
                        'UTC'
                    )->setTimezone('Asia/Phnom_Penh')->format('H:i') > '16:55';
                })
                ->count()
        );
        $this->assertSame(20, Leave::whereIn('employee_id', $employeeIds)->where('status', 'approved')->count());
        $this->assertSame(10, Leave::whereIn('employee_id', $employeeIds)->where('status', 'pending')->count());
        $this->assertSame(10, Leave::whereIn('employee_id', $employeeIds)->where('status', 'rejected')->count());
        $this->assertSame(20, Overtime::whereIn('employee_id', $employeeIds)->where('status', 'approved')->count());
        $this->assertSame(6, Overtime::whereIn('employee_id', $employeeIds)->where('status', 'pending')->count());
        $this->assertSame(4, Overtime::whereIn('employee_id', $employeeIds)->where('status', 'rejected')->count());
        $this->assertSame(53, Payslip::whereIn('employee_id', $employeeIds)->where('status', 'paid')->count());
        $this->assertSame(53, Payslip::whereIn('employee_id', $employeeIds)->where('requires_signature', true)->count());
        $this->assertSame(53, Payslip::whereIn('employee_id', $employeeIds)->where('is_signed', true)->count());
        $this->assertSame(0, Payslip::whereIn('employee_id', $employeeIds)->whereNull('signed_at')->count());
        $this->assertSame(10, Task::whereIn('assigned_to', $employeeIds)->where('status', 'completed')->count());
        $this->assertSame(10, Task::whereIn('assigned_to', $employeeIds)->where('status', 'in_progress')->count());
        $this->assertSame(10, Task::whereIn('assigned_to', $employeeIds)->where('status', 'pending')->count());

        $employees->each(function (Employee $employee): void {
            $this->assertNotEmpty($employee->documents['name_kh'] ?? null);
            $this->assertNotEmpty($employee->department);
            $this->assertNotEmpty($employee->job_title);
            $this->assertNotEmpty($employee->basic_salary);
            $this->assertLessThanOrEqual(750, (float) $employee->basic_salary);
            $this->assertSame(
                0,
                Attendance::where('employee_id', $employee->id)
                    ->whereDate('date', '<', $employee->joining_date)
                    ->count()
            );
            $this->assertSame(
                0,
                Payslip::where('employee_id', $employee->id)
                    ->get()
                    ->filter(function (Payslip $payslip) use ($employee): bool {
                        return Carbon::create(
                            (int) $payslip->year,
                            (int) $payslip->month,
                            1
                        )->endOfMonth()->lt($employee->joining_date);
                    })
                    ->count()
            );

            $approvedLeaveDates = [];
            Leave::where('employee_id', $employee->id)
                ->where('status', 'approved')
                ->get()
                ->each(function (Leave $leave) use (&$approvedLeaveDates): void {
                    for (
                        $date = Carbon::parse($leave->start_date)->startOfDay();
                        $date->lte(Carbon::parse($leave->end_date)->startOfDay());
                        $date->addDay()
                    ) {
                        if (!$date->isSunday()) {
                            $approvedLeaveDates[$date->toDateString()] = true;
                        }
                    }
                });

            $expectedAttendanceDays = 0;
            for (
                $date = Carbon::parse($employee->joining_date)->startOfDay();
                $date->lte(Carbon::parse('2026-07-27')->startOfDay());
                $date->addDay()
            ) {
                if (!$date->isSunday() && !isset($approvedLeaveDates[$date->toDateString()])) {
                    $expectedAttendanceDays++;
                }
            }

            $this->assertSame(
                $expectedAttendanceDays,
                Attendance::where('employee_id', $employee->id)->count()
            );
        });
        $this->assertSame('2025-12-01', $employees->min('joining_date')->toDateString());
        $this->assertSame('2026-05-04', $employees->max('joining_date')->toDateString());
    }
}

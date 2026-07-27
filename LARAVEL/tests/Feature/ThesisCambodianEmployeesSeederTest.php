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
        $this->assertTrue(
            Attendance::whereIn('employee_id', $employeeIds)
                ->whereIn('status', ['present', 'late', 'early_out', 'absent'])
                ->distinct()
                ->count('status') === 4
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
        });
        $this->assertSame('2025-12-01', $employees->min('joining_date')->toDateString());
        $this->assertSame('2026-05-04', $employees->max('joining_date')->toDateString());
    }
}

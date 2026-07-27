<?php

namespace Tests\Feature;

use App\Models\Announcement;
use App\Models\Attendance;
use App\Models\Employee;
use App\Models\Leave;
use App\Models\User;
use App\Services\AttendanceReconciliationService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class AttendanceReconciliationTest extends TestCase
{
    use DatabaseTransactions;

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_it_marks_missing_check_ins_absent_without_overriding_valid_exceptions(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-07-27 12:00:00', 'Asia/Phnom_Penh'));

        $employee = Employee::factory()->create([
            'joining_date' => '2026-07-20',
            'status' => 'active',
        ]);
        $futureEmployee = Employee::factory()->create([
            'joining_date' => '2026-07-25',
            'status' => 'active',
        ]);
        Employee::factory()->create([
            'joining_date' => '2026-07-20',
            'status' => 'terminated',
        ]);

        Attendance::create([
            'employee_id' => $employee->id,
            'date' => '2026-07-21',
            'clock_in' => Carbon::parse('2026-07-21 08:02', 'Asia/Phnom_Penh')->utc(),
            'clock_out' => Carbon::parse('2026-07-21 16:56', 'Asia/Phnom_Penh')->utc(),
            'status' => 'present',
        ]);
        Leave::create([
            'employee_id' => $employee->id,
            'leave_type' => 'Annual Leave',
            'start_date' => '2026-07-22',
            'end_date' => '2026-07-22',
            'days_count' => 1,
            'reason' => 'Approved family commitment',
            'status' => 'approved',
        ]);
        Announcement::create([
            'type' => 'Holiday',
            'title' => 'Company Holiday',
            'content' => 'Office closed.',
            'start_date' => '2026-07-23',
            'end_date' => '2026-07-23',
            'is_published' => true,
            'created_by' => User::factory()->create()->id,
        ]);

        $result = app(AttendanceReconciliationService::class)
            ->backfillActiveEmployeesThrough('2026-07-26');

        $this->assertSame(2, $result['absences_created']);
        $this->assertDatabaseHas('attendances', [
            'employee_id' => $employee->id,
            'date' => '2026-07-20',
            'status' => 'absent',
        ]);
        $this->assertDatabaseHas('attendances', [
            'employee_id' => $employee->id,
            'date' => '2026-07-24',
            'status' => 'absent',
        ]);
        $this->assertDatabaseMissing('attendances', [
            'employee_id' => $employee->id,
            'date' => '2026-07-22',
        ]);
        $this->assertDatabaseMissing('attendances', [
            'employee_id' => $employee->id,
            'date' => '2026-07-23',
        ]);
        $this->assertSame(
            'present',
            Attendance::where('employee_id', $employee->id)
                ->whereDate('date', '2026-07-21')
                ->value('status')
        );
        $this->assertSame(
            0,
            Attendance::where('employee_id', $futureEmployee->id)->count()
        );
    }

    public function test_command_marks_missing_checkouts_and_missing_checkins(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-07-27 00:05:00', 'Asia/Phnom_Penh'));

        $checkedInEmployee = Employee::factory()->create([
            'joining_date' => '2026-07-01',
            'status' => 'active',
        ]);
        $absentEmployee = Employee::factory()->create([
            'joining_date' => '2026-07-01',
            'status' => 'active',
        ]);
        $attendance = Attendance::create([
            'employee_id' => $checkedInEmployee->id,
            'date' => '2026-07-24',
            'clock_in' => Carbon::parse('2026-07-24 08:04', 'Asia/Phnom_Penh')->utc(),
            'clock_out' => null,
            'status' => 'present',
        ]);

        $this->artisan('attendance:mark-missing-checkouts', ['--date' => '2026-07-24'])
            ->assertSuccessful();

        $this->assertSame('warning', $attendance->fresh()->status);
        $this->assertDatabaseHas('attendances', [
            'employee_id' => $absentEmployee->id,
            'date' => '2026-07-24',
            'status' => 'absent',
        ]);
    }
}

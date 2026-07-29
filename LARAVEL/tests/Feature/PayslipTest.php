<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;
use App\Models\User;
use App\Models\Employee;
use Database\Seeders\RolePermissionSeeder;

class PayslipTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
    }

    public function test_net_salary_is_calculated_correctly()
    {
        $admin = User::factory()->create();
        $admin->assignRole('Super Admin');

        $employee = Employee::factory()->create();

        $response = $this->actingAs($admin, 'sanctum')->postJson('/api/payslips', [
            'employee_id' => $employee->id,
            'month' => '07',
            'year' => '2026',
            'basic_salary' => 1000,
            'overtime_amount' => 150,
            'commission' => 50,
            'attendance_bonus' => 25,
            'allowances' => 75,
            'advance_deduction' => 100,
            'unpaid_leave_deduction' => 40,
            'deductions' => 10,
        ]);

        // 1000 + 150 + 50 + 25 + 75 - 100 - 40 - 10 = 1150
        $response->assertStatus(201);
        $this->assertDatabaseHas('payslips', [
            'employee_id' => $employee->id,
            'month' => '07',
            'year' => '2026',
            'net_salary' => 1150,
            'status' => 'draft',
            'requires_signature' => false,
        ]);
    }

    public function test_employee_cannot_generate_payslips()
    {
        $user = User::factory()->create();
        $user->assignRole('Employee');
        $employee = Employee::factory()->create(['user_id' => $user->id]);

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/payslips', [
            'employee_id' => $employee->id,
            'month' => '07',
            'year' => '2026',
            'basic_salary' => 1000,
        ]);

        $response->assertStatus(403);
        $this->assertDatabaseMissing('payslips', ['employee_id' => $employee->id]);
    }

    public function test_employee_can_only_see_own_payslips()
    {
        $userA = User::factory()->create();
        $userA->assignRole('Employee');
        $employeeA = Employee::factory()->create(['user_id' => $userA->id]);

        $userB = User::factory()->create();
        $userB->assignRole('Employee');
        $employeeB = Employee::factory()->create(['user_id' => $userB->id]);

        \App\Models\Payslip::create([
            'employee_id' => $employeeA->id, 'month' => '07', 'year' => '2026',
            'basic_salary' => 500, 'net_salary' => 500, 'status' => 'paid',
        ]);
        \App\Models\Payslip::create([
            'employee_id' => $employeeB->id, 'month' => '07', 'year' => '2026',
            'basic_salary' => 800, 'net_salary' => 800, 'status' => 'paid',
        ]);

        $response = $this->actingAs($userA, 'sanctum')->getJson('/api/payslips');

        $response->assertStatus(200);
        $ids = collect($response->json())->pluck('employee_id')->all();
        $this->assertEquals([$employeeA->id], $ids);
    }

    public function test_employee_cannot_see_a_payslip_until_it_is_marked_paid()
    {
        $user = User::factory()->create();
        $user->assignRole('Employee');
        $employee = Employee::factory()->create(['user_id' => $user->id]);

        $payslip = \App\Models\Payslip::create([
            'employee_id' => $employee->id,
            'month' => '08',
            'year' => '2026',
            'basic_salary' => 600,
            'net_salary' => 600,
            'status' => 'draft',
        ]);

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/payslips')
            ->assertOk()
            ->assertExactJson([]);

        $payslip->update(['status' => 'paid']);

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/payslips')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', $payslip->id);
    }

    public function test_admin_can_mark_a_draft_payslip_paid_after_offline_management_review()
    {
        $admin = User::factory()->create();
        $admin->assignRole('Admin');
        $employee = Employee::factory()->create();
        $payslip = \App\Models\Payslip::create([
            'employee_id' => $employee->id,
            'month' => '08',
            'year' => '2026',
            'basic_salary' => 600,
            'net_salary' => 600,
            'status' => 'draft',
        ]);

        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/payslips/{$payslip->id}", ['status' => 'paid'])
            ->assertOk();

        $this->assertDatabaseHas('payslips', [
            'id' => $payslip->id,
            'status' => 'paid',
        ]);
    }
}

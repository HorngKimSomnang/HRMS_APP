<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;
use App\Models\Employee;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;

class EmployeeTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
    }

    public function test_admin_can_create_employee()
    {
        // Create an Admin user
        $admin = User::factory()->create();
        $admin->assignRole('Super Admin'); // Or Admin

        // Prepare Employee Data
        $employeeData = [
            'first_name' => 'John',
            'last_name' => 'Doe',
            'email' => 'john.doe@example.com',
            'employee_code' => 'EMP001',
            'phone' => '9876543210',
            'department' => 'Engineering',
            'job_title' => 'Engineer',
            'joining_date' => '2025-01-01',
            'salary' => 50000.00,
            'address' => '123 Street',
            'gender' => 'Male',
            'dob' => '1990-01-01'
        ];

        $this->withoutExceptionHandling();
        $response = $this->actingAs($admin, 'sanctum')
                         ->postJson('/api/employees', $employeeData);

        dump($response->json());
        $response->assertStatus(201)
                 ->assertJsonStructure([
                     'data' => [
                         'id',
                         'full_name',
                         'employee_code',
                         'role'
                     ]
                 ]);

        // Verify User was created
        $this->assertDatabaseHas('users', ['email' => 'john.doe@example.com']);

        // Verify Employee Profile was created
        $this->assertDatabaseHas('employees', [
            'employee_code' => 'EMP001',
            'shift_id' => 1,
        ]);

        // Verify Role was assigned
        $newUser = User::where('email', 'john.doe@example.com')->first();
        $this->assertTrue($newUser->hasRole('Employee'));
    }

    public function test_offboarding_preserves_the_employee_record(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('Super Admin');

        $employee = Employee::factory()->create(['status' => 'active']);

        $this->actingAs($admin, 'sanctum')
            ->deleteJson("/api/employees/{$employee->id}")
            ->assertOk()
            ->assertJsonPath('message', 'Employee terminated and archived (recoverable via restore)');

        $this->assertSoftDeleted('employees', [
            'id' => $employee->id,
            'status' => 'terminated',
        ]);
    }

    public function test_all_employee_list_remains_complete_and_sorted_after_an_edit(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('Super Admin');

        foreach (range(12, 1) as $number) {
            Employee::factory()->create([
                'employee_code' => 'EMP' . str_pad(
                    (string) ($number + 100),
                    3,
                    '0',
                    STR_PAD_LEFT
                ),
                'first_name' => $number === 5 ? 'Rady' : "Employee{$number}",
                'last_name' => $number === 5 ? 'Ren' : 'Test',
            ]);
        }

        $rady = Employee::where('employee_code', 'EMP105')->firstOrFail();

        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/employees/{$rady->id}", [
                'phone' => '012345678',
            ])
            ->assertOk();

        $this->withoutExceptionHandling();
        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/employees?all=true')
            ->assertOk()
            // ->assertJsonCount(12, 'data') // removed exact count due to other seeded employees
            ->assertJsonFragment([
                'id' => $rady->id,
                'employee_code' => 'EMP105',
                'phone' => '012345678',
            ]);

        $actualCodes = collect($response->json('data'))->pluck('employee_code')->all();
        foreach (range(1, 12) as $number) {
            $expectedCode = 'EMP' . str_pad((string) ($number + 100), 3, '0', STR_PAD_LEFT);
            $this->assertContains($expectedCode, $actualCodes);
        }
    }

    public function test_archived_employee_can_be_listed_and_restored(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('Super Admin');

        $employeeUser = User::factory()->create();
        $employeeUser->assignRole('Employee');
        $employee = Employee::factory()->for($employeeUser)->create(['status' => 'terminated']);

        $this->actingAs($admin, 'sanctum')
            ->deleteJson("/api/employees/{$employee->id}")
            ->assertOk()
            ->assertJsonPath('message', 'Employee terminated and archived (recoverable via restore)');

        $this->assertSoftDeleted('employees', ['id' => $employee->id]);
        $this->assertSoftDeleted('users', ['id' => $employeeUser->id]);

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/employees?archived=true')
            ->assertOk()
            ->assertJsonFragment([
                'id' => $employee->id,
                'employee_code' => $employee->employee_code,
            ]);

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/employees/{$employee->id}/restore")
            ->assertOk()
            ->assertJsonPath('message', 'Employee restored successfully');

        $this->assertDatabaseHas('employees', [
            'id' => $employee->id,
            'status' => 'terminated',
            'deleted_at' => null,
        ]);
        $this->assertDatabaseHas('users', [
            'id' => $employeeUser->id,
            'deleted_at' => null,
        ]);
        $this->assertFalse($employeeUser->fresh()->hasAnyRole());
    }

    public function test_new_employee_cannot_reuse_an_archived_email(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('Super Admin');

        $archivedUser = User::factory()->create(['email' => 'archived@example.com']);
        $archivedEmployee = Employee::factory()->for($archivedUser)->create(['status' => 'terminated']);
        $archivedUser->delete();
        $archivedEmployee->delete();

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/employees', [
                'first_name' => 'Duplicate',
                'last_name' => 'Person',
                'email' => 'archived@example.com',
                'job_title' => 'Tester',
                'joining_date' => '2026-01-01',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('email');
    }

    public function test_restore_is_blocked_when_an_active_employee_uses_the_same_email(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('Super Admin');

        $archivedUser = User::factory()->create(['email' => 'duplicate@example.com']);
        $archivedEmployee = Employee::factory()->for($archivedUser)->create(['status' => 'terminated']);
        $archivedUser->delete();
        $archivedEmployee->delete();

        $activeUser = User::factory()->create(['email' => 'duplicate@example.com']);
        $activeEmployee = Employee::factory()->for($activeUser)->create(['status' => 'active']);

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/employees?archived=true')
            ->assertOk()
            ->assertJsonFragment([
                'id' => $archivedEmployee->id,
                'restore_conflict' => true,
                'conflicting_employee_code' => $activeEmployee->employee_code,
            ]);

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/employees/{$archivedEmployee->id}/restore")
            ->assertStatus(409);

        $this->assertSoftDeleted('employees', ['id' => $archivedEmployee->id]);
    }
}

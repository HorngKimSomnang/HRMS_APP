<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class UserControllerTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
    }

    public function test_super_admin_can_change_admin_to_employee_without_changing_identity(): void
    {
        $boss = User::factory()->create([
            'name' => 'Super Admin Henchen',
            'email' => 'superadmin@example.com',
        ]);
        $boss->assignRole('Super Admin');

        $admin = User::factory()->create([
            'name' => 'Heng Camary',
            'email' => 'camary@example.com',
        ]);
        $admin->assignRole('Admin');

        $response = $this->actingAs($boss, 'sanctum')
            ->putJson("/api/users/{$admin->id}", [
                'role' => 'Employee',
            ]);

        $response
            ->assertOk()
            ->assertJsonPath('data.id', $admin->id)
            ->assertJsonPath('data.name', 'Heng Camary')
            ->assertJsonPath('data.email', 'camary@example.com')
            ->assertJsonPath('data.roles.0.name', 'Employee');

        $this->assertTrue($admin->fresh()->hasRole('Employee'));
        $this->assertFalse($admin->fresh()->hasRole('Admin'));
    }

    public function test_super_admin_can_promote_existing_employee_to_admin(): void
    {
        $boss = User::factory()->create([
            'name' => 'Heng Camary',
            'email' => 'boss@example.com',
        ]);
        $boss->assignRole('Super Admin');

        $employee = User::factory()->create([
            'name' => 'Chan Sreyneang',
            'email' => 'sreyneang.chan@example.com',
        ]);
        $employee->assignRole('Employee');
        $originalPassword = $employee->password;

        $response = $this->actingAs($boss, 'sanctum')
            ->postJson('/api/users', [
                'user_id' => $employee->id,
                'role' => 'Admin',
            ]);

        $response
            ->assertOk()
            ->assertJsonPath('data.id', $employee->id)
            ->assertJsonPath('data.name', 'Chan Sreyneang')
            ->assertJsonPath('data.email', 'sreyneang.chan@example.com')
            ->assertJsonPath('data.roles.0.name', 'Admin');

        $employee->refresh();
        $this->assertTrue($employee->hasRole('Admin'));
        $this->assertFalse($employee->hasRole('Employee'));
        $this->assertSame($originalPassword, $employee->password);
    }

    public function test_admin_cannot_create_or_change_administrator_role(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('Admin');

        $target = User::factory()->create();
        $target->assignRole('Admin');

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/users', [
                'user_id' => $target->id,
                'role' => 'Admin',
            ])
            ->assertForbidden();

        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/users/{$target->id}", [
                'role' => 'Employee',
            ])
            ->assertForbidden();

        $this->assertTrue($target->fresh()->hasRole('Admin'));
        $this->assertFalse($target->fresh()->hasRole('Employee'));
    }

    public function test_all_user_dropdown_includes_employees_but_admin_list_does_not(): void
    {
        $boss = User::factory()->create();
        $boss->assignRole('Super Admin');

        $employee = User::factory()->create();
        $employee->assignRole('Employee');

        $this->actingAs($boss, 'sanctum')
            ->getJson('/api/users')
            ->assertOk()
            ->assertJsonMissing(['id' => $employee->id]);

        $this->actingAs($boss, 'sanctum')
            ->getJson('/api/users?all=1')
            ->assertOk()
            ->assertJsonFragment([
                'id' => $employee->id,
                'email' => $employee->email,
            ]);
    }

    public function test_last_super_admin_cannot_be_demoted(): void
    {
        // Ensure there are no other Super Admins
        foreach (User::role('Super Admin')->get() as $admin) {
            $admin->removeRole('Super Admin');
        }

        $boss = User::factory()->create();
        $boss->assignRole('Super Admin');

        $this->actingAs($boss, 'sanctum')
            ->putJson("/api/users/{$boss->id}", ['role' => 'Employee'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('role');

        $this->assertTrue($boss->fresh()->hasRole('Super Admin'));
    }
}

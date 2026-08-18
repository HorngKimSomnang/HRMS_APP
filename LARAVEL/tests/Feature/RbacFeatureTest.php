<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;
use App\Models\User;
use App\Models\Employee;
use App\Models\Department;
use App\Models\Contract;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;
use Illuminate\Support\Facades\DB;
use App\Models\AuditLog;
use Illuminate\Support\Facades\Artisan;

class RbacFeatureTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        // Ensure roles/permissions are seeded if not present
        if (Role::count() === 0) {
            Artisan::call('db:seed', ['--class' => 'RolesAndPermissionsSeeder']);
        }
        
        // Ensure features migration ran
        if (DB::table('features')->count() === 0) {
            Artisan::call('migrate');
        }
    }

    public function test_departments_crud()
    {
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole('Super Admin');

        // Create
        $response = $this->actingAs($superAdmin)->postJson('/api/departments', [
            'name' => 'Test Dept',
            'description' => 'Test Desc'
        ]);
        $response->assertStatus(201);
        $deptId = $response->json('id');
        $this->assertDatabaseHas('departments', ['id' => $deptId, 'name' => 'Test Dept']);

        // Delete with employees should fail
        $employeeUser = User::factory()->create();
        Employee::create([
            'user_id' => $employeeUser->id,
            'department_id' => $deptId,
            'employee_code' => 'TEST001',
            'first_name' => 'A',
            'last_name' => 'B',
            'status' => 'active'
        ]);

        $deleteResponse = $this->actingAs($superAdmin)->deleteJson("/api/departments/{$deptId}");
        $deleteResponse->assertStatus(422);
        $deleteResponse->assertJsonFragment(['message' => 'Cannot delete department because 1 employee(s) are still assigned to it.']);

        // Delete without employees should pass
        Employee::where('department_id', $deptId)->delete();
        $deleteResponse2 = $this->actingAs($superAdmin)->deleteJson("/api/departments/{$deptId}");
        $deleteResponse2->assertStatus(200);
        $this->assertDatabaseMissing('departments', ['id' => $deptId]);
    }

    public function test_promotion_flow_transaction_integrity()
    {
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole('Super Admin');

        $user = User::factory()->create();
        $user->assignRole('Employee');
        $employee = Employee::create([
            'user_id' => $user->id,
            'employee_code' => 'TEST002',
            'first_name' => 'Target',
            'last_name' => 'User',
            'status' => 'active'
        ]);
        $dept = Department::create(['name' => 'Marketing']);
        
        $permission = Permission::firstOrCreate(['name' => 'employees.view', 'guard_name' => 'web']);

        \Illuminate\Support\Facades\Notification::fake();

        $response = $this->actingAs($superAdmin)->postJson('/api/employees/promote', [
            'employee_id' => $employee->id,
            'role_name' => 'Marketing Lead',
            'department_ids' => [$dept->id],
            'permissions' => ['employees.view'],
            'salary' => 5000,
            'type' => 'permanent',
            'start_date' => now()->toDateString(),
            'position' => 'Marketing Lead'
        ]);

        $response->assertStatus(200);

        // Asserts
        $this->assertDatabaseHas('roles', ['name' => 'Marketing Lead']);
        $this->assertTrue($user->fresh()->hasRole('Employee'));
        $this->assertTrue($user->fresh()->hasRole('Marketing Lead'));
        $this->assertTrue($user->fresh()->hasPermissionTo('employees.view', 'web'));
        $this->assertFalse($user->fresh()->hasPermissionTo('employees.edit', 'web')); // spot-check
        
        $this->assertDatabaseHas('department_manager', ['user_id' => $user->id, 'department_id' => $dept->id]);
        
        $this->assertDatabaseHas('contracts', [
            'employee_id' => $employee->id,
            'status' => 'active',
            'position' => 'Marketing Lead'
        ]);

        \Illuminate\Support\Facades\Notification::assertSentTo($user, \App\Notifications\RolePromotedNotification::class);

        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $superAdmin->id,
            'action' => 'promoted_employee',
            'model_id' => $user->id
        ]);
    }

    public function test_promotion_failure_rolls_back()
    {
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole('Super Admin');
        $user = User::factory()->create();
        $employee = Employee::create([
            'user_id' => $user->id,
            'employee_code' => 'TEST003',
            'first_name' => 'Target',
            'last_name' => 'User',
            'status' => 'active'
        ]);

        // missing start_date
        $response = $this->actingAs($superAdmin)->postJson('/api/employees/promote', [
            'employee_id' => $employee->id,
            'role_name' => 'Failing Role',
            'permissions' => [],
            'salary' => 5000,
            'type' => 'permanent',
            'position' => 'Failing'
        ]);

        $response->assertStatus(422);
        $this->assertDatabaseMissing('roles', ['name' => 'Failing Role']);
        $this->assertDatabaseMissing('contracts', ['position' => 'Failing']);
    }

    public function test_revoke_flow_actor_paths()
    {
        // Setup users
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole('Super Admin');

        $managerRole = Role::firstOrCreate(['name' => 'ManagerRole', 'guard_name' => 'web']);
        $managerRole->givePermissionTo(Permission::firstOrCreate(['name' => 'roles.revoke_team', 'guard_name' => 'web']));
        app()->make(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();
        $managerUser = User::factory()->create();
        $managerUser->assignRole($managerRole);
        $deptA = Department::create(['name' => 'Dept A']);
        $deptB = Department::create(['name' => 'Dept B']);
        $managerUser->managedDepartments()->attach($deptA->id);

        $targetUser1 = User::factory()->create();
        Role::firstOrCreate(['name' => 'SomeCustomRole', 'guard_name' => 'web']);
        $targetUser1->assignRole('SomeCustomRole');
        $targetUser1->createToken('test-token');
        
        $employee = Employee::create([
            'user_id' => $targetUser1->id,
            'employee_code' => 'TEST004',
            'first_name' => 'Target',
            'last_name' => 'User',
            'department_id' => $deptA->id
        ]);

        // Test B: Manager revoke, valid scope
        $response = $this->actingAs($managerUser)->postJson("/api/employees/{$employee->id}/revoke-role", [
            'role_name' => 'SomeCustomRole'
        ]);
        $response->assertStatus(200);
        $this->assertFalse($targetUser1->fresh()->hasRole('SomeCustomRole'));
        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $managerUser->id,
            'role' => 'Manager',
            'action' => 'revoked_role',
            'model_id' => $targetUser1->id
        ]);
        $this->assertEquals(0, $targetUser1->tokens()->count());

        // Test C: Manager revoke, invalid scope
        $targetUser2 = User::factory()->create();
        Role::firstOrCreate(['name' => 'SomeCustomRole2', 'guard_name' => 'web']);
        $targetUser2->assignRole('SomeCustomRole2');
        $employee2 = Employee::create([
            'user_id' => $targetUser2->id,
            'employee_code' => 'TEST005',
            'first_name' => 'Target2',
            'last_name' => 'User2',
            'department_id' => $deptB->id
        ]);
        
        $response = $this->actingAs($managerUser)->postJson("/api/employees/{$employee2->id}/revoke-role", [
            'role_name' => 'SomeCustomRole2'
        ]);
        $response->assertStatus(403);
        $this->assertTrue($targetUser2->fresh()->hasRole('SomeCustomRole2'));
        


        // Test A: Super Admin revoke (should always work regardless of department)
        $response = $this->actingAs($superAdmin)->postJson("/api/employees/{$employee2->id}/revoke-role", [
            'role_name' => 'SomeCustomRole2'
        ]);
        $response->assertStatus(200);
        $this->assertFalse($targetUser2->fresh()->hasRole('SomeCustomRole2'));
        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $superAdmin->id,
            'role' => 'Super Admin',
            'action' => 'revoked_role',
            'model_id' => $targetUser2->id
        ]);
        
        // Test D: Protected roles
        $response = $this->actingAs($superAdmin)->postJson("/api/employees/{$employee2->id}/revoke-role", [
            'role_name' => 'Employee'
        ]);
        $response->assertStatus(400);

        // Manager tries to revoke from super admin
        $saEmployee = Employee::create([
            'user_id' => $superAdmin->id,
            'employee_code' => 'SA001',
            'first_name' => 'SA',
            'last_name' => 'SA',
            'department_id' => $deptA->id
        ]);
        $response = $this->actingAs($managerUser)->postJson("/api/employees/{$saEmployee->id}/revoke-role", [
            'role_name' => 'Super Admin'
        ]);
        $response->assertStatus(403);
    }
    
    public function test_permission_seeding_is_correct()
    {
        $features = DB::table('features')->get();
        $this->assertNotEmpty($features);
        
        foreach ($features as $feature) {
            $view = DB::table('permissions')->where('name', $feature->key . '.view')->exists();
            $edit = DB::table('permissions')->where('name', $feature->key . '.edit')->exists();
            $delete = DB::table('permissions')->where('name', $feature->key . '.delete')->exists();
            
            $this->assertTrue($view, "Missing {$feature->key}.view");
            $this->assertTrue($edit, "Missing {$feature->key}.edit");
            $this->assertTrue($delete, "Missing {$feature->key}.delete");
        }
        
        $this->assertTrue(DB::table('permissions')->where('name', 'roles.revoke_team')->exists());
    }
}

<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;
use App\Models\User;
use App\Models\Employee;
use App\Models\Task;
use Database\Seeders\RolePermissionSeeder;

/**
 * Regression tests for a broken-access-control bug: TaskController::destroy()
 * had no authorization check at all, and update() could be tricked into the
 * unrestricted admin branch by including a "title" key in the request body.
 * Both are fixed in TaskController — these tests pin that fix in place.
 */
class TaskAuthorizationTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
    }

    private function makeTaskFor(Employee $employee, User $assignedBy): Task
    {
        return Task::create([
            'title' => 'Original title',
            'assigned_to' => $employee->id,
            'assigned_by' => $assignedBy->id,
            'priority' => 'low',
            'due_date' => now()->addDays(5),
            'status' => 'pending',
        ]);
    }

    public function test_employee_cannot_delete_another_employees_task()
    {
        $admin = User::factory()->create();
        $admin->assignRole('Super Admin');

        $ownerUser = User::factory()->create();
        $ownerUser->assignRole('Employee');
        $owner = Employee::factory()->create(['user_id' => $ownerUser->id]);
        $task = $this->makeTaskFor($owner, $admin);

        $attackerUser = User::factory()->create();
        $attackerUser->assignRole('Employee');
        Employee::factory()->create(['user_id' => $attackerUser->id]);

        $this->actingAs($attackerUser, 'sanctum')
             ->deleteJson("/api/tasks/{$task->id}")
             ->assertStatus(403);

        $this->assertDatabaseHas('tasks', ['id' => $task->id, 'deleted_at' => null]);
    }

    public function test_employee_cannot_update_another_employees_task_even_with_a_title_field()
    {
        $admin = User::factory()->create();
        $admin->assignRole('Super Admin');

        $ownerUser = User::factory()->create();
        $ownerUser->assignRole('Employee');
        $owner = Employee::factory()->create(['user_id' => $ownerUser->id]);
        $task = $this->makeTaskFor($owner, $admin);

        $attackerUser = User::factory()->create();
        $attackerUser->assignRole('Employee');
        Employee::factory()->create(['user_id' => $attackerUser->id]);

        // The original exploit: including a "title" key used to fall through
        // into the unrestricted admin-update branch with zero role check.
        $this->actingAs($attackerUser, 'sanctum')
             ->putJson("/api/tasks/{$task->id}", ['title' => 'HACKED', 'status' => 'completed'])
             ->assertStatus(403);

        $this->assertDatabaseHas('tasks', ['id' => $task->id, 'title' => 'Original title', 'status' => 'pending']);
    }

    public function test_employee_can_update_own_task_status()
    {
        $admin = User::factory()->create();
        $admin->assignRole('Super Admin');

        $ownerUser = User::factory()->create();
        $ownerUser->assignRole('Employee');
        $owner = Employee::factory()->create(['user_id' => $ownerUser->id]);
        $task = $this->makeTaskFor($owner, $admin);

        $this->actingAs($ownerUser, 'sanctum')
             ->putJson("/api/tasks/{$task->id}", ['status' => 'in_progress'])
             ->assertStatus(200);

        $this->assertDatabaseHas('tasks', ['id' => $task->id, 'status' => 'in_progress']);
    }

    public function test_admin_can_delete_any_task()
    {
        $admin = User::factory()->create();
        $admin->assignRole('Super Admin');

        $ownerUser = User::factory()->create();
        $ownerUser->assignRole('Employee');
        $owner = Employee::factory()->create(['user_id' => $ownerUser->id]);
        $task = $this->makeTaskFor($owner, $admin);

        $this->actingAs($admin, 'sanctum')
             ->deleteJson("/api/tasks/{$task->id}")
             ->assertStatus(200);

        $this->assertSoftDeleted('tasks', ['id' => $task->id]);
    }
}

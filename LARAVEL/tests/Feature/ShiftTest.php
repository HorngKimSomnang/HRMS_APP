<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class ShiftTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
    }

    public function test_super_admin_can_save_the_company_working_days(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('Super Admin');

        $workDays = [
            'Monday',
            'Tuesday',
            'Wednesday',
            'Thursday',
            'Friday',
            'Saturday',
        ];

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/shifts', [
                'name' => 'Norton University Schedule',
                'start_time' => '08:00',
                'end_time' => '16:55',
                'grace_period_minutes' => 15,
                'work_days' => $workDays,
            ])
            ->assertCreated()
            ->assertJsonPath('data.start_time', '08:00:00')
            ->assertJsonPath('data.end_time', '16:55:00')
            ->assertJsonPath('data.work_days', $workDays);
    }
}

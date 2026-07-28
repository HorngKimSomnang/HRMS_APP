<?php

namespace Tests\Feature;

use App\Models\CustomEntity;
use App\Models\CustomEntityField;
use App\Models\CustomEntityRecord;
use App\Models\Employee;
use App\Models\User;
use Carbon\Carbon;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class CustomEntityReportTest extends TestCase
{
    use DatabaseTransactions;

    public function test_admin_can_filter_a_custom_entity_report_by_employee_and_field(): void
    {
        $this->seed(RolePermissionSeeder::class);

        $admin = User::factory()->create();
        $admin->assignRole('Admin');

        $employeeUser = User::factory()->create(['name' => 'Sok Dara']);
        $employee = Employee::factory()->for($employeeUser)->create();
        $otherEmployeeUser = User::factory()->create(['name' => 'Chan Sreyneang']);
        Employee::factory()->for($otherEmployeeUser)->create();

        $entity = CustomEntity::create([
            'name' => 'Monthly Sales',
            'slug' => 'monthly-sales',
            'created_by' => $admin->id,
        ]);
        CustomEntityField::create([
            'custom_entity_id' => $entity->id,
            'key' => 'region',
            'label' => 'Region',
            'type' => 'dropdown',
            'options' => ['Phnom Penh', 'Siem Reap'],
            'sort_order' => 0,
        ]);
        CustomEntityField::create([
            'custom_entity_id' => $entity->id,
            'key' => 'amount',
            'label' => 'Amount',
            'type' => 'number',
            'sort_order' => 1,
        ]);

        $matching = CustomEntityRecord::create([
            'custom_entity_id' => $entity->id,
            'created_by' => $employeeUser->id,
            'data' => ['region' => 'Phnom Penh', 'amount' => 1250],
        ]);
        $matching->forceFill([
            'created_at' => Carbon::parse('2026-07-15 09:00:00'),
            'updated_at' => Carbon::parse('2026-07-15 09:00:00'),
        ])->save();

        $other = CustomEntityRecord::create([
            'custom_entity_id' => $entity->id,
            'created_by' => $otherEmployeeUser->id,
            'data' => ['region' => 'Siem Reap', 'amount' => 900],
        ]);
        $other->forceFill([
            'created_at' => Carbon::parse('2026-07-16 09:00:00'),
            'updated_at' => Carbon::parse('2026-07-16 09:00:00'),
        ])->save();

        $response = $this->actingAs($admin, 'sanctum')->getJson(
            '/api/reports/custom-entities?' . http_build_query([
                'entity_slug' => 'monthly-sales',
                'start_date' => '2026-07-01',
                'end_date' => '2026-07-31',
                'employee_id' => $employee->id,
                'field_key' => 'region',
                'field_value' => 'Phnom Penh',
            ])
        );

        $response
            ->assertOk()
            ->assertJsonPath('summary.total_records', 1)
            ->assertJsonPath('entity.slug', 'monthly-sales')
            ->assertJsonPath('fields.0.label', 'Region')
            ->assertJsonPath('data.0.id', $matching->id)
            ->assertJsonPath('data.0.creator.name', 'Sok Dara');
    }

    public function test_custom_entity_report_rejects_a_field_from_another_entity(): void
    {
        $this->seed(RolePermissionSeeder::class);

        $admin = User::factory()->create();
        $admin->assignRole('Admin');

        CustomEntity::create([
            'name' => 'Monthly Sales',
            'slug' => 'monthly-sales',
            'created_by' => $admin->id,
        ]);

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/reports/custom-entities?' . http_build_query([
                'entity_slug' => 'monthly-sales',
                'start_date' => '2026-07-01',
                'end_date' => '2026-07-31',
                'field_key' => 'not_a_real_field',
                'field_value' => 'anything',
            ]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('field_key');
    }
}

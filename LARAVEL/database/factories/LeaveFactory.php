<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Leave>
 */
class LeaveFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'employee_id' => \App\Models\Employee::factory(),
            'leave_type' => $this->faker->randomElement(['Annual Leave', 'Sick Leave', 'Unpaid Leave']),
            'start_date' => now(),
            'end_date' => now()->addDays(1),
            'days_count' => 2,
            'reason' => 'Test',
            'status' => 'pending',
        ];
    }
}

<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class MockDataSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Seed Departments
        $departments = [
            ['name' => 'Human Resources'],
            ['name' => 'Engineering'],
            ['name' => 'Marketing'],
            ['name' => 'Sales'],
            ['name' => 'Finance'],
            ['name' => 'Operations']
        ];
        foreach ($departments as $dept) {
            \App\Models\Department::firstOrCreate(['name' => $dept['name']]);
        }

        // 2. Seed Holidays (Stored as Announcements)
        $holidays = [
            [
                'title' => 'New Year\'s Day',
                'content' => 'Public Holiday for New Year',
                'type' => 'Holiday',
                'is_published' => true,
                'start_date' => now()->startOfYear()->toDateString(),
                'end_date' => now()->startOfYear()->toDateString(),
            ],
            [
                'title' => 'Khmer New Year',
                'content' => 'Khmer New Year Holidays',
                'type' => 'Holiday',
                'is_published' => true,
                'start_date' => now()->month(4)->day(13)->toDateString(),
                'end_date' => now()->month(4)->day(16)->toDateString(),
            ],
            [
                'title' => 'Labor Day',
                'content' => 'International Labor Day',
                'type' => 'Holiday',
                'is_published' => true,
                'start_date' => now()->month(5)->day(1)->toDateString(),
                'end_date' => now()->month(5)->day(1)->toDateString(),
            ],
        ];

        foreach ($holidays as $holiday) {
            \App\Models\Announcement::create(array_merge($holiday, [
                'created_by' => 1,
            ]));
        }

        // 3. Seed Assets
        $assets = [
            [
                'name' => 'MacBook Pro M2 14"',
                'code' => 'HC-LT-001',
                'category' => 'laptop',
                'serial_no' => 'C02ZG001MD6M',
                'status' => 'available',
                'purchase_date' => now()->subMonths(6)->toDateString(),
                'purchase_cost' => 1999.00,
            ],
            [
                'name' => 'Dell UltraSharp 27" 4K Monitor',
                'code' => 'HC-MN-001',
                'category' => 'other',
                'serial_no' => 'CN-0X1D3D-12345-123',
                'status' => 'available',
                'purchase_date' => now()->subMonths(3)->toDateString(),
                'purchase_cost' => 550.00,
            ],
            [
                'name' => 'Ergonomic Office Chair',
                'code' => 'HC-FN-001',
                'category' => 'furniture',
                'serial_no' => 'FURN-001',
                'status' => 'available',
                'purchase_date' => now()->subYear()->toDateString(),
                'purchase_cost' => 250.00,
            ],
            [
                'name' => 'iPhone 15 Pro',
                'code' => 'HC-PH-001',
                'category' => 'phone',
                'serial_no' => 'F2LW13ABCD',
                'status' => 'available',
                'purchase_date' => now()->subMonths(2)->toDateString(),
                'purchase_cost' => 999.00,
            ]
        ];

        foreach ($assets as $asset) {
            \App\Models\Asset::create($asset);
        }

        $this->command->info('Mock data for departments, holidays, and assets added successfully.');
    }
}

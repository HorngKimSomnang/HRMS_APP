<?php

namespace Database\Seeders;

use App\Models\Asset;
use App\Models\AssetAssignment;
use App\Models\Employee;
use Illuminate\Database\Seeder;

/**
 * Realistic office assets for a ~10-person family investment company.
 * Safe to re-run: existing asset codes are skipped (firstOrCreate).
 *
 * Run with: php artisan db:seed --class=AssetSeeder
 */
class AssetSeeder extends Seeder
{
    public function run(): void
    {
        $assets = [
            // Laptops (office staff)
            ['code' => 'HC-LT-001', 'name' => 'Dell Latitude 5440',      'category' => 'laptop',    'serial_no' => 'DL5440-8K2P1', 'purchase_date' => '2024-03-12', 'purchase_cost' => 950.00,  'condition' => 'good'],
            ['code' => 'HC-LT-002', 'name' => 'Dell Latitude 5440',      'category' => 'laptop',    'serial_no' => 'DL5440-8K2P2', 'purchase_date' => '2024-03-12', 'purchase_cost' => 950.00,  'condition' => 'good'],
            ['code' => 'HC-LT-003', 'name' => 'MacBook Air M2',          'category' => 'laptop',    'serial_no' => 'MBA-M2-77341', 'purchase_date' => '2025-01-20', 'purchase_cost' => 1250.00, 'condition' => 'new'],
            ['code' => 'HC-LT-004', 'name' => 'HP ProBook 450 G9',       'category' => 'laptop',    'serial_no' => 'HP450-CD881',  'purchase_date' => '2023-06-05', 'purchase_cost' => 780.00,  'condition' => 'fair'],

            // Desktops (accounting / front desk)
            ['code' => 'HC-PC-001', 'name' => 'HP ProDesk 400 Desktop',  'category' => 'equipment', 'serial_no' => 'HPPD-40021',   'purchase_date' => '2022-11-18', 'purchase_cost' => 620.00,  'condition' => 'good'],
            ['code' => 'HC-PC-002', 'name' => 'HP ProDesk 400 Desktop',  'category' => 'equipment', 'serial_no' => 'HPPD-40022',   'purchase_date' => '2022-11-18', 'purchase_cost' => 620.00,  'condition' => 'fair'],

            // Phones (management / sales)
            ['code' => 'HC-PH-001', 'name' => 'iPhone 15',               'category' => 'phone',     'serial_no' => 'IP15-90112',   'purchase_date' => '2024-10-02', 'purchase_cost' => 899.00,  'condition' => 'good'],
            ['code' => 'HC-PH-002', 'name' => 'Samsung Galaxy A55',      'category' => 'phone',     'serial_no' => 'SGA55-33874',  'purchase_date' => '2024-08-15', 'purchase_cost' => 420.00,  'condition' => 'good'],

            // Vehicles (company errands / director)
            ['code' => 'HC-VH-001', 'name' => 'Toyota Camry 2020',       'category' => 'vehicle',   'serial_no' => 'PP-2AC-4712',  'purchase_date' => '2021-02-25', 'purchase_cost' => 28500.00, 'condition' => 'good'],
            ['code' => 'HC-VH-002', 'name' => 'Honda Dream 125 Moto',    'category' => 'vehicle',   'serial_no' => 'PP-1MT-9903',  'purchase_date' => '2023-04-10', 'purchase_cost' => 1350.00,  'condition' => 'good'],

            // Office equipment & furniture
            ['code' => 'HC-EQ-001', 'name' => 'Canon MF445 Printer',     'category' => 'equipment', 'serial_no' => 'CNMF445-201',  'purchase_date' => '2022-09-01', 'purchase_cost' => 480.00,  'condition' => 'good'],
            ['code' => 'HC-EQ-002', 'name' => 'APC UPS 1500VA',          'category' => 'equipment', 'serial_no' => 'APC15-66120',  'purchase_date' => '2023-01-14', 'purchase_cost' => 260.00,  'condition' => 'good'],
            ['code' => 'HC-FN-001', 'name' => 'Meeting Room Table (8p)', 'category' => 'furniture', 'serial_no' => null,           'purchase_date' => '2021-05-30', 'purchase_cost' => 700.00,  'condition' => 'good'],
            ['code' => 'HC-FN-002', 'name' => 'Executive Desk Set',      'category' => 'furniture', 'serial_no' => null,           'purchase_date' => '2021-05-30', 'purchase_cost' => 550.00,  'condition' => 'good'],
        ];

        $created = [];
        foreach ($assets as $data) {
            $created[] = Asset::firstOrCreate(
                ['code' => $data['code']],
                $data + ['status' => 'available']
            );
        }

        // Assign one laptop + one phone per active employee (up to what's available),
        // so the dashboard "Assets In Use" and the holders column look real.
        $employees = Employee::where('status', 'active')->orderBy('id')->get();

        $assignables = collect($created)
            ->filter(fn ($a) => in_array($a->category, ['laptop', 'phone']) && $a->status === 'available' && !$a->currentAssignment)
            ->groupBy('category');

        foreach ($employees as $i => $employee) {
            foreach (['laptop', 'phone'] as $category) {
                $asset = $assignables->get($category)?->get($i);
                if (!$asset) {
                    continue;
                }
                AssetAssignment::firstOrCreate(
                    ['asset_id' => $asset->id, 'employee_id' => $employee->id, 'returned_at' => null],
                    ['assigned_at' => now()->subDays(rand(30, 300))->toDateString(), 'notes' => 'Issued for daily work']
                );
                $asset->update(['status' => 'assigned']);
            }
        }

        $this->command->info('Assets seeded: ' . count($created) . ' items, assignments created for ' . $employees->count() . ' employee(s).');
    }
}

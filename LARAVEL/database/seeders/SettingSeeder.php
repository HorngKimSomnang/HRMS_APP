<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Setting;

class SettingSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $settings = [
            // General Settings
            [
                'key' => 'company_name',
                'value' => 'HEN CHEN INVESTMENT CO.,LTD',
                'type' => 'text',
                'group' => 'general',
            ],
            [
                'key' => 'currency_symbol',
                'value' => '$',
                'type' => 'text',
                'group' => 'general',
            ],
            // Attendance Settings
            [
                'key' => 'work_start_time',
                'value' => '09:00',
                'type' => 'time',
                'group' => 'attendance',
            ],
            [
                'key' => 'late_grace_period_minutes',
                'value' => '15',
                'type' => 'number',
                'group' => 'attendance',
            ],
            [
                'key' => 'office_latitude',
                'value' => '11.5564', // Phnom Penh Default
                'type' => 'text',
                'group' => 'attendance',
            ],
            [
                'key' => 'office_longitude',
                'value' => '104.9282',
                'type' => 'text',
                'group' => 'attendance',
            ],
            [
                'key' => 'office_address',
                'value' => 'Norton University, St. Keo Chenda, Sangkat Chroy Changvar, Khan Chroy Changvar, Phnom Penh, Cambodia',
                'type' => 'text',
                'group' => 'attendance',
            ],
            [
                'key' => 'attendance_allowed_radius',
                'value' => '100', // 100 meters
                'type' => 'number',
                'group' => 'attendance',
            ],
        ];

        foreach ($settings as $setting) {
            Setting::updateOrCreate(
                ['key' => $setting['key']],
                $setting
            );
        }
    }
}

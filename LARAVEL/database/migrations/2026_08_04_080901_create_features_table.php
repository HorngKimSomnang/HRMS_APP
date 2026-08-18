<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('features', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->string('label');
            $table->timestamps();
        });

        $features = [
            ['key' => 'employees', 'label' => 'Employees'],
            ['key' => 'contracts', 'label' => 'Contracts'],
            ['key' => 'assets', 'label' => 'Assets'],
            ['key' => 'holidays', 'label' => 'Holidays'],
            ['key' => 'attendance', 'label' => 'Attendance'],
            ['key' => 'leaves', 'label' => 'Leaves'],
            ['key' => 'overtime', 'label' => 'Overtime Requests'],
            ['key' => 'documents', 'label' => 'Documents'],
            ['key' => 'tasks', 'label' => 'Tasks'],
            ['key' => 'payroll', 'label' => 'Payroll'],
            ['key' => 'reports', 'label' => 'Reports'],
        ];

        foreach ($features as $feature) {
            DB::table('features')->insert(array_merge($feature, ['created_at' => now(), 'updated_at' => now()]));
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('features');
    }
};

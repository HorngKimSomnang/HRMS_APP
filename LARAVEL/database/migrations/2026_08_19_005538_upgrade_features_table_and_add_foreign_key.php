<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Add section column
        Schema::table('features', function (Blueprint $table) {
            $table->string('section')->nullable()->after('key');
        });

        // 2. Clear out existing rows to insert the fresh 24 features
        // (Since no FK depends on features yet, it is safe to delete and re-insert)
        DB::table('features')->truncate();

        // 3. Re-insert all 24 features with their sections
        $sections = [
            'MAIN' => [
                'dashboard' => 'Dashboard',
                'notice_board' => 'Notice Board',
            ],
            'USER MANAGEMENT' => [
                'employees' => 'Employees',
                'roles' => 'Roles & Permissions',
                'permissions' => 'System Permissions',
            ],
            'ORGANIZATION' => [
                'departments' => 'Departments',
                'contracts' => 'Contracts',
                'assets' => 'Assets',
                'holidays' => 'Holidays',
            ],
            'OPERATIONS' => [
                'attendance' => 'Attendance',
                'leaves' => 'Leaves',
                'overtime' => 'Overtime',
                'documents' => 'Documents',
                'tasks' => 'Tasks',
            ],
            'FINANCE' => [
                'payroll' => 'Payroll',
            ],
            'REPORTS' => [
                'reports' => 'Reports',
            ],
            'SYSTEM CONTROLS' => [
                'admins' => 'Admins',
                'shifts' => 'Shifts',
                'audit_logs' => 'Audit Logs',
                'settings_general' => 'Settings (General)',
                'settings_attendance' => 'Settings (Attendance)',
                'settings_leaves' => 'Settings (Leaves)',
                'settings_payroll' => 'Settings (Payroll)',
                'settings_security' => 'Settings (Security)',
            ]
        ];

        $insertData = [];
        foreach ($sections as $section => $features) {
            foreach ($features as $key => $label) {
                $insertData[] = [
                    'key' => $key,
                    'section' => $section,
                    'label' => $label,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }
        }
        DB::table('features')->insert($insertData);

        // 4. Clean orphans from `permissions` table BEFORE adding FK
        $validKeys = array_map(function ($item) { return $item['key']; }, $insertData);
        // We delete any permissions whose feature is not in our known list
        DB::table('permissions')->whereNotIn('feature', $validKeys)->delete();

        // 5. Add Foreign Key to permissions table
        Schema::table('permissions', function (Blueprint $table) {
            $table->foreign('feature')
                  ->references('key')->on('features')
                  ->onUpdate('cascade')
                  ->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('permissions', function (Blueprint $table) {
            $table->dropForeign(['feature']);
        });

        Schema::table('features', function (Blueprint $table) {
            $table->dropUnique(['key']);
            $table->dropColumn('section');
        });
        
        // Note: Reversing this migration won't restore deleted orphans,
        // which is acceptable since they were invalid anyway.
    }
};

<?php

$dir = __DIR__ . '/database/migrations';
$files = scandir($dir);

$migrations = [];
foreach ($files as $file) {
    if (strpos($file, 'create_departments_table') !== false) $migrations['departments'] = $dir . '/' . $file;
    if (strpos($file, 'create_department_manager_table') !== false) $migrations['department_manager'] = $dir . '/' . $file;
    if (strpos($file, 'update_employees_for_department_id') !== false) $migrations['update_employees'] = $dir . '/' . $file;
    if (strpos($file, 'add_position_to_contracts_table') !== false) $migrations['add_position'] = $dir . '/' . $file;
    if (strpos($file, 'create_features_table') !== false) $migrations['features'] = $dir . '/' . $file;
}

$contents = [
    'departments' => <<<PHP
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('departments', function (Blueprint \$table) {
            \$table->id();
            \$table->string('name')->unique();
            \$table->text('description')->nullable();
            \$table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('departments');
    }
};
PHP,
    'department_manager' => <<<PHP
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('department_manager', function (Blueprint \$table) {
            \$table->id();
            \$table->foreignId('department_id')->constrained()->onDelete('cascade');
            \$table->foreignId('user_id')->constrained()->onDelete('cascade');
            \$table->timestamps();
            
            \$table->unique(['department_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('department_manager');
    }
};
PHP,
    'update_employees' => <<<PHP
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        \$departments = DB::table('employees')->whereNotNull('department')->pluck('department')->unique();
        foreach (\$departments as \$deptName) {
            if (\$deptName) {
                DB::table('departments')->insertOrIgnore([
                    'name' => \$deptName,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
        
        Schema::table('employees', function (Blueprint \$table) {
            \$table->unsignedBigInteger('department_id')->nullable();
        });

        \$employees = DB::table('employees')->get();
        foreach (\$employees as \$emp) {
            if (\$emp->department) {
                \$dept = DB::table('departments')->where('name', \$emp->department)->first();
                if (\$dept) {
                    DB::table('employees')->where('id', \$emp->id)->update(['department_id' => \$dept->id]);
                }
            }
        }

        Schema::table('employees', function (Blueprint \$table) {
            \$table->foreign('department_id')->references('id')->on('departments')->onDelete('set null');
            \$table->dropColumn('department');
        });
    }

    public function down(): void
    {
        Schema::table('employees', function (Blueprint \$table) {
            \$table->string('department')->nullable();
            \$table->dropForeign(['department_id']);
            \$table->dropColumn('department_id');
        });
    }
};
PHP,
    'add_position' => <<<PHP
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('contracts', function (Blueprint \$table) {
            \$table->string('position')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('contracts', function (Blueprint \$table) {
            \$table->dropColumn('position');
        });
    }
};
PHP,
    'features' => <<<PHP
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('features', function (Blueprint \$table) {
            \$table->id();
            \$table->string('key')->unique();
            \$table->string('label');
            \$table->timestamps();
        });

        \$features = [
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

        foreach (\$features as \$feature) {
            DB::table('features')->insert(array_merge(\$feature, ['created_at' => now(), 'updated_at' => now()]));
            
            \$actions = ['view', 'edit', 'delete'];
            foreach (\$actions as \$action) {
                \$permName = \$feature['key'] . '.' . \$action;
                if (!DB::table('permissions')->where('name', \$permName)->where('guard_name', 'web')->exists()) {
                    DB::table('permissions')->insert([
                        'name' => \$permName,
                        'guard_name' => 'web',
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('features');
    }
};
PHP
];

foreach ($migrations as $key => $file) {
    file_put_contents($file, $contents[$key]);
}
echo "Migrations populated successfully.";

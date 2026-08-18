<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use App\Models\Employee;
use App\Models\Attendance;
use App\Models\Leave;
use App\Models\Overtime;
use App\Models\Payslip;
use App\Models\Task;
use Illuminate\Support\Facades\DB;

$keepEmails = [
    'superadmin@gmail.com',
    'admin@gmail.com',
    'kimsomnang124@gmail.com'
];

$keepUserIds = User::whereIn('email', $keepEmails)->pluck('id')->toArray();
$keepEmployeeIds = Employee::whereIn('user_id', $keepUserIds)->pluck('id')->toArray();

// Delete everything not belonging to these users (force delete)
DB::statement("SET session_replication_role = 'replica';");

// Employees
Employee::whereNotIn('user_id', $keepUserIds)->forceDelete();

// User
User::whereNotIn('id', $keepUserIds)->forceDelete();

// Other tables
if (class_exists(Attendance::class)) Attendance::whereNotIn('employee_id', $keepEmployeeIds)->forceDelete();
if (class_exists(Leave::class)) Leave::whereNotIn('employee_id', $keepEmployeeIds)->forceDelete();
if (class_exists(Overtime::class)) Overtime::whereNotIn('employee_id', $keepEmployeeIds)->forceDelete();
if (class_exists(Payslip::class)) Payslip::whereNotIn('employee_id', $keepEmployeeIds)->forceDelete();

if (class_exists(Task::class)) {
    Task::whereNotIn('assigned_to', $keepEmployeeIds)->forceDelete();
}

DB::statement("SET session_replication_role = 'origin';");

echo "Database cleaned successfully. Kept users:\n" . implode("\n", User::pluck('email')->toArray()) . "\n";

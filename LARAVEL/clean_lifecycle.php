<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use App\Models\Employee;
use App\Models\Contract;
use App\Models\EmployeeEvent;
use App\Models\Offboarding;
use Illuminate\Support\Facades\DB;

$keepEmails = [
    'superadmin@gmail.com',
    'admin@gmail.com',
    'kimsomnang124@gmail.com'
];

$keepUserIds = User::whereIn('email', $keepEmails)->pluck('id')->toArray();
$keepEmployeeIds = Employee::whereIn('user_id', $keepUserIds)->pluck('id')->toArray();

DB::statement("SET session_replication_role = 'replica';");

if (class_exists(Contract::class)) Contract::whereNotIn('employee_id', $keepEmployeeIds)->forceDelete();
if (class_exists(EmployeeEvent::class)) EmployeeEvent::whereNotIn('employee_id', $keepEmployeeIds)->forceDelete();
if (class_exists(Offboarding::class)) Offboarding::whereNotIn('employee_id', $keepEmployeeIds)->forceDelete();

DB::statement("SET session_replication_role = 'origin';");

echo "Lifecycle tables cleaned successfully.\n";

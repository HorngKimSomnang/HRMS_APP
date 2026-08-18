<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$superAdmin = \App\Models\User::whereHas('role', function($q) { $q->where('name', 'Super Admin'); })->first();
$employee = \App\Models\User::whereHas('role', function($q) { $q->where('name', 'Employee'); })->first();

if(!$employee) { echo "No employee found\n"; exit; }

echo "--- Testing as Super Admin ---\n";
Auth::login($superAdmin);
echo "Employees visible: " . \App\Models\Employee::count() . "\n";
echo "Leaves visible: " . \App\Models\Leave::count() . "\n";

echo "\n--- Testing as Employee (" . $employee->email . ") ---\n";
Auth::login($employee);
echo "Employees visible: " . \App\Models\Employee::count() . "\n";
echo "Leaves visible: " . \App\Models\Leave::count() . "\n";

$managedDepts = $employee->managedDepartments()->count();
echo "Departments managed: " . $managedDepts . "\n";


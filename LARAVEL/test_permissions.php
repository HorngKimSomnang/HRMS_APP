<?php
require 'vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use App\Models\Employee;
use App\Models\Role;
use App\Models\Department;
use App\Models\Permission;
use Illuminate\Http\Request;
use App\Http\Controllers\Api\EmployeePermissionController;

// Setup
$superAdminRole = Role::where('name', 'Super Admin')->first();
$superAdmin = User::whereHas('role', fn($q) => $q->where('name', 'Super Admin'))->first();

$dept = Department::first();
$hrRole = Role::where('name', 'HR')->first();

// Create a non-super-admin user WITH manage_access
$manager = User::factory()->create();
$employee1 = Employee::factory()->create(['user_id' => $manager->id]);
$permId = Permission::where('feature', 'employees')->where('action', 'manage_access')->first()->id;
\DB::table('user_direct_permissions')->insert(['user_id' => $manager->id, 'permission_id' => $permId]);

// Create a target user
$target = User::factory()->create();
$employee2 = Employee::factory()->create(['user_id' => $target->id]);

// Test 3: non-Super-Admin WITH permission CAN bulk update
$request = Request::create("/api/employees/{$employee2->id}/permissions/bulk", 'POST', [
    'role_id' => $hrRole->id,
    'department_id' => $dept->id,
    'managed_departments' => []
]);
$request->setUserResolver(function () use ($manager) { return $manager; });

$controller = app(EmployeePermissionController::class);
try {
    $response = $controller->bulkUpdate($request, $employee2);
    echo "Test 3 (With Permission): " . ($response->getStatusCode() === 200 ? "SUCCESS\n" : "FAILED (Status: {$response->getStatusCode()})\n");
} catch (\Exception $e) {
    echo "Test 3 (With Permission): FAILED (" . $e->getMessage() . ")\n";
}

// Test 3: non-Super-Admin WITHOUT permission gets 403
$managerWithout = User::factory()->create();
$employee3 = Employee::factory()->create(['user_id' => $managerWithout->id]);
$request->setUserResolver(function () use ($managerWithout) { return $managerWithout; });

try {
    $response = $controller->bulkUpdate($request, $employee2);
    echo "Test 3 (Without Permission): FAILED (Did not throw 403, Status: {$response->getStatusCode()})\n";
} catch (\Symfony\Component\HttpKernel\Exception\HttpException $e) {
    echo "Test 3 (Without Permission): " . ($e->getStatusCode() === 403 ? "SUCCESS (Got 403)\n" : "FAILED (Got {$e->getStatusCode()})\n");
}

// Test 4: Super Admin department reduction
$saRequest = Request::create("/api/employees/{$superAdmin->employee->id}/permissions/bulk", 'POST', [
    'role_id' => $superAdminRole->id,
    'department_id' => $dept->id,
    'managed_departments' => [] // Attempt to strip departments!
]);
$saRequest->setUserResolver(function () use ($manager) { return $manager; });

try {
    $response = $controller->bulkUpdate($saRequest, $superAdmin->employee);
    echo "Test 4 (Super Admin dept reduction): FAILED (Did not throw error, Status: {$response->getStatusCode()})\n";
} catch (\Symfony\Component\HttpKernel\Exception\HttpException $e) {
    echo "Test 4 (Super Admin dept reduction): " . ($e->getStatusCode() === 403 ? "SUCCESS (Got 403: {$e->getMessage()})\n" : "FAILED (Got {$e->getStatusCode()})\n");
}


<?php
require 'vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use App\Models\Employee;
use App\Models\Role;
use App\Models\Department;
use Illuminate\Http\Request;
use App\Http\Controllers\Api\EmployeePermissionController;

$superAdmin = User::whereHas('role', fn($q) => $q->where('is_super_admin', true))->first();
$dept = Department::first();
$hrRole = Role::where('name', 'HR')->first();

$target = User::factory()->create();
$employee = Employee::factory()->create(['user_id' => $target->id]);

$request = Request::create("/api/employees/{$employee->id}/permissions/bulk", 'POST', [
    'role_id' => $hrRole->id,
    'department_id' => $dept->id,
    'managed_departments' => []
]);
$request->setUserResolver(function () use ($superAdmin) { return $superAdmin; });

$controller = app(EmployeePermissionController::class);
try {
    $response = $controller->bulkUpdate($request, $employee);
    echo "Bulk Update Test: " . ($response->getStatusCode() === 200 ? "SUCCESS\n" : "FAILED (Status: {$response->getStatusCode()})\n");
} catch (\Exception $e) {
    echo "Bulk Update Test: FAILED (" . $e->getMessage() . ") at line " . $e->getLine() . " of " . $e->getFile() . "\n";
}


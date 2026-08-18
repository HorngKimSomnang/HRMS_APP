<?php
require 'vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

function testRoute($user, $method, $uri) {
    Auth::login($user);
    $request = Request::create($uri, $method);
    $request->headers->set('Accept', 'application/json');
    $request->setUserResolver(function () use ($user) { return $user; });
    
    // Dispatch through the kernel to hit all middleware
    global $kernel;
    $response = $kernel->handle($request);
    $kernel->terminate($request, $response);
    return $response->getStatusCode();
}

$roles = ['Employee', 'HR', 'Super Admin'];
$endpoints = [
    'departments.view' => ['GET', '/api/departments'],
    'departments.create' => ['POST', '/api/departments'],
    'employees.view' => ['GET', '/api/employees'],
    'employees.create' => ['POST', '/api/employees'],
    'attendance.view' => ['GET', '/api/attendance'],
    'attendance.create' => ['POST', '/api/attendance'],
    'leaves.view' => ['GET', '/api/leaves'],
    'tasks.view' => ['GET', '/api/tasks'],
    'documents.view' => ['GET', '/api/documents'],
    'documents.upload' => ['POST', '/api/documents'],
    'holidays.view' => ['GET', '/api/holidays'],
    'contracts.view' => ['GET', '/api/contracts'],
    'assets.view' => ['GET', '/api/assets'],
    'overtime.view' => ['GET', '/api/overtime'],
    'payroll.view' => ['GET', '/api/payroll'],
    'reports.view' => ['GET', '/api/reports'],
    'roles.view' => ['GET', '/api/roles'],
    'shifts.view' => ['GET', '/api/settings/shifts'],
    'settings.view_general' => ['GET', '/api/settings'],
    'audit_logs.view' => ['GET', '/api/audit-logs'],
];

echo "RBAC Test Report\n\n";

foreach ($roles as $roleName) {
    $user = clone \App\Models\User::whereHas('role', fn($q) => $q->where('name', $roleName))->first();
    if (!$user) {
        if ($roleName === 'HR') {
            $user = \App\Models\User::whereHas('role', fn($q) => $q->where('name', 'HR'))->first();
            if(!$user) {
                // Find or create HR role
                $hrRole = \App\Models\Role::firstOrCreate(['name' => 'HR']);
                $user = \App\Models\User::factory()->create(['role_id' => $hrRole->id]);
            }
        } else {
           continue;
        }
    }
    
    echo "--- Testing Role: {$roleName} ---\n";
    $dbPerms = $user->role->permissions->pluck('name')->toArray();
    foreach ($endpoints as $perm => $route) {
        $hasDb = in_array($perm, $dbPerms) || $user->role->is_super_admin;
        $status = testRoute($user, $route[0], $route[1]);
        $matches = ($hasDb && $status == 200) || (!$hasDb && in_array($status, [403, 401]));
        
        echo str_pad($perm, 35) . " | DB: " . ($hasDb ? 'Y' : 'N') . " | API Status: {$status} | Match: " . ($matches ? 'Yes' : 'NO') . "\n";
    }
    echo "\n";
}

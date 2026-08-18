<?php
require 'vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$user = \App\Models\User::whereHas('role', fn($q) => $q->where('name', 'Employee'))->first();
if (!$user) {
    echo "No Employee user found.\n";
    exit;
}

echo "Testing user ID: {$user->id} ({$user->name})\n";

// 1. Get frontend state simulation
$controller = app(\App\Http\Controllers\Api\AuthController::class);
$request = \Illuminate\Http\Request::create('/api/user', 'GET');
$request->setUserResolver(fn() => $user);
$res = $controller->me($request);
$frontendUser = json_decode($res->getContent(), true);

$permissions = $frontendUser['permissions'] ?? [];
$isSuperAdmin = collect($frontendUser['roles'] ?? [])->contains(fn($r) => $r['name'] === 'Super Admin');

echo "isSuperAdmin: " . ($isSuperAdmin ? 'true' : 'false') . "\n";
echo "Has dashboard.view_total_employees in permissions array: " . (in_array('dashboard.view_total_employees', $permissions) ? 'true' : 'false') . "\n";

// 2. Get backend API response
$dashController = app(\App\Http\Controllers\Api\DashboardController::class);
$dashReq = \Illuminate\Http\Request::create('/api/dashboard', 'GET');
$dashReq->setUserResolver(fn() => $user);
$dashRes = $dashController->index($dashReq);
$dashData = json_decode($dashRes->getContent(), true);

echo "Total Employees in stats: " . (array_key_exists('total_employees', $dashData['stats']) ? $dashData['stats']['total_employees'] : 'MISSING') . "\n";


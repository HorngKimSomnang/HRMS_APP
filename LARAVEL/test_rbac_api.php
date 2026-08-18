<?php
require 'vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Http\Request;

$user = \App\Models\User::whereHas('role', fn($q) => $q->where('name', 'Employee'))->first();
echo "Testing as user: " . $user->name . " (Role: " . $user->role->name . ")\n";

$request = Request::create("/api/dashboard", 'GET');
$request->setUserResolver(function () use ($user) { return $user; });
// Also authenticate the user for any facade calls
\Illuminate\Support\Facades\Auth::login($user);

$controller = app(\App\Http\Controllers\Api\DashboardController::class);
try {
    $response = $controller->index($request);
    echo "Dashboard API Response:\n" . json_encode($response, JSON_PRETTY_PRINT) . "\n";
} catch (\Exception $e) {
    echo "Dashboard API Error: " . $e->getMessage() . "\n";
}


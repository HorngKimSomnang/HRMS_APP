<?php
require 'vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Http\Request;

$user = \App\Models\User::whereHas('role', fn($q) => $q->where('is_super_admin', true))->first();
$request = Request::create("/api/dashboard?month=8&year=2026", 'GET');
$request->setUserResolver(function () use ($user) { return $user; });

$controller = app(\App\Http\Controllers\Api\DashboardController::class);
try {
    $response = $controller->index($request);
    echo "Dashboard Test:\n" . json_encode($response, JSON_PRETTY_PRINT) . "\n";
} catch (\Exception $e) {
    echo "Dashboard Test: FAILED (" . $e->getMessage() . ") at line " . $e->getLine() . "\n";
}


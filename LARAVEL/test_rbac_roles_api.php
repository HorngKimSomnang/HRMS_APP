<?php
require 'vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Http\Request;

$user = \App\Models\User::whereHas('role', fn($q) => $q->where('is_super_admin', true))->first();
\Illuminate\Support\Facades\Auth::login($user);

$request = Request::create("/api/roles", 'GET');
$request->setUserResolver(function () use ($user) { return $user; });

$controller = app(\App\Http\Controllers\Api\RoleController::class);
try {
    $response = $controller->index($request);
    echo "Roles API Response:\n" . json_encode($response, JSON_PRETTY_PRINT) . "\n";
} catch (\Exception $e) {
    echo "Roles API Error: " . $e->getMessage() . "\n";
}

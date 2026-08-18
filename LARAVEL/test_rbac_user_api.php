<?php
require 'vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Http\Request;

$user = \App\Models\User::whereHas('role', fn($q) => $q->where('name', 'Employee'))->first();
\Illuminate\Support\Facades\Auth::login($user);

$request = Request::create("/api/user", 'GET');
$request->setUserResolver(function () use ($user) { return $user; });

$controller = app(\App\Http\Controllers\Api\AuthController::class);
try {
    $response = $controller->me($request);
    echo "User API Response:\n" . json_encode($response, JSON_PRETTY_PRINT) . "\n";
} catch (\Exception $e) {
    echo "User API Error: " . $e->getMessage() . "\n";
}

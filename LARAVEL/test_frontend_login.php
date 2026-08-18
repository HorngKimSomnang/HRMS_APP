<?php
require 'vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$user = \App\Models\User::whereHas('role', fn($q) => $q->where('name', 'Employee'))->first();
$response = app(\App\Http\Controllers\Api\AuthController::class)->me(
    \Illuminate\Http\Request::create('/api/user', 'GET', [], [], [], [], null)->setUserResolver(fn() => $user)
);
$data = json_decode($response->getContent(), true);

echo "PERMISSIONS FROM /api/user FOR EMPLOYEE:\n";
print_r($data['permissions']);

<?php
require 'vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$user = \App\Models\User::whereHas('role', fn($q) => $q->where('name', 'Employee'))->first();
$request = \Illuminate\Http\Request::create('/api/admin/roles', 'GET');
$request->headers->set('Accept', 'application/json');
$request->headers->set('X-App-Type', 'Mobile');
\Illuminate\Support\Facades\Auth::login($user);
$request->setUserResolver(fn() => $user);

$httpKernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
$response = $httpKernel->handle($request);
echo "HTTP Status: " . $response->getStatusCode() . "\n";

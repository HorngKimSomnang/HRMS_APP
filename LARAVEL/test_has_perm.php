<?php
require 'vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$user = \App\Models\User::whereHas('role', fn($q) => $q->where('name', 'Employee'))->first();
echo "hasPermissionTo: " . ($user->hasPermissionTo('dashboard.view_total_employees') ? 'TRUE' : 'FALSE') . "\n";

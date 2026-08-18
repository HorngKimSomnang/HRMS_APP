<?php
require 'vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$employee = \App\Models\Role::where('name', 'Employee')->first();
$perms = $employee->permissions()->pluck('name')->toArray();
echo implode("\n", $perms);

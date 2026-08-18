<?php
require 'vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$employees = \App\Models\User::whereHas('role', fn($q) => $q->where('name', 'Employee'))->get();
echo "Found " . $employees->count() . " Employee users.\n";
foreach ($employees as $user) {
    $permissions = $user->role->permissions->map(fn($p) => $p->feature . '.' . $p->action)->toArray();
    $direct = $user->getDirectPermissions()->toArray();
    $hasPerm = in_array('dashboard.view_total_employees', $permissions) || in_array('dashboard.view_total_employees', $direct);
    echo "User ID {$user->id} ({$user->name}) has perm: " . ($hasPerm ? "TRUE" : "FALSE") . "\n";
}

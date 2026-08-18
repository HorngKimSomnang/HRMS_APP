<?php
require 'vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$roles = \App\Models\Role::with('permissions')->whereIn('name', ['Employee', 'HR', 'Super Admin'])->get();
foreach($roles as $role) {
    echo "Role: " . $role->name . " (is_super_admin: " . ($role->is_super_admin ? 'true' : 'false') . ")\n";
    $perms = $role->permissions->pluck('name')->toArray();
    echo "Permissions (" . count($perms) . "): " . implode(', ', $perms) . "\n\n";
}

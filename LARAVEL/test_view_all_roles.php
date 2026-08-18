<?php
require 'vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Permission;
use App\Models\Role;

$roles = Role::whereHas('permissions', function($q) {
    $q->where('action', 'view_all');
})->with(['permissions' => function($q) {
    $q->where('action', 'view_all');
}])->get();

if ($roles->isEmpty()) {
    echo "No roles have view_all permissions attached.\n";
} else {
    foreach ($roles as $role) {
        echo "Role: {$role->name} has view_all for: ";
        $features = $role->permissions->pluck('feature')->toArray();
        echo implode(", ", $features) . "\n";
    }
}

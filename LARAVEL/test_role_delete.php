<?php
require 'vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Role;
use App\Models\Permission;

$role = Role::create(['name' => 'Delete Test']);
$perm = Permission::first();
if ($perm) {
    $role->permissions()->attach($perm->id);
}
try {
    $role->delete();
    echo "Deleted successfully";
} catch (\Exception $e) {
    echo "Failed to delete: " . $e->getMessage();
}

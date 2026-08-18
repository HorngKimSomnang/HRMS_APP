<?php
require 'vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Permission;

$deletedReports = Permission::where('feature', 'reports')->whereIn('action', ['create', 'edit', 'delete'])->delete();
$deletedOvertime = Permission::where('feature', 'overtime')->whereIn('action', ['assign', 'approve'])->delete();

echo "Deleted {$deletedReports} reports perms and {$deletedOvertime} overtime perms.\n";

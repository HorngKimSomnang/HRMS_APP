<?php
require 'vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Permission;

$features = Permission::distinct()->pluck('feature');
echo "Features in DB: " . implode(", ", $features->toArray()) . "\n";

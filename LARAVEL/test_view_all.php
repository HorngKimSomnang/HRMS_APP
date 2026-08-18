<?php
require 'vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$viewAllPerms = \App\Models\Permission::where('action', 'view_all')->get();
echo "View All Perms: " . $viewAllPerms->count() . "\n";
foreach($viewAllPerms as $p) {
    echo $p->feature . "." . $p->action . "\n";
}

<?php
require 'vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;

$users = User::withTrashed()->where('email', '!=', 'superadmin@gmail.com')->get();
$count = 0;

foreach ($users as $user) {
    if ($user->employee) {
        $user->employee()->forceDelete();
    }
    
    // Spatie has permissions trait maybe? Let's just try to delete
    $user->forceDelete();
    $count++;
}

echo "Force deleted $count non-superadmin users.\n";

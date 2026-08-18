<?php
require 'vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use App\Models\Employee;

// Get ALL users including soft-deleted ones
$users = User::withTrashed()->where('email', '!=', 'superadmin@gmail.com')->get();
$count = 0;

foreach ($users as $user) {
    if ($user->employee) {
        $user->employee()->forceDelete();
    }
    
    $user->roles()->detach();
    $user->permissions()->detach();
    
    $user->forceDelete();
    $count++;
}

echo "Force deleted $count non-superadmin users.\n";

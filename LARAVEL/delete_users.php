<?php
require 'vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use App\Models\Employee;

$users = User::where('email', '!=', 'superadmin@gmail.com')->get();
$count = 0;

foreach ($users as $user) {
    // Delete employee record if it exists to avoid FK constraints
    if ($user->employee) {
        $user->employee->delete();
    }
    
    // Spatie permissions traits usually handle detaching roles on delete,
    // but just to be safe:
    $user->roles()->detach();
    $user->permissions()->detach();
    
    $user->delete();
    $count++;
}

echo "Deleted $count non-superadmin users.\n";

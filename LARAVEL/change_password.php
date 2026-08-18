<?php
require 'vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;

$user = User::where('email', 'superadmin@gmail.com')->first();
if ($user) {
    $user->password = bcrypt('Password');
    $user->save();
    echo "Password updated successfully.\n";
} else {
    echo "User not found.\n";
}

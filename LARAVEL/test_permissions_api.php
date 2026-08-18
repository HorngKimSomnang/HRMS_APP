<?php
require 'vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$controller = app(\App\Http\Controllers\Api\RoleController::class);
// Wait, is there a permissions endpoint?
Route::get('/admin/permissions', function() {
    return \App\Models\Permission::all();
});

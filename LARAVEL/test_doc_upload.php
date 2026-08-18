<?php
require 'vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use App\Models\Role;
use App\Models\Permission;

$uploaderRole = Role::firstOrCreate(['name' => 'Uploader Test']);
$uploaderRole->permissions()->detach();
$uploaderRole->permissions()->attach(Permission::where('feature', 'documents')->where('action', 'upload')->first()->id);

$noAuthRole = Role::firstOrCreate(['name' => 'NoAuth Doc Test']);
$noAuthRole->permissions()->detach();

$uploaderUser = User::firstOrCreate(['email' => 'uploader@test.com'], ['name' => 'Uploader', 'password' => bcrypt('password'), 'role_id' => $uploaderRole->id]);
$uploaderUser->update(['role_id' => $uploaderRole->id]);

$noAuthUser = User::firstOrCreate(['email' => 'noauthdoc@test.com'], ['name' => 'NoAuth', 'password' => bcrypt('password'), 'role_id' => $noAuthRole->id]);
$noAuthUser->update(['role_id' => $noAuthRole->id]);

// Test Uploader
$request1 = \Illuminate\Http\Request::create('/api/documents', 'POST', []);
$request1->headers->set('Accept', 'application/json');
$request1->setUserResolver(fn() => $uploaderUser);
Auth::shouldUse('web');
Auth::login($uploaderUser);

$httpKernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
$response1 = $httpKernel->handle($request1);

echo "UPLOADER REQUEST STATUS: " . $response1->getStatusCode() . "\n"; // Expect 422 validation error, not 403

// Test NoAuth
$request2 = \Illuminate\Http\Request::create('/api/documents', 'POST', []);
$request2->headers->set('Accept', 'application/json');
$request2->setUserResolver(fn() => $noAuthUser);
Auth::login($noAuthUser);

$response2 = $httpKernel->handle($request2);

echo "NO-AUTH REQUEST STATUS: " . $response2->getStatusCode() . "\n"; // Expect 403

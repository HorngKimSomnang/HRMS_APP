<?php
require 'vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use App\Models\Role;
use App\Models\Permission;
use App\Models\Overtime;
use App\Models\Employee;

// 1. Setup role and users
$approverRole = Role::firstOrCreate(['name' => 'Approver Test']);
$approverRole->permissions()->detach();
$approverRole->permissions()->attach(Permission::where('feature', 'overtime')->where('action', 'approve')->first()->id);

$noAuthRole = Role::firstOrCreate(['name' => 'NoAuth Test']);
$noAuthRole->permissions()->detach();

$approverUser = User::firstOrCreate(['email' => 'approver@test.com'], ['name' => 'Approver', 'password' => bcrypt('password'), 'role_id' => $approverRole->id]);
$approverUser->update(['role_id' => $approverRole->id]);

$noAuthUser = User::firstOrCreate(['email' => 'noauth@test.com'], ['name' => 'NoAuth', 'password' => bcrypt('password'), 'role_id' => $noAuthRole->id]);
$noAuthUser->update(['role_id' => $noAuthRole->id]);

// 2. Create a pending overtime request
$emp = Employee::first();
$ot = Overtime::create([
    'employee_id' => $emp->id,
    'date' => '2026-08-12',
    'hours' => 2,
    'reason' => 'Test',
    'status' => 'pending'
]);

// 3. Test Approver User
$request1 = \Illuminate\Http\Request::create('/api/overtimes/'.$ot->id, 'PUT', ['status' => 'approved']);
$request1->headers->set('Accept', 'application/json');
\Illuminate\Support\Facades\Auth::login($approverUser);
$request1->setUserResolver(fn() => $approverUser);

$httpKernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
$response1 = $httpKernel->handle($request1);

echo "APPROVER REQUEST STATUS: " . $response1->getStatusCode() . "\n";
echo "APPROVER REQUEST BODY: " . $response1->getContent() . "\n";

// Reset OT
$ot->update(['status' => 'pending']);

// 4. Test NoAuth User
$request2 = \Illuminate\Http\Request::create('/api/overtimes/'.$ot->id, 'PUT', ['status' => 'approved']);
$request2->headers->set('Accept', 'application/json');
\Illuminate\Support\Facades\Auth::login($noAuthUser);
$request2->setUserResolver(fn() => $noAuthUser);

$response2 = $httpKernel->handle($request2);

echo "NO-AUTH REQUEST STATUS: " . $response2->getStatusCode() . "\n";
echo "NO-AUTH REQUEST BODY: " . $response2->getContent() . "\n";

$ot->delete();

<?php
require 'vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use App\Models\Overtime;
use App\Models\Employee;

$noAuthUser = User::where('email', 'noauth@test.com')->first();
$ot = Overtime::firstOrCreate(['employee_id' => Employee::first()->id, 'status' => 'pending'], [
    'date' => '2026-08-12', 'hours' => 2, 'reason' => 'Test'
]);

$request2 = \Illuminate\Http\Request::create('/api/overtimes/'.$ot->id, 'PUT', ['status' => 'approved']);
$request2->headers->set('Accept', 'application/json');
$request2->setUserResolver(fn() => $noAuthUser);
Auth::shouldUse('web');
Auth::login($noAuthUser);

$httpKernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
$response2 = $httpKernel->handle($request2);

echo "NO-AUTH REQUEST STATUS: " . $response2->getStatusCode() . "\n";
echo "NO-AUTH REQUEST BODY: " . $response2->getContent() . "\n";

$ot->delete();

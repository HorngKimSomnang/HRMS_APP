<?php
require 'vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;

$noAuthUser = User::where('email', 'noauthdoc@test.com')->first();
$request2 = \Illuminate\Http\Request::create('/api/documents', 'POST', []);
$request2->headers->set('Accept', 'application/json');
$request2->setUserResolver(fn() => $noAuthUser);
Auth::shouldUse('web');
Auth::login($noAuthUser);

$httpKernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
$response2 = $httpKernel->handle($request2);

echo "NO-AUTH REQUEST STATUS: " . $response2->getStatusCode() . "\n"; // Expect 403

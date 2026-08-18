<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$user = \App\Models\User::where('email', 'superadmin@gmail.com')->first();
auth()->login($user);

$request = Illuminate\Http\Request::create('/api/payroll/preview', 'GET', [
    'employee_id' => 1,
    'month' => '08',
    'year' => '2026'
]);
$response = app()->handle($request);
echo $response->getContent();

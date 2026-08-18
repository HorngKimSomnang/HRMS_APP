<?php
require 'vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$payslips = \App\Models\Payslip::get(['id', 'month', 'year', 'status', 'net_salary']);
echo "Payslips: " . json_encode($payslips) . "\n";

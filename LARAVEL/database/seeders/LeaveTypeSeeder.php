<?php

namespace Database\Seeders;

use App\Support\HrCatalog;
use Illuminate\Database\Seeder;

class LeaveTypeSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        HrCatalog::saveLeaveTypes(HrCatalog::defaultLeaveTypes());
    }
}

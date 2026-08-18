<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Drops the old check constraint that excluded 'pending' from the valid
     * status values, then adds a new one that includes it.
     * Valid statuses: draft | pending | active | expired | terminated
     */
    public function up(): void
    {
        // Drop existing constraint
        DB::statement("ALTER TABLE contracts DROP CONSTRAINT IF EXISTS contracts_status_check");

        // Recreate with 'pending' included
        DB::statement("ALTER TABLE contracts ADD CONSTRAINT contracts_status_check CHECK (status IN ('draft', 'pending', 'active', 'expired', 'terminated'))");
    }

    /**
     * Reverse the migrations.
     * Restores the original constraint (without 'pending').
     */
    public function down(): void
    {
        DB::statement("ALTER TABLE contracts DROP CONSTRAINT IF EXISTS contracts_status_check");
        DB::statement("ALTER TABLE contracts ADD CONSTRAINT contracts_status_check CHECK (status IN ('draft', 'active', 'expired', 'terminated'))");
    }
};

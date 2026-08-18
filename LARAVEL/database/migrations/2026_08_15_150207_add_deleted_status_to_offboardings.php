<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        \Illuminate\Support\Facades\DB::statement("ALTER TABLE offboardings DROP CONSTRAINT IF EXISTS offboardings_status_check;");
        \Illuminate\Support\Facades\DB::statement("ALTER TABLE offboardings ADD CONSTRAINT offboardings_status_check CHECK (status::text = ANY (ARRAY['pending'::character varying, 'in_progress'::character varying, 'completed'::character varying, 'deleted'::character varying]::text[]));");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        \Illuminate\Support\Facades\DB::statement("ALTER TABLE offboardings DROP CONSTRAINT IF EXISTS offboardings_status_check;");
        \Illuminate\Support\Facades\DB::statement("ALTER TABLE offboardings ADD CONSTRAINT offboardings_status_check CHECK (status::text = ANY (ARRAY['pending'::character varying, 'in_progress'::character varying, 'completed'::character varying]::text[]));");
    }
};

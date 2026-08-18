<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // PostgreSQL: the status column is a VARCHAR (Laravel stores enums as
        // varchar + check constraint in pgsql). We drop the old check and add
        // the new one that includes 'locked', then add locked_reason.
        DB::statement("ALTER TABLE payslips DROP CONSTRAINT IF EXISTS payslips_status_check");
        DB::statement("ALTER TABLE payslips ADD CONSTRAINT payslips_status_check CHECK (status IN ('draft','pending','approved','paid','locked'))");

        Schema::table('payslips', function (Blueprint $table) {
            $table->string('locked_reason')->nullable()->after('status');
        });

        // Retroactively lock draft/pending/approved payslips for currently-archived employees
        DB::statement("
            UPDATE payslips
            SET status = 'locked',
                locked_reason = 'Employee archived (retroactive lock)'
            WHERE status IN ('draft','pending','approved')
              AND employee_id IN (
                  SELECT id FROM employees WHERE deleted_at IS NOT NULL
              )
        ");
    }

    public function down(): void
    {
        // Restore locked payslips back to draft before removing the 'locked' value
        DB::statement("UPDATE payslips SET status = 'draft', locked_reason = NULL WHERE status = 'locked'");

        DB::statement("ALTER TABLE payslips DROP CONSTRAINT IF EXISTS payslips_status_check");
        DB::statement("ALTER TABLE payslips ADD CONSTRAINT payslips_status_check CHECK (status IN ('draft','pending','approved','paid'))");

        Schema::table('payslips', function (Blueprint $table) {
            $table->dropColumn('locked_reason');
        });
    }
};

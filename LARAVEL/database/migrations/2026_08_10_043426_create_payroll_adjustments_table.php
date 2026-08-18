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
        Schema::create('payroll_adjustments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained()->cascadeOnDelete();
            $table->date('adjustment_date');
            $table->enum('type', [
                'attendance_bonus',
                'daily_attendance_allowance',
                'absent_deduction',
                'late_deduction',
                'other_deduction',
            ]);
            $table->decimal('amount', 10, 2);
            $table->string('source_event_id')->nullable(); // e.g. attendance record id, for idempotency
            $table->timestamps();

            // Idempotency guard: one adjustment of a given type per employee per day
            $table->unique(['employee_id', 'adjustment_date', 'type']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payroll_adjustments');
    }
};

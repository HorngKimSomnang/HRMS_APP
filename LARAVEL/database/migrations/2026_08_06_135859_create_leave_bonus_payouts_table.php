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
        Schema::create('leave_bonus_payouts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('employees')->onDelete('cascade');
            $table->date('leave_year_start');
            $table->timestamp('paid_at');
            $table->decimal('amount', 10, 2);
            $table->timestamps();
            
            // Ensure we don't double pay for the same year
            $table->unique(['employee_id', 'leave_year_start']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('leave_bonus_payouts');
    }
};

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
        Schema::create('payslips', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained()->onDelete('cascade');
            $table->string('month');
            $table->string('year');
            // Earnings
            $table->decimal('basic_salary', 10, 2)->default(0);
            $table->decimal('overtime_amount', 10, 2)->default(0);
            $table->decimal('commission', 10, 2)->default(0);
            $table->decimal('attendance_bonus', 10, 2)->default(0)->comment('Bonus for good/perfect attendance');
            $table->decimal('allowances', 10, 2)->default(0)->comment('Transport, meal, etc.');
            // Deductions
            $table->decimal('advance_deduction', 10, 2)->default(0);
            $table->decimal('deductions', 10, 2)->default(0)->comment('Tax, insurance, etc.');
            // Total
            $table->decimal('net_salary', 10, 2)->default(0);
            $table->enum('status', ['draft', 'pending', 'approved', 'paid'])->default('draft');
            $table->text('notes')->nullable()->comment('Admin remarks on the payslip');
            $table->string('pdf_path')->nullable();
            
            // Digital Signature
            $table->boolean('is_signed')->default(false)->comment('Whether the employee acknowledged/signed it');
            $table->timestamp('signed_at')->nullable();
            
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payslips');
    }
};

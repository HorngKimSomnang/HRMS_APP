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
            $table->decimal('unpaid_leave_deduction', 10, 2)->default(0)->comment('Pay withheld for approved unpaid-leave days this period');
            $table->decimal('deductions', 10, 2)->default(0)->comment('Tax, insurance, etc.');
            // Total
            $table->decimal('net_salary', 10, 2)->default(0);
            $table->enum('status', ['draft', 'pending', 'approved', 'paid'])->default('draft');
            $table->text('notes')->nullable()->comment('Admin remarks on the payslip');
            $table->string('pdf_path')->nullable();
            
            // Digital Signature
            // Batch-generated payslips come from a printed roster the employee physically signs,
            // so they require a scanned proof before authorization. Individually-generated ones
            // (one-off bonuses/corrections) are created directly by an admin and skip that step.
            $table->boolean('requires_signature')->default(true);
            $table->boolean('is_signed')->default(false)->comment('Whether the employee acknowledged/signed it');
            $table->timestamp('signed_at')->nullable();
            $table->string('signed_document_path')->nullable()->comment('Scanned copy of the physically-signed paper, kept as proof');
            
            $table->timestamps();
            $table->softDeletes();
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

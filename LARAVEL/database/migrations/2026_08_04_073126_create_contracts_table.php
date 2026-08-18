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
        Schema::create('contracts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained()->onDelete('cascade');
            $table->enum('type', ['probation', 'permanent', 'fixed_term', 'part_time', 'contractor'])->default('permanent');
            $table->decimal('salary', 15, 2)->nullable();
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->enum('status', ['draft', 'active', 'expired', 'terminated'])->default('draft');
            $table->string('document_path')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();
            $table->softDeletes();
        });

        // Migrate existing salaries to a contract
        $employees = \Illuminate\Support\Facades\DB::table('employees')->get();
        foreach ($employees as $employee) {
            if ($employee->basic_salary) {
                \Illuminate\Support\Facades\DB::table('contracts')->insert([
                    'employee_id' => $employee->id,
                    'type' => 'permanent',
                    'salary' => $employee->basic_salary,
                    'start_date' => $employee->joining_date ?? now(),
                    'status' => 'active',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        Schema::table('employees', function (Blueprint $table) {
            $table->dropColumn('basic_salary');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->decimal('basic_salary', 15, 2)->nullable();
        });
        Schema::dropIfExists('contracts');
    }
};

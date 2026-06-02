<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Payslip extends Model
{
    use HasFactory;

    protected $fillable = [
        'employee_id',
        'month',
        'year',
        'basic_salary',
        'overtime_amount',
        'commission',
        'attendance_bonus',
        'allowances',
        'advance_deduction',
        'deductions',
        'net_salary',
        'status',
        'notes',
        'pdf_path',
        'is_signed',
        'signed_at',
    ];

    protected $casts = [
        'basic_salary' => 'decimal:2',
        'overtime_amount' => 'decimal:2',
        'commission' => 'decimal:2',
        'attendance_bonus' => 'decimal:2',
        'allowances' => 'decimal:2',
        'advance_deduction' => 'decimal:2',
        'deductions' => 'decimal:2',
        'net_salary' => 'decimal:2',
        'is_signed' => 'boolean',
        'signed_at' => 'datetime',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }
}

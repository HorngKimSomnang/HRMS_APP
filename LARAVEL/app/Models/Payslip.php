<?php

namespace App\Models;

use App\Scopes\ManagementScope;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Payslip extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'employee_id',
        'month',
        'year',
        'period_start',
        'period_end',
        'basic_salary',
        'overtime_amount',
        'commission',
        'attendance_bonus',
        'allowances',
        'advance_deduction',
        'unpaid_leave_deduction',
        'deductions',
        'net_salary',
        'status',
        'notes',
        'pdf_path',
        'requires_signature',
        'is_signed',
        'signed_at',
        'signed_document_path',
    ];

    protected $appends = ['can_mark_paid'];

    public function getCanMarkPaidAttribute()
    {
        if (!in_array($this->status, ['draft', 'pending', 'approved'])) {
            return false;
        }

        // If the employee's contract is expired (offboarded), allow mark paid immediately
        if ($this->employee) {
            $hasExpiredContract = $this->employee->contracts()
                ->where('status', 'expired')
                ->exists();
            if ($hasExpiredContract) {
                return true;
            }
        }

        // Otherwise require the pay period to have ended
        if (!$this->period_end) {
            return false;
        }

        return \Carbon\Carbon::now()->startOfDay()->gte(\Carbon\Carbon::parse($this->period_end)->startOfDay());
    }

    protected $casts = [
        'basic_salary' => 'decimal:2',
        'overtime_amount' => 'decimal:2',
        'commission' => 'decimal:2',
        'attendance_bonus' => 'decimal:2',
        'allowances' => 'decimal:2',
        'advance_deduction' => 'decimal:2',
        'unpaid_leave_deduction' => 'decimal:2',
        'deductions' => 'decimal:2',
        'net_salary' => 'decimal:2',
        'requires_signature' => 'boolean',
        'is_signed' => 'boolean',
        'signed_at' => 'datetime',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class)->withTrashed();
    }

    protected static function booted()
    {
        static::addGlobalScope(new ManagementScope);
    }
}

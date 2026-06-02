<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PayrollRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'employee_id',
        'type',
        'date',
        'value',
        'bank_account',
        'bank_name',
        'reason',
        'status',
        'approved_by',
    ];

    protected $casts = [
        'date' => 'date',
        'value' => 'decimal:2',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}

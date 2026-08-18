<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LeaveBonusPayout extends Model
{
    use HasFactory;

    protected $fillable = [
        'employee_id',
        'leave_year_start',
        'paid_at',
        'amount',
    ];

    protected $casts = [
        'leave_year_start' => 'date',
        'paid_at' => 'datetime',
        'amount' => 'decimal:2',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }
}

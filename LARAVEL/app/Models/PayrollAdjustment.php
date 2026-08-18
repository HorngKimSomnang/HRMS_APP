<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PayrollAdjustment extends Model
{
    use HasFactory;

    protected $fillable = [
        'employee_id',
        'adjustment_date',
        'type',
        'amount',
        'source_event_id',
    ];
}

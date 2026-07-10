<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EmployeeEvent extends Model
{
    use HasFactory;

    protected $fillable = [
        'employee_id',
        'type',
        'old_value',
        'new_value',
        'effective_date',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'effective_date' => 'date',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}

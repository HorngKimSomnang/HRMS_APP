<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Attendance extends Model
{
    use HasFactory;

    protected $fillable = [
        'employee_id',
        'date',
        'clock_in',
        'clock_out',
        'latitude',
        'longitude',
        'address',
        'location_accuracy',
        'status',
        'late_reason',
        'early_out_reason',
        'is_late',
    ];

    protected $casts = [
        'date' => 'date',
        'clock_in' => 'datetime',
        'clock_out' => 'datetime',
        'is_late' => 'boolean',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }
    protected $appends = ['hours_worked'];

    public function getHoursWorkedAttribute()
    {
        if ($this->clock_in && $this->clock_out) {
            $start = \Carbon\Carbon::parse($this->clock_in);
            $end = \Carbon\Carbon::parse($this->clock_out);
            $diffInMinutes = $start->diffInMinutes($end);
            
            $hours = floor($diffInMinutes / 60);
            $minutes = $diffInMinutes % 60;
            
            return sprintf('%02dh %02dm', $hours, $minutes);
        }
        return '-';
    }
}

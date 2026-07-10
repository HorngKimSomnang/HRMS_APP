<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Attendance extends Model
{
    use HasFactory, SoftDeletes;

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
    protected $appends = ['hours_worked', 'crosses_midnight'];

    public function getHoursWorkedAttribute(): string
    {
        if (!$this->clock_in || !$this->clock_out) return '-';

        $tz    = config('app.timezone');
        $start = \Carbon\Carbon::parse($this->clock_in)->setTimezone($tz);
        $end   = \Carbon\Carbon::parse($this->clock_out)->setTimezone($tz);

        // If local checkout date is after local clock-in date, clock-out crossed midnight
        if ($end->toDateString() > $start->toDateString()) {
            // Keep both as-is — diffInMinutes handles cross-day correctly
        } elseif ($end->lte($start)) {
            // UTC artifact: add a day so diff is positive
            $end->addDay();
        }

        $minutes = $start->diffInMinutes($end);

        // >14 h for a single shift is almost certainly a missed clock-out, not actual work
        if ($minutes > 840) return '—';

        return sprintf('%02dh %02dm', intdiv($minutes, 60), $minutes % 60);
    }

    // True when clock-out is on a DIFFERENT local calendar date than clock-in
    public function getCrossesMidnightAttribute(): bool
    {
        if (!$this->clock_in || !$this->clock_out) return false;
        $tz = config('app.timezone');
        return \Carbon\Carbon::parse($this->clock_out)->setTimezone($tz)->toDateString()
             > \Carbon\Carbon::parse($this->clock_in)->setTimezone($tz)->toDateString();
    }
}

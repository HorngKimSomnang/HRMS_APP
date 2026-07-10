<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Offboarding extends Model
{
    use HasFactory;

    protected $fillable = [
        'employee_id',
        'resignation_date',
        'last_working_day',
        'reason',
        'status',
        'checklist',
        'settlement_notes',
        'completed_at',
        'created_by',
    ];

    protected $casts = [
        'resignation_date' => 'date',
        'last_working_day' => 'date',
        'checklist' => 'array',
        'completed_at' => 'datetime',
    ];

    public const DEFAULT_CHECKLIST = [
        ['key' => 'handover', 'label' => 'Work handover completed', 'done' => false],
        ['key' => 'assets', 'label' => 'Company assets returned', 'done' => false],
        ['key' => 'accounts', 'label' => 'System accounts deactivated', 'done' => false],
        ['key' => 'final_pay', 'label' => 'Final salary settled', 'done' => false],
        ['key' => 'leave_payout', 'label' => 'Unused leave settled', 'done' => false],
        ['key' => 'exit_interview', 'label' => 'Exit interview conducted', 'done' => false],
        ['key' => 'documents', 'label' => 'Work certificate issued', 'done' => false],
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

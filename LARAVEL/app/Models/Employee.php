<?php

namespace App\Models;

use App\Scopes\ManagementScope;

use App\Support\HrCatalog;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Employee extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'user_id',
        // 'department_id', // Removed earlier, adding back
        'department_id',
        'job_title',
        'employee_code',
        'first_name',
        'last_name',
        'phone',
        'gender',
        'dob',
        'joining_date',
        'address',
        'profile_picture',
        'status',
        'basic_salary',
        'shift_id',
        'documents',
        'manager_id',
    ];

    protected $casts = [
        'dob' => 'date',
        'joining_date' => 'date',
        'documents' => 'array',
    ];

    protected $appends = ['profile_picture_url', 'name', 'shift'];

    public function getNameAttribute()
    {
        return trim("{$this->last_name} {$this->first_name}");
    }

    public function contracts()
    {
        return $this->hasMany(Contract::class);
    }

    public function activeContract()
    {
        return $this->hasOne(Contract::class)->where('status', 'active')->latestOfMany();
    }

    public function getProfilePictureUrlAttribute()
    {
        return $this->profile_picture ? url('/api/file/' . $this->profile_picture) : null;
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function manager()
    {
        return $this->belongsTo(Employee::class, 'manager_id');
    }

    public function department()
    {
        return $this->belongsTo(Department::class);
    }

    // Relationships removed: branch, department





    public function leaves()
    {
        return $this->hasMany(Leave::class);
    }

    public function attendances()
    {
        return $this->hasMany(Attendance::class);
    }

    public function tasks()
    {
        return $this->hasMany(Task::class, 'assigned_to');
    }

    public function payslips()
    {
        return $this->hasMany(Payslip::class);
    }

    public function getShiftAttribute()
    {
        return HrCatalog::findShiftById($this->shift_id);
    }

    /**
     * Archive (soft delete) this employee and everything tied to it: revokes
     * system access and soft-deletes related records so they're recoverable
     * via restore(), but never hard-deletes anything.
     */
    public function archive(): void
    {
        \App\Models\Attendance::where('employee_id', $this->id)->delete();
        \App\Models\Leave::where('employee_id', $this->id)->delete();
        \App\Models\Overtime::where('employee_id', $this->id)->delete();
        \App\Models\Task::where('assigned_to', $this->id)->delete();
        // We no longer soft-delete payslips here, so unpaid ones stay payable.
        // \App\Models\Payslip::where('employee_id', $this->id)->delete();

        $contracts = \App\Models\Contract::where('employee_id', $this->id)
            ->whereIn('status', ['active', 'pending'])
            ->get();

        foreach ($contracts as $contract) {
            $contract->update(['status' => 'expired', 'end_date' => now()]);
            \App\Models\ContractStatusLog::create([
                'contract_id' => $contract->id,
                'employee_id' => $this->id,
                'status'      => 'expired',
                'changed_at'  => now(),
            ]);
        }

        // Lock all non-paid payslips so they cannot be marked paid
        // while the employee is archived. They are unlocked automatically on restore().
        \App\Models\Payslip::where('employee_id', $this->id)
            ->whereIn('status', ['draft', 'pending', 'approved'])
            ->update([
                'status'        => 'locked',
                'locked_reason' => 'Employee archived on ' . now()->toDateString(),
            ]);

        \App\Models\Offboarding::create([
            'employee_id' => $this->id,
            'resignation_date' => now(),
            'last_working_day' => now(),
            'reason' => 'Deleted',
            'status' => 'deleted',
            'checklist' => [],
            'created_by' => auth()->id() ?? \App\Models\User::first()->id ?? 1,
        ]);

        if ($this->user) {

            $this->user->tokens()->delete();
            $this->user->delete(); // soft delete
        }

        $this->update(['status' => 'terminated']);
        $this->delete(); // soft delete
    }

    protected static function booted()
    {
        static::addGlobalScope(new ManagementScope);
    }
}

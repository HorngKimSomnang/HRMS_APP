<?php

namespace App\Models;

use App\Support\HrCatalog;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Employee extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'user_id',
        // 'branch_id', // Removed
        // 'department_id', // Removed
        'department', // Added as string
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
    ];

    protected $casts = [
        'dob' => 'date',
        'joining_date' => 'date',
        'documents' => 'array',
    ];

    protected $appends = ['profile_picture_url', 'name', 'shift'];

    public function getNameAttribute()
    {
        return "{$this->first_name} {$this->last_name}";
    }

    public function contracts()
    {
        return $this->hasMany(Contract::class);
    }

    public function getProfilePictureUrlAttribute()
    {
        return $this->profile_picture ? asset('storage/' . $this->profile_picture) : null;
    }

    public function user()
    {
        return $this->belongsTo(User::class);
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
        \App\Models\Payslip::where('employee_id', $this->id)->delete();

        if ($this->user) {
            $this->user->syncRoles([]);
            $this->user->tokens()->delete();
            $this->user->delete(); // soft delete
        }

        $this->update(['status' => 'terminated']);
        $this->delete(); // soft delete
    }
}

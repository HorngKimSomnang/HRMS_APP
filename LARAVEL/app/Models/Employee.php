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
        // Salary Fields
        'basic_salary',
        'hra',
        'transport_allowance',
        'other_allowances',
        'pf',
        'tax',
        'other_deductions',
        'net_salary',
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

    public function getShiftAttribute()
    {
        return HrCatalog::findShiftById($this->shift_id);
    }
}

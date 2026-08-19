<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\User;
use App\Models\Role;

class Department extends Model
{
    protected $fillable = ['name', 'description'];

    protected static function booted()
    {
        static::created(function ($department) {
            $superAdminRole = Role::where('name', 'Super Admin')->first();
            if ($superAdminRole) {
                $superAdmins = User::whereHas('assignedRoles', fn($q) => $q->where('roles.id', $superAdminRole->id))->pluck('id');
                if ($superAdmins->isNotEmpty()) {
                    $department->managers()->attach($superAdmins);
                }
            }
        });
    }

    public function employees()
    {
        return $this->hasMany(Employee::class);
    }

    public function managers()
    {
        return $this->belongsToMany(User::class, 'department_manager', 'department_id', 'user_id');
    }
}

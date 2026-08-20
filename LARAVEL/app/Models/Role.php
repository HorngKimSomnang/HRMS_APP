<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Role extends Model
{
    protected $fillable = ['name', 'is_system', 'is_department_scoped'];

    protected $casts = [
        'is_system' => 'boolean',
        'is_department_scoped' => 'boolean',
    ];

    public function permissions()
    {
        return $this->belongsToMany(Permission::class, 'role_has_permissions');
    }

    public function users()
    {
        return $this->hasMany(User::class);
    }

    protected static function booted()
    {
        static::deleting(function ($role) {
            if ($role->is_system) {
                throw new \Exception("Cannot delete a system role.");
            }
        });
        
        static::updating(function ($role) {
            if ($role->getOriginal('is_system') && $role->name !== $role->getOriginal('name')) {
                throw new \Exception("Cannot rename a system role.");
            }
        });
    }
}

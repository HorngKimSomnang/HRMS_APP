<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Permission extends Model
{
    protected $fillable = ['feature', 'action'];
    protected $appends = ['name'];

    public function roles()
    {
        return $this->belongsToMany(Role::class, 'role_has_permissions');
    }

    public function getNameAttribute()
    {
        return $this->feature . '.' . $this->action;
    }
}

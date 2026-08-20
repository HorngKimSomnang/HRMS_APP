<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\User;
use App\Models\Role;

class Department extends Model
{
    protected $fillable = ['name', 'description'];


    public function employees()
    {
        return $this->hasMany(Employee::class);
    }

}

<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    public function role()
    {
        return $this->belongsTo(Role::class);
    }

    public function department()
    {
        return $this->belongsTo(Department::class);
    }

    public function scopeRole($query, string|array $roles)
    {
        if (is_string($roles)) {
            $roles = [$roles];
        }

        return $query->whereHas('role', function ($q) use ($roles) {
            $q->whereIn('name', $roles);
        });
    }

    public function hasRole(string|array $roles): bool
    {
        if (!$this->role) {
            return false;
        }

        if (is_array($roles)) {
            return in_array($this->role->name, $roles);
        }

        return $this->role->name === $roles;
    }

    public function hasPermissionTo(string $ability): bool
    {
        if (!$this->role) {
            return false;
        }
        
        if ($this->role->is_system && $this->role->name === 'Super Admin') {
            return true;
        }

        // Split ability (e.g. "employee.view" -> feature "employee", action "view")
        // or support direct matching
        $parts = explode('.', $ability);
        
        return $this->role->permissions()
            ->where(function ($query) use ($parts, $ability) {
                if (count($parts) === 2) {
                    $query->where('feature', $parts[0])->where('action', $parts[1]);
                } else {
                    // Fallback if they pass something else
                    $query->where('feature', $ability);
                }
            })
            ->exists();
    }

    /** Compat shim: Spatie hasAnyRole() equivalent */
    public function hasAnyRole(array|string $roles): bool
    {
        $roles = is_string($roles) ? [$roles] : $roles;
        return $this->hasRole($roles);
    }

    /** Compat shim: Spatie getRoleNames() equivalent */
    public function getRoleNames(): \Illuminate\Support\Collection
    {
        return $this->assignedRoles->pluck('name');
    }

    public function getAllPermissions()
    {
        if (!$this->role) {
            return collect();
        }
        
        // If Super Admin, return all permissions in the system? 
        // Or just return the role's assigned permissions. Let's return assigned.
        // The frontend AuthContext usually bypasses checks if isSuperAdmin anyway.
        return $this->role->permissions->map(function ($p) {
            return (object)['name' => $p->feature . '.' . $p->action];
        });
    }

    public function getDirectPermissions()
    {
        // Strict RBAC means no direct user permissions anymore.
        return collect();
    }

    public function employee()
    {
        return $this->hasOne(Employee::class);
    }

    public function managedDepartments()
    {
        return $this->belongsToMany(Department::class, 'department_manager', 'user_id', 'department_id');
    }

    public function assignedRoles()
    {
        return $this->belongsToMany(Role::class, 'user_roles');
    }

    protected $appends = ['needs_password_change', 'roles'];

    public function getRolesAttribute()
    {
        return $this->assignedRoles;
    }

    public function getNeedsPasswordChangeAttribute()
    {
        // Explicit flag: null means the user still has an auto-generated password.
        // (Set to now() on password change; reset to null when credentials are resent.)
        return $this->password_changed_at === null;
    }

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'role_id',
        'department_id',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'password_changed_at' => 'datetime',
            'password' => 'hashed',
        ];
    }
}

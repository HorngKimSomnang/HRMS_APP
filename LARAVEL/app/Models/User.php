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

    public function department()
    {
        return $this->belongsTo(Department::class);
    }

    public function getActiveRole()
    {
        $token = $this->currentAccessToken();
        if (!$token || !$token->active_role_id) {
            return null;
        }
        // Cross-check that the user still holds this role in the pivot table.
        // If the role was revoked mid-session, self-heal the token and fail closed.
        $stillHasRole = $this->assignedRoles()
            ->where('roles.id', $token->active_role_id)
            ->exists();
        if (!$stillHasRole) {
            $token->update(['active_role_id' => null]);
            return null;
        }
        return Role::find($token->active_role_id);
    }

    public function scopeRole($query, string|array $roles)
    {
        if (is_string($roles)) {
            $roles = [$roles];
        }

        return $query->whereHas('assignedRoles', function ($q) use ($roles) {
            $q->whereIn('name', $roles);
        });
    }

    public function hasRole(string|array $roles): bool
    {
        $activeRole = $this->getActiveRole();
        if (!$activeRole) {
            return false;
        }

        if (is_array($roles)) {
            return in_array($activeRole->name, $roles);
        }

        return $activeRole->name === $roles;
    }

    public function hasPermissionTo(string $ability): bool
    {
        $activeRole = $this->getActiveRole();
        if (!$activeRole) {
            return false;
        }
        
        if ($activeRole->is_super_admin || ($activeRole->is_system && $activeRole->name === 'Super Admin')) {
            return true;
        }

        $parts = explode('.', $ability);
        
        return $activeRole->permissions()
            ->where(function ($query) use ($parts, $ability) {
                if (count($parts) === 2) {
                    $query->where('feature', $parts[0])->where('action', $parts[1]);
                } else {
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
        $activeRole = $this->getActiveRole();
        if (!$activeRole) {
            return collect();
        }
        
        if ($activeRole->is_super_admin || ($activeRole->is_system && $activeRole->name === 'Super Admin')) {
            return Permission::all()->map(function ($p) {
                return (object)['name' => $p->feature . '.' . $p->action];
            });
        }

        return $activeRole->permissions->map(function ($p) {
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

    public function getManagedDepartmentIds()
    {
        $activeRole = $this->getActiveRole();
        if (!$activeRole || $activeRole->is_system) {
            return [];
        }

        $userRoleId = \Illuminate\Support\Facades\DB::table('user_roles')
            ->where('user_id', $this->id)
            ->where('role_id', $activeRole->id)
            ->value('id');

        if (!$userRoleId) return [];

        return \Illuminate\Support\Facades\DB::table('user_role_departments')
            ->where('user_role_id', $userRoleId)
            ->pluck('department_id')
            ->toArray();
    }

    public function assignedRoles()
    {
        return $this->belongsToMany(Role::class, 'user_roles')->withTimestamps();
    }

    protected $appends = ['needs_password_change', 'roles', 'role_departments'];

    public function getRolesAttribute()
    {
        return $this->assignedRoles;
    }

    public function getRoleDepartmentsAttribute()
    {
        $userRoles = \Illuminate\Support\Facades\DB::table('user_roles')
            ->where('user_id', $this->id)
            ->get();
            
        if ($userRoles->isEmpty()) return [];
            
        $departments = \Illuminate\Support\Facades\DB::table('user_role_departments')
            ->whereIn('user_role_id', $userRoles->pluck('id'))
            ->get();
            
        $result = [];
        foreach ($userRoles as $ur) {
            $depts = $departments->where('user_role_id', $ur->id)->pluck('department_id')->toArray();
            if (!empty($depts)) {
                $result[] = [
                    'role_id' => $ur->role_id,
                    'department_ids' => $depts
                ];
            }
        }
        return $result;
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

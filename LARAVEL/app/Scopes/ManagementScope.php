<?php

namespace App\Scopes;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;
use Illuminate\Support\Facades\Auth;

class ManagementScope implements Scope
{
    /**
     * Apply the scope to a given Eloquent query builder.
     *
     * @param  \Illuminate\Database\Eloquent\Builder  $builder
     * @param  \Illuminate\Database\Eloquent\Model  $model
     * @return void
     */
    public function apply(Builder $builder, Model $model)
    {
        // Only apply if there is an authenticated user
        if (Auth::check()) {
            $user = Auth::user();

            // Super Admin bypasses all scope restrictions
            if ($user->hasRole('Super Admin')) {
                return;
            }

            // Get the managed department IDs for the user's active role
            $managedDeptIds = $user->getManagedDepartmentIds();
            $userId = $user->id;

            $builder->where(function ($query) use ($userId, $managedDeptIds, $model) {
                // If model is Employee
                if ($model instanceof \App\Models\Employee) {
                    $query->where('user_id', $userId);
                    if (!empty($managedDeptIds)) {
                        $query->orWhereHas('user', function ($u) use ($managedDeptIds) {
                            $u->whereIn('department_id', $managedDeptIds);
                        });
                    }
                }
                // If model is Task (assigned_to is employee_id)
                elseif ($model instanceof \App\Models\Task) {
                    $query->whereHas('employee', function ($q) use ($userId, $managedDeptIds) {
                        $q->where('user_id', $userId);
                        if (!empty($managedDeptIds)) {
                            $q->orWhereHas('user', function ($u) use ($managedDeptIds) {
                                $u->whereIn('department_id', $managedDeptIds);
                            });
                        }
                    })->orWhere('assigned_by', $userId); // also allow tasks created by user
                }
                // If model is AssetAssignment (has employee_id)
                elseif ($model instanceof \App\Models\AssetAssignment) {
                    $query->whereHas('employee', function ($q) use ($userId, $managedDeptIds) {
                        $q->where('user_id', $userId);
                        if (!empty($managedDeptIds)) {
                            $q->orWhereHas('user', function ($u) use ($managedDeptIds) {
                                $u->whereIn('department_id', $managedDeptIds);
                            });
                        }
                    });
                }
                // For all other related models with employee_id (Attendance, Leave, Contract, Payslip, etc.)
                else {
                    $query->whereHas('employee', function ($q) use ($userId, $managedDeptIds) {
                        $q->where('user_id', $userId);
                        if (!empty($managedDeptIds)) {
                            $q->orWhereHas('user', function ($u) use ($managedDeptIds) {
                                $u->whereIn('department_id', $managedDeptIds);
                            });
                        }
                    });
                }
            });
        }
    }
}

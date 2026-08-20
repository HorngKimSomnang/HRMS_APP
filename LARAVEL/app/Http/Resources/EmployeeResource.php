<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EmployeeResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'employee_code' => $this->employee_code,
            'first_name' => $this->first_name,
            'last_name' => $this->last_name,
            'name' => $this->name, // Computed attribute
            'full_name' => $this->name,
            'email' => $this->user?->email,
            'phone' => $this->phone,
            'address' => $this->address,
            'gender' => $this->gender,
            'dob' => $this->dob,
            'profile_picture_url' => $this->profile_picture ? url('/api/file/' . $this->profile_picture) : null,

            'department_id' => $this->user?->department_id ?? $this->department_id,
            'department' => $this->user?->department ? $this->user->department->name : ($this->department ? $this->department->name : null),
            'all_departments' => (count($this->user?->getManagedDepartmentIds() ?? []) > 0)
                ? \App\Models\Department::whereIn('id', $this->user->getManagedDepartmentIds())->pluck('name')->toArray()
                : collect([$this->user?->department ? $this->user->department->name : ($this->department ? $this->department->name : null)])->filter()->unique()->values()->toArray(),
            'managed_departments' => $this->user ? \App\Models\Department::whereIn('id', $this->user->getManagedDepartmentIds())->pluck('name')->toArray() : [],
            'role_departments' => $this->user ? \Illuminate\Support\Facades\DB::table('user_roles')
                ->join('user_role_departments', 'user_roles.id', '=', 'user_role_departments.user_role_id')
                ->where('user_roles.user_id', $this->user->id)
                ->get()
                ->groupBy('role_id')
                ->map(fn($group) => $group->pluck('department_id')->map('intval')->toArray())
                ->toArray() : [],
            'job_title' => $this->job_title,
            // 'branch_id' => $this->branch_id,
            // 'branch' => $this->branch ? $this->branch->name : null,
            // 'company_id' => $this->company_id,
            // 'company' => $this->company ? $this->company->name : null,
            'salary' => ($this->activeContract ?? $this->contracts()->latest('start_date')->first())?->salary ?? 0,
            'joining_date' => $this->joining_date,
            'status' => $this->status,
             // Include role from User
            'role' => $this->user?->getRoleNames()->join(', '),
            'roles' => $this->user?->assignedRoles,
            'archived_at' => $this->deleted_at?->toIso8601String(),
            'restore_conflict' => (bool) ($this->restore_conflict ?? false),
            'conflicting_employee_code' => $this->conflicting_employee_code ?? null,
            'shift_id' => $this->shift_id,
            'shift' => $this->shift,
            'contracts' => $this->whenLoaded('contracts'),
            'documents' => $this->formatDocuments(),
        ];
    }

    private function formatDocuments()
    {
        $docs = $this->documents ?? ['marital_status' => 'Single', 'attachments' => []];
        if (isset($docs['attachments'])) {
            foreach ($docs['attachments'] as &$attachment) {
                $path = $attachment['path'] ?? $attachment['file_path'] ?? null;
                if ($path) {
                    $attachment['url'] = url('/api/file/' . $path);
                }
            }
        }
        return $docs;
    }
}

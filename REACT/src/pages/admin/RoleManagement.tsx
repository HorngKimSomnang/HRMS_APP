/* eslint-disable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '@/services/api';
import { toast } from 'sonner';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search, Users, Building2, Briefcase, Info, Save, Pencil, Eye } from 'lucide-react';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';
import { useAuth } from '@/context/AuthContext';

export default function RoleManagement() {
  const { hasPermission, user } = useAuth();
  const isSuperAdmin = user?.roles?.some((r: any) => r.is_super_admin) ?? false;
  const canManageAccess = hasPermission('employees.manage_access');

  const [users, setUsers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    role_ids: [] as number[],
    department_id: '' as string | number,
    managed_departments: [] as number[],
  });

  const fetchUsers = async () => {
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data);
    } catch {
      toast.error('Failed to load users');
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await api.get('/admin/roles');
      setRoles(res.data);
    } catch {
      toast.error('Failed to load roles');
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await api.get('/departments');
      const data = Array.isArray(res.data) ? res.data : res.data.data;
      setDepartments(data || []);
    } catch {
      toast.error('Failed to load departments');
    }
  };

  const loadData = () => {
    fetchUsers();
    fetchRoles();
    fetchDepartments();
  };

  useEffect(() => {
    loadData();
  }, []);

  useLiveRefresh(loadData, { resources: ['users', 'employees', 'roles', 'departments', 'admins'] });

  const [searchParams, setSearchParams] = useSearchParams();
  const targetUserId = searchParams.get('userId');

  useEffect(() => {
    if (targetUserId && users.length > 0) {
      const user = users.find(u => u.id.toString() === targetUserId);
      if (user && !isModalOpen) {
        handleEditClick(user);
        // Remove the query param so it doesn't reopen on refresh
        searchParams.delete('userId');
        setSearchParams(searchParams);
      }
    }
  }, [targetUserId, users, isModalOpen, searchParams, setSearchParams]);

  const handleEditClick = (user: any) => {
    setSelectedUser(user);
    if (user.employee) {
      const initialDepts = user.managed_departments?.map((d: any) => d.id) || [];
      const initialRoleIds = user.roles?.map((r: any) => r.id) || (user.role_id ? [user.role_id] : []);
      setFormData({
        role_ids: initialRoleIds,
        department_id: user.department_id || user.employee?.department_id || '',
        managed_departments: initialDepts,
      });
    } else {
      setFormData({ role_ids: [], department_id: '', managed_departments: [] });
    }
    setIsModalOpen(true);
  };

  const handleFieldChange = (e: any) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const toggleManagedDepartment = (deptId: number) => {
    setFormData(prev => ({
      ...prev,
      managed_departments: prev.managed_departments.includes(deptId) 
        ? prev.managed_departments.filter(id => id !== deptId)
        : [...prev.managed_departments, deptId]
    }));
  };

  const handleSave = async () => {
    if (!selectedUser?.employee) return;
    if (formData.role_ids.length === 0) {
      toast.error('At least one role is required.');
      return;
    }

    const initialDepts = selectedUser.managed_departments?.map((d: any) => d.id) || [];
    const initialRoleIds = selectedUser.roles?.map((r: any) => r.id) || (selectedUser.role_id ? [selectedUser.role_id] : []);

    const isRolesUnchanged = JSON.stringify([...formData.role_ids].sort()) === JSON.stringify([...initialRoleIds].sort());
    const isDeptUnchanged = Number(formData.department_id) === (selectedUser.department_id || selectedUser.employee?.department_id);
    const isManagedDeptsUnchanged = JSON.stringify([...formData.managed_departments].sort()) === JSON.stringify([...initialDepts].sort());

    if (isRolesUnchanged && isDeptUnchanged && isManagedDeptsUnchanged) {
      toast.error("Cannot save: The selected roles and departments are exactly the same as the current ones.");
      return;
    }

    setLoading(true);
    try {
      const targetRoleIsSuperAdmin = roles.some(r => formData.role_ids.includes(r.id) && r.is_super_admin);
      const isEmployeeOnly = roles.some(r => formData.role_ids.includes(r.id) && r.name === 'Employee') && !roles.some(r => formData.role_ids.includes(r.id) && r.name !== 'Employee');

      const payload = {
        role_ids: formData.role_ids,
        department_id: formData.department_id,
        managed_departments: targetRoleIsSuperAdmin ? departments.map(d => d.id) : (isEmployeeOnly ? [] : formData.managed_departments),
      };
      await api.post(`/employees/${selectedUser.employee.id}/permissions/bulk`, payload);
      toast.success('Role and department management updated successfully!');
      setIsModalOpen(false);
      fetchUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update employee details');
    }
    setLoading(false);
  };

  const filteredUsers = users.filter((u) => {
    return u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           u.email.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Access Management"
        subtitle="Manage roles and department oversight for employees."
        gradient="from-blue-600 via-indigo-600 to-violet-600"
      />

      <div className="border border-blue-100/80 rounded-2xl bg-card shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-600" />
            Employee Directory ({filteredUsers.length})
          </h3>
          <div className="relative w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              className="pl-9 bg-white shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="w-64">Employee</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Emp Code</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                  No employees found
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((u) => {
                const roleName = roles.find(r => r.id === u.role_id)?.name || 'No Role';
                return (
                  <TableRow key={u.id} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                          {getInitials(u.name)}
                        </div>
                        <span className="text-slate-800">{u.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-600">{u.email}</TableCell>
                    <TableCell>
                      {u.employee?.employee_code ? (
                        <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 border border-indigo-100">
                          {u.employee.employee_code}
                        </span>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="text-slate-600">
                      <div className="flex flex-wrap gap-1">
                        {u.roles && u.roles.length > 0 ? (
                          u.roles.map((r: any) => (
                            <span key={r.id} className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 border border-indigo-100">
                              {r.name}
                            </span>
                          ))
                        ) : (
                          <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                            {roleName}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleEditClick(u)} 
                          className="h-8 w-8 text-slate-500 hover:text-slate-700 hover:bg-slate-100" 
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {canManageAccess && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => isSuperAdmin && handleEditClick(u)} 
                            disabled={!isSuperAdmin}
                            className={`h-8 w-8 transition-colors ${isSuperAdmin ? 'text-blue-600 hover:text-blue-700 hover:bg-blue-50' : 'text-slate-300 cursor-not-allowed opacity-60'}`}
                            title={isSuperAdmin ? 'Edit Access' : 'Edit Access (Super Admin only)'}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-6 overflow-hidden">
          <DialogHeader>
            <DialogTitle>Edit Employee Access</DialogTitle>
          </DialogHeader>

          {selectedUser && (
            <div className="flex-1 overflow-y-auto px-1.5 -mx-1.5 pr-3 -mr-3 space-y-6 py-4">
              <div className="flex items-center gap-3.5 pb-4 border-b border-slate-100">
                <div className="h-12 w-12 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-600 text-white flex items-center justify-center font-bold text-base shadow-md">
                  {getInitials(selectedUser.name)}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight">{selectedUser.name}</h2>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    <span>{selectedUser.email}</span>
                    {selectedUser.employee?.employee_code && (
                      <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 border border-indigo-100">
                        {selectedUser.employee.employee_code}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {!selectedUser.employee ? (
                <div className="p-4 bg-amber-50 text-amber-900 rounded-xl border border-amber-200 text-sm flex items-start gap-3">
                  <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold mb-0.5">No Associated Employee Record</div>
                    This user doesn't have an associated employee record yet. Direct permissions can only be managed for active employees.
                  </div>
                </div>
              ) : (
                <div className="space-y-7">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-indigo-700 font-semibold">
                      <Briefcase className="h-4 w-4" />
                      <h3 className="text-base font-bold text-slate-900">Employee Details</h3>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <p className="text-xs text-muted-foreground font-semibold mb-1">Primary Department</p>
                        <select 
                            name="department_id"
                            value={formData.department_id}
                            onChange={handleFieldChange}
                            required
                            disabled={!isSuperAdmin}
                            className="w-full flex h-10 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <option value="" disabled>Select department</option>
                            {departments.map(dept => (
                                <option key={dept.id} value={dept.id}>{dept.name}</option>
                            ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <p className="text-xs text-muted-foreground font-semibold mb-1">Roles (Select multiple)</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto border border-slate-200 rounded-xl p-3 bg-slate-50/50 pr-2">
                          {roles.map(role => {
                            const isChecked = formData.role_ids.includes(role.id);
                            return (
                              <label 
                                key={role.id} 
                                className={`flex items-center gap-2.5 p-3 rounded-xl border text-sm font-medium cursor-pointer transition-all ${
                                  isChecked 
                                    ? 'border-indigo-500 bg-indigo-50/70 text-indigo-950 shadow-sm ring-1 ring-indigo-500/20' 
                                    : 'border-slate-200/80 bg-white hover:bg-slate-50 text-slate-700'
                                }`}
                              >
                                <input 
                                  type="checkbox" 
                                  checked={isChecked}
                                  disabled={!isSuperAdmin}
                                  onChange={() => {
                                    if (!isSuperAdmin) return;
                                    setFormData(prev => {
                                      const exists = prev.role_ids.includes(role.id);
                                      const nextIds = exists 
                                        ? prev.role_ids.filter(id => id !== role.id) 
                                        : [...prev.role_ids, role.id];
                                      return { ...prev, role_ids: nextIds };
                                    });
                                  }}
                                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                                />
                                <span className="truncate">{role.name}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-indigo-700 font-semibold">
                      <Building2 className="h-4 w-4" />
                      <h3 className="text-base font-bold text-slate-900">Department Management</h3>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Select the department(s) this user is authorized to manage.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto pr-2">
                      {departments.map(dept => {
                        const targetRoleIsSuperAdmin = roles.some(r => formData.role_ids.includes(r.id) && r.is_super_admin);
                        const isEmployeeOnly = roles.some(r => formData.role_ids.includes(r.id) && r.name === 'Employee') && !roles.some(r => formData.role_ids.includes(r.id) && r.name !== 'Employee');
                        // Disable checkboxes if the acting user is not SA, or target role auto-controls departments
                        const disabled = !isSuperAdmin || targetRoleIsSuperAdmin || isEmployeeOnly;
                        const isManaged = targetRoleIsSuperAdmin ? true : (isEmployeeOnly ? false : formData.managed_departments.includes(dept.id));
                        
                        return (
                          <label 
                            key={dept.id} 
                            className={`flex items-center gap-2.5 p-3 rounded-xl border text-sm font-medium transition-all ${disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'} ${
                              isManaged 
                                ? 'border-indigo-500 bg-indigo-50/70 text-indigo-950 shadow-sm ring-1 ring-indigo-500/20' 
                                : 'border-slate-200/80 bg-white hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <input 
                              type="checkbox" 
                              checked={isManaged}
                              disabled={disabled}
                              onChange={() => !disabled && toggleManagedDepartment(dept.id)}
                              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            <span className="truncate">{dept.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            {isSuperAdmin && selectedUser?.employee && (
              <Button 
                onClick={handleSave} 
                disabled={loading} 
                className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2 shadow-sm"
              >
                <Save className="w-4 h-4" />
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

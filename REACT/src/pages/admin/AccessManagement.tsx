import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '@/services/api';
import { toast } from 'sonner';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Shield, Save, Users, Building2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { invalidateApiCache } from '@/services/apiCache';

interface RoleDepartment {
  role_id: number;
  department_ids: number[];
}

interface AccessFormData {
  role_ids: number[];
  department_id: string; // Primary department
  role_departments: RoleDepartment[];
}

export default function AccessManagement() {
  const { employeeId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isCurrentUserSuperAdmin = user?.roles?.some((r: any) => r.is_super_admin) ?? false;

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  
  const [usersList, setUsersList] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  
  const [formData, setFormData] = useState<AccessFormData>({
    role_ids: [],
    department_id: '',
    role_departments: []
  });

  const populateUserData = (userObj: any) => {
    if (!userObj) {
      setFormData({ role_ids: [], department_id: '', role_departments: [] });
      return;
    }
    setFormData({
      role_ids: userObj.assigned_roles?.map((r: any) => r.id) || userObj.roles?.map((r: any) => r.id) || [],
      department_id: userObj.department_id?.toString() || '',
      role_departments: userObj.role_departments || []
    });
  };

  useEffect(() => {
    fetchBaseData();
  }, [employeeId]);

  const fetchBaseData = async () => {
    try {
      setInitialLoading(true);
      const [usersRes, rolesRes, deptsRes] = await Promise.all([
        api.get('/admin/users'),
        api.get('/admin/roles'),
        api.get('/departments')
      ]);

      setUsersList(usersRes.data);
      setRoles(rolesRes.data);
      setDepartments(deptsRes.data);

      let targetUser = null;
      if (employeeId) {
        targetUser = usersRes.data.find((u: any) => u.employee?.id?.toString() === employeeId);
      }
      if (!targetUser && usersRes.data.length > 0) {
        targetUser = usersRes.data[0];
      }

      if (targetUser) {
        setSelectedUserId(targetUser.id.toString());
        populateUserData(targetUser);
      }
    } catch (error) {
      toast.error('Failed to load access management data');
    } finally {
      setInitialLoading(false);
    }
  };

  const selectedUser = useMemo(() => {
    if (!selectedUserId) return null;
    return usersList.find(u => u.id.toString() === selectedUserId) || null;
  }, [selectedUserId, usersList]);

  const handleUserChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextUserId = e.target.value;
    setSelectedUserId(nextUserId);
    const u = usersList.find(user => user.id.toString() === nextUserId);
    if (u) {
      populateUserData(u);
      if (u.employee?.id) {
        navigate(`/access-management/${u.employee.id}`, { replace: true });
      } else {
        navigate(`/access-management`, { replace: true });
      }
    }
  };

  const handleRoleToggle = (roleId: number) => {
    setFormData(prev => {
      const isSelected = prev.role_ids.includes(roleId);
      const newRoleIds = isSelected 
        ? prev.role_ids.filter(id => id !== roleId)
        : [...prev.role_ids, roleId];
        
      let newRoleDepts = [...prev.role_departments];
      if (!isSelected) {
        const role = roles.find(r => r.id === roleId);
        if (role && role.is_department_scoped && !newRoleDepts.find(rd => rd.role_id === roleId)) {
          newRoleDepts.push({ role_id: roleId, department_ids: [] });
        }
      } else {
        newRoleDepts = newRoleDepts.filter(rd => rd.role_id !== roleId);
      }
        
      return { ...prev, role_ids: newRoleIds, role_departments: newRoleDepts };
    });
  };

  const handleDepartmentScopeToggle = (roleId: number, deptId: number) => {
    setFormData(prev => {
      const nextRoleDepts = [...prev.role_departments];
      const index = nextRoleDepts.findIndex(r => r.role_id === roleId);
      
      if (index !== -1) {
        const depts = nextRoleDepts[index].department_ids;
        nextRoleDepts[index] = {
          ...nextRoleDepts[index],
          department_ids: depts.includes(deptId)
            ? depts.filter(id => id !== deptId)
            : [...depts, deptId]
        };
      } else {
        nextRoleDepts.push({ role_id: roleId, department_ids: [deptId] });
      }
      return { ...prev, role_departments: nextRoleDepts };
    });
  };

  const handleSave = async () => {
    if (!selectedUser?.employee?.id) {
      toast.error('Selected user does not have an associated employee record.');
      return;
    }
    
    if (formData.role_ids.length === 0) {
      toast.error('At least one role is required.');
      return;
    }
    
    setLoading(true);
    try {
      await api.post(`/employees/${selectedUser.employee.id}/permissions/bulk`, formData);
      toast.success('Access updated successfully!');
      
      invalidateApiCache(['admin', 'departments', 'employees', 'users', 'roles']);
      
      await fetchBaseData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update access');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex justify-center items-center h-64 text-slate-500">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mr-3"></div>
        Loading access data...
      </div>
    );
  }

  const selectedRolesDetails = roles.filter(r => formData.role_ids.includes(r.id));
  const hasSuperAdminRole = selectedRolesDetails.some(r => r.is_super_admin);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <PageHeader 
        title="Access Management" 
        subtitle="Manage user roles and their department visibility scopes."
        icon={Shield}
      />

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        {/* Header / User Selector */}
        <div className="p-6 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="w-full md:w-96 space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block">
              Select User to Manage
            </label>
            <select
              value={selectedUserId}
              onChange={handleUserChange}
              className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <option value="" disabled>Select a user...</option>
              {usersList.map(u => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
          
          {selectedUser && selectedUser.employee && (
            <div className="flex gap-3">
              <Button 
                onClick={handleSave} 
                disabled={loading || !isCurrentUserSuperAdmin} 
                className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm px-6 h-11"
              >
                <Save className="w-4 h-4 mr-2" />
                {loading ? 'Saving...' : 'Save Access Changes'}
              </Button>
            </div>
          )}
        </div>

        {!selectedUser?.employee ? (
          <div className="p-12 text-center flex flex-col items-center justify-center bg-slate-50/30">
            <Users className="w-12 h-12 text-slate-300 mb-4" />
            <p className="text-lg font-medium text-slate-600">No Employee Record</p>
            <p className="text-sm text-slate-500 mt-1 max-w-md">
              The selected user does not have an associated employee record. Access management requires an active employee profile.
            </p>
          </div>
        ) : (
          <div className="p-6 md:p-8 space-y-10">
            
            {/* Roles Section */}
            <section className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-indigo-500" />
                  Assigned Roles
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  Select one or more roles for this user. Roles dictate what actions the user can perform.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {roles.map(role => {
                  const isSelected = formData.role_ids.includes(role.id);
                  return (
                    <label 
                      key={role.id} 
                      className={`flex items-start gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer select-none ${
                        isSelected 
                          ? 'border-indigo-600 bg-indigo-50/30 shadow-sm' 
                          : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                      }`}
                    >
                      <input 
                        type="checkbox" 
                        checked={isSelected}
                        disabled={!isCurrentUserSuperAdmin}
                        onChange={() => handleRoleToggle(role.id)}
                        className="mt-0.5 w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
                      />
                      <div>
                        <p className={`font-medium ${isSelected ? 'text-indigo-950' : 'text-slate-700'}`}>
                          {role.name}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </section>

            <hr className="border-slate-100" />

            {/* Department Scopes Section */}
            <section className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-indigo-500" />
                  Department Scopes
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  Configure which departments this user can manage or view data for, based on their assigned roles.
                </p>
              </div>

              <div className="space-y-8">
                {selectedRolesDetails.map(role => (
                  <div key={role.id} className="bg-slate-50/50 border border-slate-200 rounded-xl p-6">
                    <h4 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
                      Scope for <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 text-sm">{role.name}</span>
                    </h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {departments.map(dept => {
                        const rd = formData.role_departments.find(r => r.role_id === role.id);
                        const isImplicitlyGranted = Boolean(role.is_super_admin);
                        const isExplicitlyGranted = Boolean(rd?.department_ids.includes(dept.id));
                        const isManaged = isImplicitlyGranted || isExplicitlyGranted;
                        
                        // Disable editing if: current user is not superadmin, or the scope is implicitly granted (Super Admin role), 
                        // or if the role itself doesn't support department scoping (e.g. Employee)
                        const isDisabled = !isCurrentUserSuperAdmin || isImplicitlyGranted || (!role.is_department_scoped && !role.is_super_admin);
                        
                        return (
                          <label 
                            key={dept.id} 
                            className={`flex items-center gap-3 p-3.5 rounded-lg border transition-all ${
                              isManaged 
                                ? 'border-indigo-200 bg-white shadow-sm' 
                                : 'border-slate-200 bg-white/50 hover:bg-white cursor-pointer'
                            } ${isDisabled ? 'opacity-80 cursor-not-allowed' : ''}`}
                          >
                            <input 
                              type="checkbox" 
                              checked={isManaged}
                              disabled={isDisabled}
                              onChange={() => {
                                if (!isDisabled) {
                                  handleDepartmentScopeToggle(role.id, dept.id);
                                }
                              }}
                              className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 disabled:opacity-70"
                            />
                            <span className={`text-sm font-medium ${isManaged ? 'text-slate-900' : 'text-slate-600'}`}>
                              {dept.name}
                            </span>
                            {isImplicitlyGranted && (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-auto opacity-70" />
                            )}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {selectedRolesDetails.length === 0 && (
                  <div className="text-center p-8 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                    <p className="text-slate-500">No roles selected.</p>
                  </div>
                )}
              </div>
            </section>

          </div>
        )}
      </div>
    </div>
  );
}

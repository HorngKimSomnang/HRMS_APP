/* eslint-disable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */
import React, { useState, useEffect } from 'react';
import api from '@/services/api';
import { toast } from 'sonner';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Shield, Info, Save, Plus, Trash2, List } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/Input';

const ACTION_ORDER = [
  'view',
  'create',
  'edit',
  'delete',
  'restore',
  'assign',
  'approve',
  'upload',
  'generate',
  'mark_paid',
  'auto_activate',
  'return',
  'resend_credentials',
  'view_employees'
];

// These permissions are enforced by is_super_admin on the backend regardless of what
// is stored in the permission matrix. Showing them as always-locked prevents confusion.
const SUPER_ADMIN_ONLY_PERMS = new Set([
  'roles.edit',
  'roles.delete',
  'roles.create',
]);

export default function PermissionManagement() {
  const { user } = useAuth();
  const isCurrentUserSuperAdmin = user?.roles?.some((r: any) => r.is_super_admin) ?? false;

  const hasPermission = (permission: string) => {
    if (isCurrentUserSuperAdmin) return true;
    const allPerms = [
      ...(user?.permissions || []),
      ...((user as any)?.direct_permissions || [])
    ];
    return allPerms.some((p: any) => (typeof p === 'string' ? p : p?.name) === permission);
  };

  const [roles, setRoles] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [groupedPermissions, setGroupedPermissions] = useState<Record<string, string[]>>({});
  const [sidebarSections, setSidebarSections] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(false);

  // New Permission State
  const [isCreatePermModalOpen, setIsCreatePermModalOpen] = useState(false);
  const [newPermFeature, setNewPermFeature] = useState('');
  const [newPermAction, setNewPermAction] = useState('');

  // Permissions List State
  const [isPermListModalOpen, setIsPermListModalOpen] = useState(false);
  const [deletePermConfirmOpen, setDeletePermConfirmOpen] = useState(false);
  const [permToDelete, setPermToDelete] = useState<any>(null);
  
  // Selected Role State
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [permRole, setPermRole] = useState<any>(null);
  const [permFormData, setPermFormData] = useState<string[]>([]);
  const [permViewOnly, setPermViewOnly] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedRoleId) {
      const role = roles.find((r) => r.id === parseInt(selectedRoleId));
      if (role) {
        handleRoleSelect(role);
      }
    } else {
      setPermRole(null);
      setPermFormData([]);
      setPermViewOnly(false);
    }
  }, [selectedRoleId, roles]);

  const loadData = async () => {
    try {
      const [rolesRes, permsRes, featuresRes] = await Promise.all([
        api.get('/admin/roles'),
        api.get('/admin/permissions'),
        api.get('/admin/features')
      ]);
      
      setRoles(rolesRes.data);
      const perms = permsRes.data;
      setPermissions(perms);
      
      const defaultRole = rolesRes.data.find((r: any) => r.name.toLowerCase() === 'manager') 
        || rolesRes.data.find((r: any) => r.name.toLowerCase() === 'employee' || r.name.toLowerCase() === 'user');
        
      if (defaultRole) {
        setSelectedRoleId(defaultRole.id.toString());
      } else if (rolesRes.data.length > 0) {
        setSelectedRoleId(rolesRes.data[0].id.toString());
      }
      
      const featuresData = featuresRes.data;
      setSidebarSections(featuresData);
      
      const grouped: Record<string, string[]> = {};
      
      perms.forEach((p: any) => {
        if (!grouped[p.feature]) grouped[p.feature] = [];
        grouped[p.feature].push(p.name);
      });
      
      Object.keys(grouped).forEach(feature => {
        grouped[feature].sort((a, b) => {
          const actionA = a.split('.')[1] || a;
          const actionB = b.split('.')[1] || b;
          const indexA = ACTION_ORDER.indexOf(actionA);
          const indexB = ACTION_ORDER.indexOf(actionB);
          
          if (indexA !== -1 && indexB !== -1) return indexA - indexB;
          if (indexA !== -1) return -1;
          if (indexB !== -1) return 1;
          return actionA.localeCompare(actionB);
        });
      });
      
      setGroupedPermissions(grouped);
      
    } catch {
      toast.error('Failed to load roles and permissions');
    }
  };

  const handleRoleSelect = (role: any) => {
    // Determine view only based on user rights and role type
    const viewOnly = !isCurrentUserSuperAdmin || role.is_system;
    setPermRole(role);
    setPermViewOnly(viewOnly);
    setLoading(true);
    api.get(`/admin/roles/${role.id}`).then(res => {
      setPermFormData(res.data.permissions?.map((p: any) => p.name) || []);
    }).catch(() => {
      toast.error('Failed to fetch permissions for the role.');
    }).finally(() => {
      setLoading(false);
    });
  };

  const handlePermMasterCheck = (checked: boolean) => {
    if (permViewOnly) return;
    if (checked) {
      setPermFormData(permissions.map(p => p.name));
    } else {
      setPermFormData([]);
    }
  };

  const handlePermRowCheck = (feature: string, checked: boolean) => {
    if (permViewOnly) return;
    const rowPerms = groupedPermissions[feature] || [];
    if (checked) {
      setPermFormData(prev => Array.from(new Set([...prev, ...rowPerms])));
    } else {
      setPermFormData(prev => prev.filter(p => !rowPerms.includes(p)));
    }
  };

  const handleSavePermissions = async () => {
    if (!permRole) return;
    
    setLoading(true);
    try {
      await api.put(`/admin/roles/${permRole.id}`, {
        name: permRole.name,
        permissions: permFormData
      });
      toast.success('Permissions updated successfully');
      // reload roles data so we have the updated permissions count, etc.
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save permissions');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePermission = async () => {
    if (!newPermFeature || !newPermAction) {
      toast.error('Both feature and action are required.');
      return;
    }
    
    setLoading(true);
    try {
      await api.post('/admin/permissions', { feature: newPermFeature, action: newPermAction });
      toast.success('Permission created successfully');
      setIsCreatePermModalOpen(false);
      setNewPermFeature('');
      setNewPermAction('');
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create permission');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePermission = async () => {
    if (!permToDelete) return;
    
    setLoading(true);
    try {
      await api.delete(`/admin/permissions/${permToDelete.id}`);
      toast.success('Permission deleted successfully');
      setDeletePermConfirmOpen(false);
      setPermToDelete(null);
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete permission');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <PageHeader 
        title="Permission Management" 
        subtitle="Configure fine-grained feature and functional permissions for specific roles."
        icon={Shield}
        action={
          isCurrentUserSuperAdmin && hasPermission('permissions.manage') && (
            <div className="flex items-center gap-2">
              <Button 
                onClick={() => setIsPermListModalOpen(true)}
                variant="secondary"  
                className="h-10 gap-2 bg-white/20 hover:bg-white/30 text-white border-none shadow-sm backdrop-blur-sm transition-all"
              >
                <List className="w-4 h-4 mr-0.5" />
                All Permissions
              </Button>
              <Button 
                onClick={() => {
                  setNewPermFeature(sidebarSections[0]?.features[0] || '');
                  setNewPermAction('');
                  setIsCreatePermModalOpen(true);
                }}
                variant="secondary"  
                className="h-10 gap-2 bg-white/20 hover:bg-white/30 text-white border-none shadow-sm backdrop-blur-sm transition-all"
              >
                <div className="border border-white/60 rounded-sm w-3.5 h-3.5 flex items-center justify-center mr-0.5" />
                New Permission
              </Button>
            </div>
          )
        }
      />

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">
              Select Role to Edit
            </label>
            <select
              value={selectedRoleId}
              onChange={(e) => setSelectedRoleId(e.target.value)}
              className="flex h-10 w-full md:w-80 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >

              {roles.map(role => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>
          
          {permRole && (
            <div className="flex gap-3 mt-4 md:mt-0">
              <Button 
                onClick={handleSavePermissions} 
                disabled={loading || permViewOnly || permRole?.is_system} 
                className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
              >
                <Save className="w-4 h-4 mr-2" />
                {loading ? 'Saving...' : 'Save Permissions'}
              </Button>
            </div>
          )}
        </div>

        {permRole ? (
          <div className="p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              Permissions for <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-sm">{permRole.name}</span>
            </h3>

            {permRole?.is_system && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs px-4 py-3 rounded-lg flex items-center gap-2 mb-6">
                <Info className="w-4 h-4 shrink-0" />
                <span>Permissions of system roles are built-in and cannot be modified.</span>
              </div>
            )}
            
            <div className="space-y-6">
              {sidebarSections.map((section) => {
                const sectionFeatures = section.features.filter((f: string) => groupedPermissions[f]);
                if (sectionFeatures.length === 0) return null;

                return (
                  <React.Fragment key={section.name}>
                    {sectionFeatures.map((feature: string) => {
                      const featurePerms = groupedPermissions[feature];
                      const allChecked = featurePerms.every(p => permFormData.includes(p));

                      return (
                        <div key={feature} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                          <div className="bg-slate-50 border-b border-slate-200 p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-1 h-5 bg-rose-500 rounded-full hidden"></div>
                              <h4 className="font-semibold text-slate-800 capitalize">
                                {feature === 'roles' ? 'Roles & Permissions' : feature === 'settings_general' ? 'Settings (General)' : feature === 'settings_attendance' ? 'Settings (Attendance)' : feature === 'settings_leaves' ? 'Settings (Leaves)' : feature === 'settings_payroll' ? 'Settings (Payroll)' : feature === 'settings_security' ? 'Settings (Security)' : feature.replace(/_/g, ' ')}
                              </h4>
                            </div>
                            <button
                              type="button"
                              className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${permViewOnly || permRole?.is_system || !isCurrentUserSuperAdmin ? 'opacity-50 cursor-not-allowed bg-slate-100 text-slate-400' : 'bg-slate-200/60 hover:bg-slate-200 text-slate-700'}`}
                              onClick={() => handlePermRowCheck(feature, !allChecked)}
                              disabled={permViewOnly || permRole?.is_system || !isCurrentUserSuperAdmin}
                            >
                              {allChecked ? 'Deselect All' : 'Select All in Module'}
                            </button>
                          </div>
                          
                          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                            {featurePerms.map(permName => {
                              const actionName = permName.split('.')[1] || permName;
                              const isChecked = permFormData.includes(permName);
                              const isSuperAdminOnly = SUPER_ADMIN_ONLY_PERMS.has(permName);
                              const isDisabled = permViewOnly || !isCurrentUserSuperAdmin || isSuperAdminOnly;
                              
                              const displayIsChecked = isSuperAdminOnly ? false : isChecked;

                              return (
                                <div key={permName} className="flex items-center justify-between py-2 group">
                                  <div className="flex items-center gap-2">
                                    <span className={`text-sm font-medium ${isDisabled ? 'text-slate-400' : 'text-slate-700'} capitalize`}>
                                      {actionName.replace(/_/g, ' ')} {feature === 'settings_general' ? '' : feature.replace(/_/g, ' ')}
                                    </span>
                                    {isSuperAdminOnly && (
                                      <Info className="w-3.5 h-3.5 text-slate-400" title="Restricted to Super Admin" />
                                    )}
                                  </div>
                                  
                                  <button
                                    type="button"
                                    role="switch"
                                    aria-checked={displayIsChecked}
                                    disabled={isDisabled}
                                    onClick={() => {
                                      if (isDisabled) return;
                                      setPermFormData(prev => {
                                        const viewPerm = `${feature}.view`;
                                        const hasViewPerm = groupedPermissions[feature]?.includes(viewPerm);
                                        
                                        let nextPerms = prev;
                                        if (!displayIsChecked) {
                                          nextPerms = [...nextPerms, permName];
                                          if (actionName !== 'view' && hasViewPerm && !nextPerms.includes(viewPerm)) {
                                            nextPerms = [...nextPerms, viewPerm];
                                          }
                                        } else {
                                          if (actionName === 'view') {
                                            nextPerms = nextPerms.filter(p => !p.startsWith(`${feature}.`));
                                          } else {
                                            nextPerms = nextPerms.filter(p => p !== permName);
                                          }
                                        }
                                        
                                        return Array.from(new Set(nextPerms));
                                      });
                                    }}
                                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white ${isDisabled ? 'cursor-not-allowed opacity-50' : ''} ${displayIsChecked ? 'bg-indigo-600' : 'bg-slate-200'}`}
                                  >
                                    <span className="sr-only">Toggle {permName}</span>
                                    <span
                                      className={`pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm ring-0 transition-transform ${displayIsChecked ? 'translate-x-4' : 'translate-x-0.5'}`}
                                    />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-slate-500 bg-slate-50/50 flex flex-col items-center justify-center min-h-[300px]">
            <Shield className="w-12 h-12 text-slate-300 mb-4" />
            <p className="text-lg font-medium text-slate-600">No Role Selected</p>
            <p className="text-sm mt-1">Select a role from the dropdown above to view and edit its permissions.</p>
          </div>
        )}
      </div>

      <Dialog open={isCreatePermModalOpen} onOpenChange={setIsCreatePermModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create System Permission</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Feature / Module</label>
              <select
                value={newPermFeature}
                onChange={(e) => setNewPermFeature(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                {sidebarSections.flatMap(s => s.features).map((f: string) => (
                  <option key={f} value={f}>{f}</option>
                ))}
                <option value="custom">-- Custom Feature --</option>
              </select>
            </div>
            
            {newPermFeature === 'custom' && (
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Custom Feature Name</label>
                <Input 
                  value={newPermFeature} 
                  onChange={(e) => setNewPermFeature(e.target.value)} 
                  placeholder="e.g. integrations" 
                />
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Action (without feature prefix)</label>
              <Input 
                value={newPermAction} 
                onChange={(e) => setNewPermAction(e.target.value)} 
                placeholder="e.g. view, create, manage_settings" 
              />
            </div>
            
            <div className="bg-blue-50 text-blue-800 text-xs p-3 rounded-lg border border-blue-100 flex items-start gap-2">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold mb-1">Generated Permission Name:</p>
                <code className="bg-white px-1.5 py-0.5 rounded text-blue-900 border border-blue-200">{newPermFeature || 'feature'}.{newPermAction || 'action'}</code>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreatePermModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCreatePermission} disabled={loading || !newPermFeature || !newPermAction} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {loading ? 'Creating...' : 'Create Permission'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isPermListModalOpen} onOpenChange={setIsPermListModalOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <DialogTitle>All System Permissions</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-0">
            <Table>
              <TableHeader className="bg-slate-50/80 sticky top-0 shadow-sm z-10">
                <TableRow>
                  <TableHead className="w-1/3">Permission name</TableHead>
                  <TableHead>Used by</TableHead>
                  <TableHead className="text-right w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {permissions.map((perm) => (
                  <TableRow key={perm.id} className="hover:bg-slate-50/50">
                    <TableCell className="font-mono text-sm text-slate-800">
                      {perm.name}
                    </TableCell>
                    <TableCell>
                      {perm.roles && perm.roles.length > 0 ? (
                        <span className="text-slate-600">
                          {perm.roles.map((r: any) => r.name).join(', ')}
                        </span>
                      ) : (
                        <span className="text-slate-400">— unused</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => {
                          setPermToDelete(perm);
                          setDeletePermConfirmOpen(true);
                        }}
                        disabled={!isCurrentUserSuperAdmin || !hasPermission('permissions.manage')}
                        className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {permissions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-slate-500">
                      No permissions found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <DialogFooter className="px-6 py-4 border-t border-slate-100 bg-slate-50/50">
            <Button variant="outline" onClick={() => setIsPermListModalOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deletePermConfirmOpen} onOpenChange={setDeletePermConfirmOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Delete Permission
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 text-slate-600">
            <p className="mb-4">Are you sure you want to delete the permission <span className="font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-800">{permToDelete?.name}</span>?</p>
            <p className="text-sm bg-red-50 text-red-800 p-3 rounded border border-red-100">
              Note: System permissions cannot be deleted if they are assigned to any roles.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletePermConfirmOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeletePermission} disabled={loading} className="bg-red-600 hover:bg-red-700 text-white">
              {loading ? 'Deleting...' : 'Delete Permission'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

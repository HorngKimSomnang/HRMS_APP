/* eslint-disable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */
import React, { useState, useEffect } from 'react';
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
import { Search, ShieldCheck, Save, Shield, Info, Pencil, Trash2, Eye, Copy } from 'lucide-react';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';
import { useAuth } from '@/context/AuthContext';

const SIDEBAR_SECTIONS = [
  { name: 'MAIN', features: ['dashboard', 'notice_board'] },
  { name: 'USER MANAGEMENT', features: ['employees', 'roles'] },
  { name: 'ORGANIZATION', features: ['departments', 'contracts', 'assets', 'holidays'] },
  { name: 'OPERATIONS', features: ['attendance', 'leaves', 'overtime', 'documents', 'tasks'] },
  { name: 'FINANCE', features: ['payroll'] },
  { name: 'REPORTS', features: ['reports'] },
  { name: 'SYSTEM CONTROLS', features: ['admins', 'shifts', 'audit_logs', 'settings_general', 'settings_attendance', 'settings_leaves', 'settings_payroll', 'settings_security'] }
];

// Fallback for any unmapped features
const FEATURE_ORDER = SIDEBAR_SECTIONS.flatMap(s => s.features);

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

// Format a raw permission name like `notice_board.view_own` → "Notice Board · View Own"
const formatPermissionName = (name: string) => {
  const [feature, ...actionParts] = name.split('.');
  const action = actionParts.join(' ');
  const fmt = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  return `${fmt(feature)} · ${fmt(action)}`;
};

export default function RolesList() {
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
  
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<any>(null);
  
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<any>(null);
  const [isViewOnly, setIsViewOnly] = useState(false);
  
  // Permissions Modal State
  const [isPermModalOpen, setIsPermModalOpen] = useState(false);
  const [permRole, setPermRole] = useState<any>(null);
  const [permFormData, setPermFormData] = useState<string[]>([]);
  const [permViewOnly, setPermViewOnly] = useState(false);

  // Selected row state for the header Manage Permissions button
  const [selectedRole, setSelectedRole] = useState<any>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    permissions: [] as string[]
  });

  const loadData = async () => {
    try {
      const [rolesRes, permsRes] = await Promise.all([
        api.get('/admin/roles'),
        api.get('/admin/permissions')
      ]);
      
      setRoles(rolesRes.data);
      const perms = permsRes.data;
      setPermissions(perms);
      
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

  useEffect(() => {
    loadData();
  }, []);

  useLiveRefresh(loadData, { resources: ['roles', 'permissions'] });

  const handleOpenModal = (role: any = null, viewOnly = false) => {
    setEditingRole(role);
    setIsViewOnly(viewOnly);
    setFormData({
      name: role ? role.name : '',
      permissions: []
    });
    setIsModalOpen(true);
  };

  const handleOpenPermModal = (role: any, viewOnly = false) => {
    setPermRole(role);
    setPermViewOnly(viewOnly);
    api.get(`/admin/roles/${role.id}`).then(res => {
      setPermFormData(res.data.permissions?.map((p: any) => p.name) || []);
      setIsPermModalOpen(true);
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

  const handleSave = async () => {
    if (!formData.name) {
      toast.error('Role name is required.');
      return;
    }
    
    setLoading(true);
    try {
      if (editingRole) {
        await api.put(`/admin/roles/${editingRole.id}`, { name: formData.name });
        toast.success('Role updated successfully');
      } else {
        await api.post('/admin/roles', { name: formData.name });
        toast.success('Role created successfully');
      }
      setIsModalOpen(false);
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save role');
    }
    setLoading(false);
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
      setIsPermModalOpen(false);
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save permissions');
    }
    setLoading(false);
  };
  const handleDuplicateRole = async (role: any) => {
    if (!role) return;
    setLoading(true);
    try {
      // First, get the full details of the role to copy its permissions
      const res = await api.get(`/admin/roles/${role.id}`);
      const perms = res.data.permissions?.map((p: any) => p.name) || [];
      
      // Then create a new role with a ' copy' suffix and the exact same permissions
      await api.post('/admin/roles', { 
         name: `${role.name} copy`, 
         permissions: perms 
      });
      toast.success('Role duplicated successfully');
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to duplicate role');
    }
    setLoading(false);
  };


  const handleDelete = async () => {
    if (!roleToDelete) return;
    
    try {
      await api.delete(`/admin/roles/${roleToDelete.id}`);
      toast.success('Role deleted successfully');
      setDeleteConfirmOpen(false);
      setRoleToDelete(null);
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete role');
    }
  };

  const filteredRoles = roles.filter((r) => r.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const isSystemRole = editingRole?.is_system;

  return (
    <div className="space-y-6">
      {/* Sticky Wrapper to hide scrolling content completely */}
      <div className="sticky -top-6 lg:-top-8 z-40 -mx-6 lg:-mx-8 px-6 lg:px-8 pb-4 lg:pb-6 bg-slate-50/95 backdrop-blur-md border-b border-blue-100/50 shadow-sm transition-all duration-200">
        <PageHeader 
          className="mb-0"
        title="Roles & Permissions"
        subtitle="Manage custom roles and system permissions."
        gradient="from-indigo-600 via-purple-600 to-pink-600"
        action={
          <div className="flex items-center gap-2">
            <Button
              onClick={() => {
                if (!selectedRole) {
                  toast.error('Please select a role first!');
                  return;
                }
                handleOpenPermModal(selectedRole, !isCurrentUserSuperAdmin || selectedRole.is_system || !hasPermission('roles.edit'));
              }}
              className="gap-2 bg-white text-indigo-600 hover:bg-gray-100 border-none shadow-md transition-all"
              title={selectedRole ? `Manage permissions for ${selectedRole.name}` : 'Manage Permissions'}
            >
              <Shield className="w-4 h-4 mr-1.5" />
              {selectedRole ? `${selectedRole.name} Permissions` : 'Manage Permissions'}
            </Button>
            {hasPermission('roles.duplicate') && isCurrentUserSuperAdmin && (
              <div className="flex items-center gap-2">
                <Button 
                  onClick={() => {
                    if (!selectedRole) {
                      toast.error('Please select a role first!');
                      return;
                    }
                    handleDuplicateRole(selectedRole);
                  }}
                  disabled={loading}
                  className="gap-2 bg-white text-indigo-600 hover:bg-gray-100 border-none shadow-md transition-all"
                  title={selectedRole ? `Duplicate ${selectedRole.name}` : 'Duplicate Role'}
                >
                  <Copy className="h-4 w-4 mr-1.5" />
                  Duplicate Role
                </Button>
                <Button 
                onClick={() => {
                  setEditingRole(null);
                  setIsViewOnly(false);
                  setFormData({ name: '', permissions: [] });
                  setIsModalOpen(true);
                }}
                className="gap-2 bg-white text-indigo-600 hover:bg-gray-100 border-none shadow-md transition-all"
              >
                Create Custom Role
                </Button>
              </div>
            )}
          </div>
        }
      />
    </div>

    <div className="border border-indigo-100/80 rounded-2xl bg-card shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            Roles ({filteredRoles.length})
          </h3>
          <div className="relative w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search roles..."
              className="pl-9 bg-white shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <Table>
          <TableHeader className="bg-slate-50/80">
            <TableRow>
              <TableHead className="w-36">Role Name</TableHead>
              <TableHead className="w-24">Type</TableHead>
              <TableHead>Permissions</TableHead>
              <TableHead className="text-center w-28">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRoles.map(role => {
              const isSelected = selectedRole?.id === role.id;
              return (
                <TableRow 
                  key={role.id} 
                  onClick={() => setSelectedRole(isSelected ? null : role)}
                  className={`cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-indigo-50 border-l-2 border-l-indigo-500 hover:bg-indigo-50/80'
                      : 'hover:bg-slate-50/50'
                  }`}
                >
                  <TableCell className="font-medium text-slate-800">
                    <div className="flex items-center gap-2">
                      <Shield className={`w-4 h-4 ${role.is_system ? 'text-rose-500' : isSelected ? 'text-indigo-600' : 'text-indigo-500'}`} />
                      <span className={isSelected ? 'text-indigo-700 font-semibold' : ''}>{role.name}</span>
                      {isSelected && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-100 text-indigo-700">Selected</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {role.is_system ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-700">System</span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">Custom</span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-xs w-0">
                    {role.permissions && role.permissions.length > 0 ? (() => {
                      const sortedPerms = [...role.permissions].sort((a: any, b: any) => {
                        const featureA = a.name.split('.')[0];
                        const featureB = b.name.split('.')[0];
                        const idxA = FEATURE_ORDER.indexOf(featureA);
                        const idxB = FEATURE_ORDER.indexOf(featureB);
                        return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
                      });
                      return (
                        <div
                          className="w-full overflow-hidden"
                          title={sortedPerms.map((p: any) => formatPermissionName(p.name)).join(', ')}
                        >
                          <div className="flex items-center gap-1 flex-nowrap overflow-hidden">
                            {sortedPerms.slice(0, 5).map((p: any) => (
                              <span
                                key={p.name}
                                className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600 whitespace-nowrap"
                              >
                                {formatPermissionName(p.name)}
                              </span>
                            ))}
                            {sortedPerms.length > 5 && (
                              <span className="shrink-0 text-xs text-slate-400 whitespace-nowrap font-medium">
                                +{sortedPerms.length - 5} more
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })() : (
                      <span className="text-xs text-slate-400 italic">No permissions</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-center gap-1">
                      <Button variant="ghost" size="icon" className={`h-8 w-8 ${hasPermission('roles.view') ? 'text-slate-500 hover:text-slate-700 hover:bg-slate-100' : 'text-slate-300 cursor-not-allowed opacity-60'}`} onClick={() => handleOpenModal(role, true)} disabled={!hasPermission('roles.view')} title={hasPermission('roles.view') ? "View" : "No Permission"}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleOpenModal(role, false)}
                        className={`h-8 w-8 ${isCurrentUserSuperAdmin && !role.is_system && hasPermission('roles.edit') ? 'text-blue-600 hover:text-blue-700 hover:bg-blue-50' : 'text-slate-300 cursor-not-allowed opacity-60'}`}
                        title={!hasPermission('roles.edit') ? "No Permission" : role.is_system ? "System Role" : "Edit"}
                        disabled={!isCurrentUserSuperAdmin || role.is_system || !hasPermission('roles.edit')}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => {
                          setRoleToDelete(role);
                          setDeleteConfirmOpen(true);
                        }}
                        disabled={role.is_system || !isCurrentUserSuperAdmin || !hasPermission('roles.delete')}
                        className={`h-8 w-8 ${!role.is_system && isCurrentUserSuperAdmin && hasPermission('roles.delete') ? 'text-red-500 hover:text-red-700 hover:bg-red-50' : 'text-slate-300 cursor-not-allowed opacity-60'}`}
                        title={!hasPermission('roles.delete') ? "No Permission" : role.is_system ? "System Role" : "Delete"}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {isViewOnly ? 'View Role' : editingRole ? 'Edit Role' : 'Create Role'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4 flex-1">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Role Name</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. HR Manager"
                disabled={isViewOnly || isSystemRole || !isCurrentUserSuperAdmin}
                className="bg-slate-50 border-slate-200 focus:bg-white transition-colors"
              />
              {isSystemRole && (
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                  <Info className="w-3.5 h-3.5" /> System roles cannot be renamed.
                </p>
              )}
            </div>
          </div>
          
          <DialogFooter className="border-t border-slate-100 pt-4">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              {isViewOnly ? 'Close' : 'Cancel'}
            </Button>
            {isCurrentUserSuperAdmin && !isViewOnly && (
              <Button onClick={handleSave} disabled={loading || isSystemRole} className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[120px] shadow-sm">
                {loading ? 'Saving...' : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Role
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isPermModalOpen} onOpenChange={setIsPermModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {permViewOnly ? 'View Permissions' : 'Manage Permissions'} - <span className="text-indigo-600 font-semibold">{permRole?.name}</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4 flex-1 overflow-y-auto px-2">
            {permRole?.is_system && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs px-4 py-3 rounded-lg flex items-center gap-2">
                <Info className="w-4 h-4 shrink-0" />
                <span>Permissions of system roles are built-in and cannot be modified.</span>
              </div>
            )}
            
            <div className="space-y-3">
              <div className="flex justify-between items-center bg-slate-100 p-3 rounded-t-xl border border-b-0 border-slate-200">
                <h4 className="font-semibold text-slate-800 text-sm">Role Permissions Matrix</h4>
                <label className={`flex items-center gap-2 text-sm font-medium ${permViewOnly || permRole?.is_system || !isCurrentUserSuperAdmin ? 'opacity-50' : 'cursor-pointer'}`}>
                  <input
                    type="checkbox"
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                    checked={permissions.length > 0 && permFormData.length === permissions.length}
                    onChange={(e) => handlePermMasterCheck(e.target.checked)}
                    disabled={permViewOnly || permRole?.is_system || !isCurrentUserSuperAdmin}
                  />
                  <span>Select All</span>
                </label>
              </div>
              <div className="border border-slate-200 rounded-b-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto p-2 bg-slate-50/30">
                  <Table className="relative">
                    <TableHeader className="bg-transparent sticky top-0 z-10">
                      <TableRow className="hover:bg-transparent border-b border-slate-200/60 shadow-sm bg-slate-50/90 backdrop-blur-sm">
                        <TableHead className="w-48 font-semibold text-slate-500 text-xs uppercase tracking-wider">Feature Area</TableHead>
                        <TableHead className="text-slate-500 font-semibold text-xs uppercase tracking-wider">Available Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {SIDEBAR_SECTIONS.map((section) => {
                        // Only get features that actually exist in the groupedPermissions
                        const sectionFeatures = section.features.filter(f => groupedPermissions[f]);
                        if (sectionFeatures.length === 0) return null;

                        return (
                          <React.Fragment key={section.name}>
                            <TableRow className="bg-slate-100/50 hover:bg-slate-100/50 border-t border-b border-slate-200">
                              <TableCell colSpan={2} className="py-2 px-3">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{section.name}</span>
                              </TableCell>
                            </TableRow>
                            {sectionFeatures.map(feature => {
                              const featurePerms = groupedPermissions[feature];
                              const allChecked = featurePerms.every(p => permFormData.includes(p));
                              const someChecked = featurePerms.some(p => permFormData.includes(p)) && !allChecked;

                              return (
                                <TableRow key={feature} className="group hover:bg-slate-50/50 transition-colors border-b border-slate-100/60">
                                  <TableCell className="font-medium text-slate-800 bg-transparent align-top pt-4 pl-6">
                                    <label className={`flex items-center gap-2.5 p-3 rounded-xl border text-sm font-medium transition-all ${permViewOnly || permRole?.is_system || !isCurrentUserSuperAdmin ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${allChecked ? 'border-indigo-500 bg-indigo-50/70 text-indigo-950 shadow-sm ring-1 ring-indigo-500/20' : 'border-slate-200/80 bg-white hover:bg-slate-50 text-slate-700'}`}>
                                      <input
                                        type="checkbox"
                                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                                        checked={allChecked}
                                        ref={input => { if (input) input.indeterminate = someChecked; }}
                                        onChange={(e) => handlePermRowCheck(feature, e.target.checked)}
                                        disabled={permViewOnly || permRole?.is_system || !isCurrentUserSuperAdmin}
                                      />
                                      <span className="capitalize">{feature === 'roles' ? 'Roles & Permissions' : feature === 'settings_general' ? 'Settings (General)' : feature === 'settings_attendance' ? 'Settings (Attendance)' : feature === 'settings_leaves' ? 'Settings (Leaves)' : feature === 'settings_payroll' ? 'Settings (Payroll)' : feature === 'settings_security' ? 'Settings (Security)' : feature.replace(/_/g, ' ')}</span>
                                    </label>
                                  </TableCell>
                                  <TableCell className="py-3">
                                    <div className="flex flex-wrap gap-2.5">
                                      {featurePerms.map(permName => {
                                        const actionName = permName.split('.')[1] || permName;
                                        const isChecked = permFormData.includes(permName);
                                        const isSuperAdminOnly = SUPER_ADMIN_ONLY_PERMS.has(permName);
                                        const isDisabled = permViewOnly || !isCurrentUserSuperAdmin || isSuperAdminOnly;
                                        return (
                                          <label 
                                            key={permName} 
                                            title={isSuperAdminOnly ? 'This action is always restricted to Super Admin and cannot be delegated via role permissions.' : undefined}
                                            className={`flex items-center gap-2.5 p-3 rounded-xl border text-sm font-medium transition-all ${isDisabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'} ${
                                              isChecked && !isSuperAdminOnly
                                                ? 'border-indigo-500 bg-indigo-50/70 text-indigo-950 shadow-sm ring-1 ring-indigo-500/20' 
                                                : 'border-slate-200/80 bg-white hover:bg-slate-50 text-slate-700'
                                            }`}
                                          >
                                            <input
                                              type="checkbox"
                                        className={`rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                                        checked={isSuperAdminOnly ? false : isChecked}
                                        onChange={(e) => {
                                          if (isDisabled) return;
                                          setPermFormData(prev => {
                                            const actionName = permName.split('.')[1] || permName;
                                            const viewPerm = `${feature}.view`;
                                            const hasViewPerm = groupedPermissions[feature]?.includes(viewPerm);
                                            
                                            let nextPerms = prev;
                                            if (e.target.checked) {
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
                                        disabled={isDisabled}
                                      />
                                      <span className="capitalize select-none whitespace-nowrap">{actionName.replace(/_/g, ' ')}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      </React.Fragment>
                    );
                  })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter className="border-t border-slate-100 pt-4 pb-2">
            <Button variant="outline" onClick={() => setIsPermModalOpen(false)}>
              {permViewOnly || permRole?.is_system ? 'Close' : 'Cancel'}
            </Button>
            {isCurrentUserSuperAdmin && !permRole?.is_system && !permViewOnly && (
              <Button onClick={handleSavePermissions} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[120px] shadow-sm">
                {loading ? 'Saving...' : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Permissions
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            Are you sure you want to delete the role <span className="font-bold">{roleToDelete?.name}</span>? This action cannot be undone.
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">Delete Role</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

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
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

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
export default function RolesList() {
  const navigate = useNavigate();
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
  

  // Duplicate Role State
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [roleToDuplicateId, setRoleToDuplicateId] = useState<string>('');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    permissions: [] as string[]
  });

  const loadData = async () => {
    try {
      const [rolesRes] = await Promise.all([
        api.get('/admin/roles')
      ]);
      
      setRoles(rolesRes.data);
    } catch {
      toast.error('Failed to load roles');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useLiveRefresh(loadData, { resources: ['roles'] });

  const handleOpenModal = (role: any = null, viewOnly = false) => {
    setEditingRole(role);
    setIsViewOnly(viewOnly);
    setFormData({
      name: role ? role.name : '',
      permissions: []
    });
    setIsModalOpen(true);
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
    } finally {
      setLoading(false);
    }
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
    } finally {
      setLoading(false);
    }
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
        title="Role Management"
        subtitle="Manage custom roles and system permissions."
        gradient="from-indigo-600 via-purple-600 to-pink-600"
        action={
          <div className="flex items-center gap-2">
            <Button
              onClick={() => navigate('/permissions')}
              className="gap-2 bg-white text-indigo-600 hover:bg-gray-100 border-none shadow-md transition-all"
              title="Manage Permissions"
            >
              <Shield className="w-4 h-4 mr-1.5" />
              Manage Permissions
            </Button>
            {hasPermission('roles.duplicate') && isCurrentUserSuperAdmin && (
              <Button 
                onClick={() => setIsDuplicateModalOpen(true)}
                className="gap-2 bg-white text-indigo-600 hover:bg-gray-100 border-none shadow-md transition-all"
                title="Duplicate Role"
              >
                <Copy className="h-4 w-4 mr-1.5" />
                Duplicate Role
              </Button>
            )}
            {hasPermission('roles.create') && isCurrentUserSuperAdmin && (
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
              <TableHead className="text-center w-28">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRoles.map((role) => {
              return (
                <TableRow 
                  key={role.id} 
                  className="hover:bg-slate-50/50"
                >
                  <TableCell className="font-medium text-slate-800">
                    <div className="flex items-center gap-2">
                      <Shield className={`w-4 h-4 ${role.is_system ? 'text-rose-500' : 'text-indigo-500'}`} />
                      <span>{role.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {role.is_system ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-700">System</span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">Custom</span>
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


      <Dialog open={isDuplicateModalOpen} onOpenChange={setIsDuplicateModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Duplicate Role</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">
                Select Role to Duplicate
              </label>
              <select
                value={roleToDuplicateId}
                onChange={(e) => setRoleToDuplicateId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <option value="">-- Choose a Role --</option>
                {roles.map(role => (
                  <option key={role.id} value={role.id}>
                    {role.name} {role.is_system ? '(System)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsDuplicateModalOpen(false);
              setRoleToDuplicateId('');
            }}>
              Cancel
            </Button>
            <Button 
              disabled={loading || !roleToDuplicateId} 
              onClick={() => {
                const roleToDup = roles.find(r => r.id.toString() === roleToDuplicateId);
                if (roleToDup) {
                  handleDuplicateRole(roleToDup).then(() => {
                    setIsDuplicateModalOpen(false);
                    setRoleToDuplicateId('');
                  });
                }
              }} 
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {loading ? 'Duplicating...' : 'Duplicate Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

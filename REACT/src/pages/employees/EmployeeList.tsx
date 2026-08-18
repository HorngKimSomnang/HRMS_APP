import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, UserMinus, Plus, Search, Eye, Archive, KeyRound, RotateCcw, Users, Shield, Briefcase, Building2, Info, Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { PageHeader } from '@/components/ui/PageHeader';
import { toast } from 'sonner';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';

interface Employee {
    id: number;
    employee_code: string;
    first_name: string;
    last_name: string;
    email?: string;
    phone?: string;
    job_title?: string;
    profile_picture_url?: string;
    user_id?: number;
    status?: string;
    archived_at?: string | null;
    restore_conflict?: boolean;
    conflicting_employee_code?: string | null;
}

export default function EmployeeList() {
    const { t } = useTranslation();
    const { user, hasPermission } = useAuth();
    const navigate = useNavigate();
    const [currentEmployees, setCurrentEmployees] = useState<Employee[]>([]);
    const [archivedEmployees, setArchivedEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [resendEmployee, setResendEmployee] = useState<Employee | null>(null);
    const [isResending, setIsResending] = useState(false);
    const [restoreEmployee, setRestoreEmployee] = useState<Employee | null>(null);
    const [isRestoring, setIsRestoring] = useState(false);
    const [viewMode, setViewMode] = useState<'current' | 'archived'>('current');
    const [selectedAccessEmployee, setSelectedAccessEmployee] = useState<Employee | null>(null);
    const [accessModalOpen, setAccessModalOpen] = useState(false);
    const [roles, setRoles] = useState<any[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);
    const [accessUserObj, setAccessUserObj] = useState<any>(null);
    const [accessFormData, setAccessFormData] = useState({
        role_ids: [] as number[],
        department_id: '' as string | number,
        managed_departments: [] as number[],
    });

    const isSuperAdmin = user?.roles?.some((r: any) => r.is_super_admin) ?? false;
    const canManageAccess = hasPermission('employees.manage_access');

    const openAccessModal = async (employee: Employee) => {
        if (!canManageAccess) {
            toast.error("You don't have permission to manage access.");
            return;
        }
        try {
            const [rolesRes, deptsRes, usersRes] = await Promise.all([
                api.get('/admin/roles'),
                api.get('/departments'),
                api.get('/admin/users')
            ]);
            setRoles(rolesRes.data);
            setDepartments(Array.isArray(deptsRes.data) ? deptsRes.data : deptsRes.data.data || []);
            
            const userObj = usersRes.data.find((u: any) => u.id === employee.user_id);
            setAccessUserObj(userObj || null);
            
            if (userObj) {
                const initialDepts = userObj.managed_departments?.map((d: any) => d.id) || [];
                const initialRoleIds = userObj.roles?.map((r: any) => r.id) || (userObj.role_id ? [userObj.role_id] : []);
                setAccessFormData({
                    role_ids: initialRoleIds,
                    department_id: userObj.department_id || userObj.employee?.department_id || '',
                    managed_departments: initialDepts,
                });
            } else {
                setAccessFormData({ role_ids: [], department_id: '', managed_departments: [] });
            }
            setAccessModalOpen(true);
        } catch (error) {
            toast.error("Failed to load access data");
        }
    };

    const handleAccessFieldChange = (e: any) => {
        setAccessFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const toggleAccessManagedDepartment = (deptId: number) => {
        setAccessFormData(prev => ({
            ...prev,
            managed_departments: prev.managed_departments.includes(deptId) 
                ? prev.managed_departments.filter(id => id !== deptId)
                : [...prev.managed_departments, deptId]
        }));
    };

    const handleAccessSave = async () => {
        if (!accessUserObj?.employee) return;
        if (accessFormData.role_ids.length === 0) {
            toast.error('At least one role is required.');
            return;
        }
        try {
            const targetRoleIsSuperAdmin = roles.some(r => accessFormData.role_ids.includes(r.id) && r.is_super_admin);
            const isEmployeeOnly = roles.some(r => accessFormData.role_ids.includes(r.id) && r.name === 'Employee') && !roles.some(r => accessFormData.role_ids.includes(r.id) && r.name !== 'Employee');

            const payload = {
                role_ids: accessFormData.role_ids,
                department_id: accessFormData.department_id,
                managed_departments: targetRoleIsSuperAdmin ? departments.map(d => d.id) : (isEmployeeOnly ? [] : accessFormData.managed_departments),
            };
            await api.post(`/employees/${accessUserObj.employee.id}/permissions/bulk`, payload);
            toast.success('Access updated successfully!');
            setAccessModalOpen(false);
            fetchEmployees(true);
            setSelectedAccessEmployee(null);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to update access');
        }
    };


    useEffect(() => {
        fetchEmployees();
    }, []);

    const confirmOffboard = async () => {
        if (!selectedEmployee) return;
        const employee = selectedEmployee;
        const previousCurrent = currentEmployees;
        const previousArchived = archivedEmployees;

        setCurrentEmployees(current => current.filter(item => item.id !== employee.id));
        setArchivedEmployees(current => [
            { ...employee, archived_at: new Date().toISOString() },
            ...current,
        ]);
        setSelectedEmployee(null);

        try {
            await api.delete(`/employees/${employee.id}`);
            toast.success("Employee terminated and archived");
        } catch (error: any) {
            setCurrentEmployees(previousCurrent);
            setArchivedEmployees(previousArchived);
            console.error("Failed to delete/offboard employee", error);
            const message = error.response?.data?.message || "Failed to offboard employee";
            toast(message);
        }
    };

    const confirmRestore = async () => {
        if (!restoreEmployee) return;
        const employee = restoreEmployee;
        const previousCurrent = currentEmployees;
        const previousArchived = archivedEmployees;

        setIsRestoring(true);
        setArchivedEmployees(current => current.filter(item => item.id !== employee.id));
        setCurrentEmployees(current => [
            { ...employee, archived_at: null },
            ...current,
        ]);
        setRestoreEmployee(null);

        try {
            await api.post(`/employees/${employee.id}/restore`);
            toast.success("Employee record restored successfully");
        } catch (error: any) {
            setCurrentEmployees(previousCurrent);
            setArchivedEmployees(previousArchived);
            console.error("Failed to restore employee", error);
            toast.error(error.response?.data?.message || "Failed to restore employee");
        } finally {
            setIsRestoring(false);
        }
    };

    const confirmResend = async () => {
        if (!resendEmployee) return;
        setIsResending(true);
        try {
            const res = await api.post(`/employees/${resendEmployee.id}/resend-credentials`);
            toast.success(res.data.message);
            setResendEmployee(null);
        } catch (error: any) {
            console.error("Failed to resend credentials", error);
            const message = error.response?.data?.message || "Failed to resend credentials";
            toast.error(message);
        } finally {
            setIsResending(false);
        }
    };

    const fetchEmployees = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const [currentResponse, archivedResponse] = await Promise.all([
                api.get('/employees', { params: { all: true } }),
                api.get('/employees', {
                    params: { archived: true, all: true },
                }),
            ]);
            setCurrentEmployees(currentResponse.data.data);
            setArchivedEmployees(archivedResponse.data.data);
        } catch (error) {
            console.error('Failed to fetch employees', error);
            toast.error('Failed to refresh employee records');
        } finally {
            if (!silent) setLoading(false);
        }
    };

    useLiveRefresh(() => fetchEmployees(true), { resources: 'employees' });

    const employees = viewMode === 'current' ? currentEmployees : archivedEmployees;
    const filteredEmployees = employees.filter(emp =>
        emp.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.employee_code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
                        <div className="sticky -top-6 lg:-top-8 z-40 -mx-6 lg:-mx-8 px-6 lg:px-8 pb-4 lg:pb-6 bg-slate-50/95 backdrop-blur-md border-b border-blue-100/50 shadow-sm transition-all duration-200">
                <PageHeader 
                    className="mb-0"
                    title={t('employees.title')}
                    subtitle={t('employees.subtitle')}
                    gradient="from-blue-600 via-indigo-600 to-violet-600"
                    action={
                        <div className="flex items-center gap-2">
                            {viewMode === 'current' && canManageAccess && (
                                <Button
                                    className="gap-2 border-none shadow-md transition-all bg-white text-indigo-600 hover:bg-gray-100"
                                    onClick={() => {
                                        if (selectedAccessEmployee) {
                                            openAccessModal(selectedAccessEmployee);
                                        } else {
                                            toast.error('Please select an employee first to manage their access.');
                                        }
                                    }}
                                    title={selectedAccessEmployee ? `Manage access for ${selectedAccessEmployee.last_name} ${selectedAccessEmployee.first_name}` : 'Select an employee row first'}
                                >
                                    <Shield className="h-4 w-4" />
                                    {selectedAccessEmployee ? `${selectedAccessEmployee.last_name} Access` : 'Add Access'}
                                </Button>
                            )}
                            {viewMode === 'current' && hasPermission('employees.create') && (
                                <Button 
                                    className="gap-2 bg-white text-indigo-600 hover:bg-gray-100 border-none shadow-md transition-all" 
                                    onClick={() => navigate('/employees/create')}
                                >
                                    <Plus className="h-4 w-4" /> {t('employees.add_employee')}
                                </Button>
                            )}
                        </div>
                    }
                />
            </div>

            <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative max-w-sm w-full">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search employees..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8"
                    />
                </div>
                <div className="inline-flex w-fit rounded-lg border bg-muted/40 p-1">
                    <button
                        type="button"
                        onClick={() => setViewMode('current')}
                        className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${viewMode === 'current' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        <Users className="h-4 w-4" /> Current employees
                    </button>
                    <button
                        type="button"
                        onClick={() => setViewMode('archived')}
                        className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${viewMode === 'archived' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        <Archive className="h-4 w-4" /> Archived
                    </button>
                </div>
            </div>

            {viewMode === 'archived' && (
                <div className="rounded-lg border border-blue-200 bg-blue-50/70 px-4 py-3 text-sm text-blue-900">
                    Archived records are retained for HR history and can be restored individually. Restoring a record does not automatically restore login access.
                </div>
            )}

            <div className="rounded-md border border-blue-100 bg-gradient-to-br from-blue-50/50 via-card to-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[300px]">{t('employees.name')}</TableHead>
                            <TableHead className="w-[100px]">Code</TableHead>
                            <TableHead className="w-[150px]">{t('employees.role')}</TableHead>
                            <TableHead className="w-[200px]">Email</TableHead>
                            <TableHead className="w-[150px]">{t('employees.phone')}</TableHead>
                            <TableHead className="w-[100px]">Status</TableHead>
                            <TableHead className="text-right w-[100px]">{t('employees.actions')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    Loading...
                                </TableCell>
                            </TableRow>
                        ) : filteredEmployees.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    {viewMode === 'archived' ? 'No archived employee records.' : t('employees.no_employees')}
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredEmployees.map((employee) => (
                                <TableRow key={employee.id} className={`cursor-pointer transition-colors ${selectedAccessEmployee?.id === employee.id ? 'bg-purple-50/50 hover:bg-purple-50/70 border-l-2 border-l-purple-500' : 'hover:bg-slate-50/50'}`} onClick={() => viewMode === 'current' && setSelectedAccessEmployee(selectedAccessEmployee?.id === employee.id ? null : employee)}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center">
                                                {employee.profile_picture_url ? (
                                                    <img src={employee.profile_picture_url} alt="" className="h-full w-full object-cover" />
                                                ) : (
                                                    <span className="text-sm font-medium text-gray-500">{employee.first_name[0]}{employee.last_name[0]}</span>
                                                )}
                                            </div>
                                            <div className="font-medium">{employee.last_name} {employee.first_name}</div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-medium">{employee.employee_code}</TableCell>
                                    <TableCell>
                                        <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-sm font-medium whitespace-nowrap">
                                            {employee.role?.name || employee.user?.roles?.[0]?.name || employee.role || employee.job_title || '-'}
                                        </span>
                                    </TableCell>
                                    <TableCell>{employee.email || '-'}</TableCell>
                                    <TableCell>{employee.phone || '-'}</TableCell>
                                    <TableCell>
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                            viewMode === 'archived'
                                                ? 'bg-slate-100 text-slate-700'
                                                : employee.status === 'active'
                                                ? 'bg-green-100 text-green-700' 
                                                : 'bg-red-100 text-red-700'
                                        }`}>
                                            {viewMode === 'archived'
                                                ? 'Archived'
                                                : employee.status ? employee.status.charAt(0).toUpperCase() + employee.status.slice(1) : 'Active'}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            {viewMode === 'archived' ? (
                                                employee.restore_conflict ? (
                                                    <div className="text-right">
                                                        <span className="block text-xs font-medium text-amber-700">Active record exists</span>
                                                        <span className="text-[11px] text-muted-foreground">{employee.conflicting_employee_code}</span>
                                                    </div>
                                                ) : (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setRestoreEmployee(employee)}
                                                        className="gap-2 text-blue-700"
                                                    >
                                                        <RotateCcw className="h-4 w-4" /> Restore
                                                    </Button>
                                                )
                                            ) : (
                                                <>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => navigate(`/employees/${employee.id}`)}
                                                title={hasPermission('employees.view') ? "View" : "No permission"}
                                                disabled={!hasPermission('employees.view')}
                                            >
                                                <Eye className="h-4 w-4 text-slate-500" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => navigate(`/employees/edit/${employee.id}`)}
                                                title={hasPermission('employees.edit') ? "Edit" : "No permission"}
                                                disabled={!hasPermission('employees.edit')}
                                            >
                                                <Pencil className="h-4 w-4 text-blue-500" />
                                            </Button>
                                            
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setResendEmployee(employee)}
                                                title={hasPermission('employees.resend_credentials') ? "Resend Credentials" : "No permission"}
                                                disabled={!hasPermission('employees.resend_credentials')}
                                            >
                                                <KeyRound className="h-4 w-4 text-amber-500" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setSelectedEmployee(employee)}
                                                title={user?.id === employee.user_id ? "Cannot offboard own profile" : (hasPermission('employees.delete') ? "Terminate & Archive" : "No permission")}
                                                disabled={user?.id === employee.user_id || !hasPermission('employees.delete')}
                                            >
                                                <UserMinus className="h-4 w-4 text-orange-500" />
                                            </Button>
                                                </>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Offboard<Dialog open={!!selectedEmployee} onOpenChange={(open) => !open && setSelectedEmployee(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-red-600 flex items-center gap-2">
                            <UserMinus className="h-5 w-5" />
                            Delete Employee
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <p className="text-sm text-muted-foreground">
                            Are you sure you want to delete this employee? This will revoke their system access
                            immediately and move their record straight to Archived — their historical records are
                            retained safely and can be restored later.
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSelectedEmployee(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={confirmOffboard}>
                            Yes, Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Restore Archived Employee Confirmation */}
            <Dialog open={!!restoreEmployee} onOpenChange={(open) => !open && setRestoreEmployee(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-blue-700">
                            <RotateCcw className="h-5 w-5" /> Restore Employee Record
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 py-4 text-sm text-muted-foreground">
                        <p>
                            Restore <strong className="text-foreground">{restoreEmployee?.last_name} {restoreEmployee?.first_name}</strong> and their related HR history to the current employee list?
                        </p>
                        <p>The employee remains terminated and cannot sign in until an administrator intentionally reassigns access.</p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRestoreEmployee(null)} disabled={isRestoring}>Cancel</Button>
                        <Button onClick={confirmRestore} disabled={isRestoring} className="gap-2">
                            <RotateCcw className={`h-4 w-4 ${isRestoring ? 'animate-spin' : ''}`} />
                            {isRestoring ? "Restoring..." : "Restore Record"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Resend Credentials Modal */}
            <Dialog open={!!resendEmployee} onOpenChange={(open) => !open && setResendEmployee(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-amber-600">
                            <KeyRound className="h-5 w-5" />
                            Resend Login Credentials
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <p className="text-sm text-muted-foreground">
                            Are you sure you want to generate a new password and resend the welcome email for <strong>{resendEmployee?.last_name} {resendEmployee?.first_name}</strong>?
                            <br /><br />
                            This will invalidate their old password.
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setResendEmployee(null)} disabled={isResending}>Cancel</Button>
                        <Button onClick={confirmResend} disabled={isResending} className="bg-amber-600 hover:bg-amber-700">
                            {isResending ? "Resending..." : "Yes, Generate & Send"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        
            {/* Access Modal */}
            <Dialog open={accessModalOpen} onOpenChange={setAccessModalOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-6 overflow-hidden">
                    <DialogHeader>
                        <DialogTitle>Edit Employee Access</DialogTitle>
                    </DialogHeader>

                    {accessUserObj && (
                        <div className="flex-1 overflow-y-auto px-1.5 -mx-1.5 pr-3 -mr-3 space-y-6 py-4">
                            {!accessUserObj.employee ? (
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
                                                    value={accessFormData.department_id}
                                                    onChange={handleAccessFieldChange}
                                                    required
                                                    disabled={!isSuperAdmin}
                                                    className="w-full flex h-10 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
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
                                                        const isChecked = accessFormData.role_ids.includes(role.id);
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
                                                                        setAccessFormData(prev => {
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
                                        <p className="text-xs text-muted-foreground">Select the department(s) this user is authorized to manage.</p>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto pr-2">
                                            {departments.map(dept => {
                                                const targetRoleIsSuperAdmin = roles.some(r => accessFormData.role_ids.includes(r.id) && r.is_super_admin);
                                                const isEmployeeOnly = roles.some(r => accessFormData.role_ids.includes(r.id) && r.name === 'Employee') && !roles.some(r => accessFormData.role_ids.includes(r.id) && r.name !== 'Employee');
                                                const disabled = !isSuperAdmin || targetRoleIsSuperAdmin || isEmployeeOnly;
                                                const isManaged = targetRoleIsSuperAdmin ? true : (isEmployeeOnly ? false : accessFormData.managed_departments.includes(dept.id));
                                                
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
                                                            onChange={() => !disabled && toggleAccessManagedDepartment(dept.id)}
                                                            className="rounded border-gray-300 text-indigo-600 h-4 w-4 disabled:opacity-50"
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
                        <Button variant="outline" onClick={() => setAccessModalOpen(false)}>Cancel</Button>
                        {isSuperAdmin && accessUserObj?.employee && (
                            <Button onClick={handleAccessSave} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                                <Save className="w-4 h-4" /> Save Access
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div >
    );
}

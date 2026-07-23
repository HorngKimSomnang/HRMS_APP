import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, UserMinus, Plus, Search, Eye, Archive, KeyRound, RotateCcw, Users } from 'lucide-react';
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
import { toast } from 'sonner';

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
    const { user } = useAuth();
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

    useEffect(() => {
        fetchEmployees();
    }, []);

    const confirmOffboard = async () => {
        if (!selectedEmployee) return;

        try {
            await api.delete(`/employees/${selectedEmployee.id}`);
            // Fetch employees again to refresh the status
            fetchEmployees();
            toast.success(selectedEmployee.status === 'terminated' ? "Employee archived safely" : "Employee successfully offboarded");
            setSelectedEmployee(null);
        } catch (error: any) {
            console.error("Failed to delete/offboard employee", error);
            const message = error.response?.data?.message || "Failed to offboard employee";
            toast(message);
        }
    };

    const confirmRestore = async () => {
        if (!restoreEmployee) return;
        setIsRestoring(true);
        try {
            await api.post(`/employees/${restoreEmployee.id}/restore`);
            toast.success("Employee record restored successfully");
            setRestoreEmployee(null);
            fetchEmployees();
        } catch (error: any) {
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
            toast.success(`SUCCESS: ${res.data.message}\n\nPassword: ${res.data.generated_password}`);
            setResendEmployee(null);
        } catch (error: any) {
            console.error("Failed to resend credentials", error);
            const message = error.response?.data?.message || "Failed to resend credentials";
            toast.error(message);
        } finally {
            setIsResending(false);
        }
    };

    const fetchEmployees = async () => {
        setLoading(true);
        try {
            const [currentResponse, archivedResponse] = await Promise.all([
                api.get('/employees'),
                api.get('/employees', { params: { archived: true } }),
            ]);
            setCurrentEmployees(currentResponse.data.data);
            setArchivedEmployees(archivedResponse.data.data);
        } catch (error) {
            console.error('Failed to fetch employees', error);
            toast.error('Failed to refresh employee records');
        } finally {
            setLoading(false);
        }
    };

    const employees = viewMode === 'current' ? currentEmployees : archivedEmployees;
    const filteredEmployees = employees.filter(emp =>
        emp.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.employee_code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">{t('employees.title')}</h2>
                    <p className="text-muted-foreground">{t('employees.subtitle')}</p>
                </div>
                {viewMode === 'current' && (
                    <Button className="gap-2" onClick={() => navigate('/employees/create')}>
                        <Plus className="h-4 w-4" /> {t('employees.add_employee')}
                    </Button>
                )}
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
                                <TableRow key={employee.id}>
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
                                    <TableCell>{employee.job_title || '-'}</TableCell>
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
                                                title="View"
                                            >
                                                <Eye className="h-4 w-4 text-slate-500" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => navigate(`/employees/edit/${employee.id}`)}
                                                title="Edit"
                                            >
                                                <Pencil className="h-4 w-4 text-blue-500" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setResendEmployee(employee)}
                                                title="Resend Credentials"
                                            >
                                                <KeyRound className="h-4 w-4 text-amber-500" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setSelectedEmployee(employee)}
                                                title={user?.id === employee.user_id ? "Cannot offboard own profile" : (employee.status === 'terminated' ? "Archive employee record" : "Offboard / Terminate")}
                                                disabled={user?.id === employee.user_id}
                                            >
                                                {employee.status === 'terminated' ? (
                                                    <Archive className="h-4 w-4 text-slate-500" />
                                                ) : (
                                                    <UserMinus className="h-4 w-4 text-orange-500" />
                                                )}
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

            {/* Offboard / Archive Confirmation Modal */}
            <Dialog open={!!selectedEmployee} onOpenChange={(open) => !open && setSelectedEmployee(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className={selectedEmployee?.status === 'terminated' ? "text-slate-700 flex items-center gap-2" : "text-orange-600 flex items-center gap-2"}>
                            {selectedEmployee?.status === 'terminated' ? <Archive className="h-5 w-5" /> : <UserMinus className="h-5 w-5" />}
                            {selectedEmployee?.status === 'terminated' ? "Archive Employee Record" : "Offboard Employee"}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <p className="text-sm text-muted-foreground">
                            {selectedEmployee?.status === 'terminated' 
                                ? "Archive this former employee? The record and related history will be hidden from the current list but retained safely and can be restored later."
                                : "Are you sure you want to offboard/terminate this employee? This will revoke their system access immediately but keep their historical records intact."}
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSelectedEmployee(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={confirmOffboard} className={selectedEmployee?.status === 'terminated' ? "bg-slate-700 hover:bg-slate-800" : "bg-orange-600 hover:bg-orange-700"}>
                            {selectedEmployee?.status === 'terminated' ? "Yes, Archive Record" : "Yes, Offboard"}
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
        </div >
    );
}

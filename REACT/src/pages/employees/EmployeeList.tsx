import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, UserMinus, Plus, Search, Eye, Trash2, KeyRound } from 'lucide-react';
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
}

export default function EmployeeList() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [resendEmployee, setResendEmployee] = useState<Employee | null>(null);
    const [isResending, setIsResending] = useState(false);

    useEffect(() => {
        fetchEmployees();
    }, []);

    const confirmOffboard = async () => {
        if (!selectedEmployee) return;

        try {
            await api.delete(`/employees/${selectedEmployee.id}`);
            // Fetch employees again to refresh the status
            fetchEmployees();
            toast.success(selectedEmployee.status === 'terminated' ? "Employee permanently deleted" : "Employee successfully offboarded");
            setSelectedEmployee(null);
        } catch (error: any) {
            console.error("Failed to delete/offboard employee", error);
            const message = error.response?.data?.message || "Failed to offboard employee";
            toast(message);
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
        try {
            const response = await api.get('/employees');
            setEmployees(response.data.data); // Assuming Laravel Resource returns { data: [...] }
        } catch (error) {
            console.error('Failed to fetch employees', error);
        } finally {
            setLoading(false);
        }
    };

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
                <Button className="gap-2" onClick={() => navigate('/employees/create')}>
                    <Plus className="h-4 w-4" /> {t('employees.add_employee')}
                </Button>
            </div>

            <div className="flex items-center py-4">
                <div className="relative max-w-sm w-full">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search employees..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8"
                    />
                </div>
            </div>

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
                                    {t('employees.no_employees')}
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
                                            employee.status === 'active' 
                                                ? 'bg-green-100 text-green-700' 
                                                : 'bg-red-100 text-red-700'
                                        }`}>
                                            {employee.status ? employee.status.charAt(0).toUpperCase() + employee.status.slice(1) : 'Active'}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
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
                                                title={user?.id === employee.user_id ? "Cannot offboard own profile" : (employee.status === 'terminated' ? "Permanently Delete" : "Offboard / Terminate")}
                                                disabled={user?.id === employee.user_id}
                                            >
                                                {employee.status === 'terminated' ? (
                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                ) : (
                                                    <UserMinus className="h-4 w-4 text-orange-500" />
                                                )}
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Offboard / Delete Confirmation Modal */}
            <Dialog open={!!selectedEmployee} onOpenChange={(open) => !open && setSelectedEmployee(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className={selectedEmployee?.status === 'terminated' ? "text-red-600 flex items-center gap-2" : "text-orange-600 flex items-center gap-2"}>
                            {selectedEmployee?.status === 'terminated' ? <Trash2 className="h-5 w-5" /> : <UserMinus className="h-5 w-5" />}
                            {selectedEmployee?.status === 'terminated' ? "Permanently Delete Employee" : "Offboard Employee"}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <p className="text-sm text-muted-foreground">
                            {selectedEmployee?.status === 'terminated' 
                                ? "Are you sure you want to permanently delete this employee? All data, records, and files will be removed. This action cannot be undone." 
                                : "Are you sure you want to offboard/terminate this employee? This will revoke their system access immediately but keep their historical records intact."}
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSelectedEmployee(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={confirmOffboard} className={selectedEmployee?.status === 'terminated' ? "bg-red-600 hover:bg-red-700" : "bg-orange-600 hover:bg-orange-700"}>
                            {selectedEmployee?.status === 'terminated' ? "Yes, Delete Permanently" : "Yes, Offboard"}
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

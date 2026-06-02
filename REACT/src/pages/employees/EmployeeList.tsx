import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, UserMinus, Plus, Search, Eye } from 'lucide-react';
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
    const [offboardId, setOffboardId] = useState<number | null>(null);

    useEffect(() => {
        fetchEmployees();
    }, []);

    const confirmOffboard = async () => {
        if (!offboardId) return;

        try {
            await api.delete(`/employees/${offboardId}`);
            // Fetch employees again to refresh the status
            fetchEmployees();
            setOffboardId(null);
            toast.success("Employee successfully offboarded");
        } catch (error: any) {
            console.error("Failed to offboard employee", error);
            const message = error.response?.data?.message || "Failed to offboard employee";
            toast(message);
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

            <div className="rounded-md border bg-card">
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
                                            <div className="font-medium">{employee.first_name} {employee.last_name}</div>
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
                                                onClick={() => setOffboardId(employee.id)}
                                                title={user?.id === employee.user_id ? "Cannot offboard own profile" : (employee.status === 'terminated' ? "Already Terminated" : "Offboard / Terminate")}
                                                disabled={user?.id === employee.user_id || employee.status === 'terminated'}
                                            >
                                                <UserMinus className={`h-4 w-4 ${employee.status === 'terminated' ? 'text-gray-300' : 'text-orange-500'}`} />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Offboard Confirmation Modal */}
            <Dialog open={!!offboardId} onOpenChange={(open) => !open && setOffboardId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-orange-600 flex items-center gap-2">
                            <UserMinus className="h-5 w-5" />
                            Offboard Employee
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <p className="text-sm text-muted-foreground">
                            Are you sure you want to offboard/terminate this employee? This will revoke their system access immediately but keep their historical records intact.
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOffboardId(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={confirmOffboard} className="bg-orange-600 hover:bg-orange-700">Yes, Offboard</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div >
    );
}

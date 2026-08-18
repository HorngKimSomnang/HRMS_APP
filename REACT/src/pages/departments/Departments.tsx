import { useState, useEffect } from 'react';
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
import { Plus, Pencil, Trash2, Search, Building2, Users, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/Label';
import { PageHeader } from '@/components/ui/PageHeader';
import api from '@/services/api';
import { toast } from 'sonner';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';

import { useAuth } from '@/context/AuthContext';

export default function Departments() {
    const { hasPermission } = useAuth();
    const [departments, setDepartments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    const [modalOpen, setModalOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [viewMode, setViewMode] = useState(false);
    const [currentDept, setCurrentDept] = useState<any>({ name: '', description: '' });
    const [deleteId, setDeleteId] = useState<number | null>(null);

    const [employeesModalOpen, setEmployeesModalOpen] = useState(false);
    const [deptEmployees, setDeptEmployees] = useState<any[]>([]);
    const [loadingEmployees, setLoadingEmployees] = useState(false);
    const [selectedDeptForEmployees, setSelectedDeptForEmployees] = useState<any>(null);

    const fetchDepartments = async () => {
        try {
            const response = await api.get('/departments');
            setDepartments(Array.isArray(response.data) ? response.data : (response.data.data || []));
        } catch (error) {
            console.error('Failed to fetch departments', error);
            toast.error('Failed to load departments');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDepartments();
    }, []);

    useLiveRefresh(fetchDepartments, { resources: ['departments'] });

    const handleSave = async () => {
        if (!currentDept.name.trim()) {
            toast.error('Department name is required');
            return;
        }

        try {
            if (editMode) {
                await api.patch(`/departments/${currentDept.id}`, currentDept);
                toast.success('Department updated successfully');
            } else {
                await api.post('/departments', currentDept);
                toast.success('Department created successfully');
            }
            setModalOpen(false);
            fetchDepartments();
        } catch (error: any) {
            console.error('Failed to save department', error);
            toast.error(error.response?.data?.message || 'Failed to save department');
        }
    };

    const confirmDelete = async () => {
        if (!deleteId) return;

        try {
            await api.delete(`/departments/${deleteId}`);
            toast.success('Department deleted successfully');
            setDeleteId(null);
            fetchDepartments();
        } catch (error: any) {
            console.error('Failed to delete department', error);
            // Display exact error message as requested
            toast.error(error.response?.data?.message || 'Failed to delete department');
            setDeleteId(null);
        }
    };

    const openEditModal = (dept: any) => {
        setCurrentDept(dept);
        setEditMode(true);
        setViewMode(false);
        setModalOpen(true);
    };

    const openViewModal = (dept: any) => {
        setCurrentDept(dept);
        setEditMode(false);
        setViewMode(true);
        setModalOpen(true);
    };

    const openCreateModal = () => {
        setCurrentDept({ name: '', description: '' });
        setEditMode(false);
        setViewMode(false);
        setModalOpen(true);
    };

    const openEmployeesModal = async (dept: any) => {
        setSelectedDeptForEmployees(dept);
        setEmployeesModalOpen(true);
        setLoadingEmployees(true);
        try {
            const response = await api.get(`/employees?department_id=${dept.id}&all=true`);
            const employeesList = Array.isArray(response.data) ? response.data : (response.data.data || []);
            
            const managerIds = (dept.managers || []).map((m: any) => m.employee_id || m.employee?.id).filter(Boolean);
                
            const combinedList = employeesList.map((emp: any) => {
                const isManager = managerIds.includes(emp.id);
                return {
                    ...emp,
                    isManager,
                };
            });
            setDeptEmployees(combinedList);
        } catch (error) {
            console.error('Failed to fetch employees for department', error);
            toast.error('Failed to load employees');
        } finally {
            setLoadingEmployees(false);
        }
    };

    const filteredDepartments = departments.filter(dept =>
        dept.name.toLowerCase().includes(search.toLowerCase()) ||
        (dept.description && dept.description.toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <div className="space-y-6">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500 p-8 text-white shadow-xl mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="relative z-10">
                    <h1 className="text-3xl font-bold font-poppins">Departments</h1>
                    <p className="text-sky-100 mt-2 text-sm font-medium">Manage company departments and view their managers.</p>
                </div>
                <div className="relative z-10">
                    {hasPermission('departments.create') && (
                        <Button
                            className="gap-2 bg-white/20 hover:bg-white/30 text-white border-white/50 backdrop-blur-sm"
                            onClick={openCreateModal}
                        >
                            <Plus className="h-4 w-4" /> New Department
                        </Button>
                    )}
                </div>
                {/* Decorative Pattern */}
                <div className="absolute top-0 right-0 -mt-10 -mr-10 h-40 w-40 rounded-full bg-white/10 blur-3xl"></div>
                <div className="absolute bottom-0 right-20 -mb-10 h-32 w-32 rounded-full bg-white/10 blur-2xl"></div>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="relative w-full sm:max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search departments..."
                        className="pl-9 bg-card"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="rounded-lg border border-violet-100 bg-gradient-to-br from-violet-50/50 via-card to-card shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead className="w-[300px]">Department</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Managers</TableHead>
                            <TableHead className="text-right">Employees</TableHead>
                            <TableHead className="text-center">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center h-32 text-muted-foreground">Loading departments...</TableCell>
                            </TableRow>
                        ) : filteredDepartments.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center h-32 text-muted-foreground">
                                    No departments found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredDepartments.map((dept) => (
                                <TableRow key={dept.id} className="hover:bg-muted/50 transition-colors">
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                                <Building2 className="h-4 w-4" />
                                            </div>
                                            <div className="font-medium text-foreground">{dept.name}</div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground truncate max-w-[200px]">
                                        {dept.description || '-'}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1">
                                            {dept.managers && dept.managers.length > 0 ? (
                                                dept.managers.map((m: any) => (
                                                    <span key={m.id} className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20">
                                                        {m.name}
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="text-xs text-muted-foreground italic">None</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Button
                                            variant="ghost"
                                            className={`h-8 flex items-center justify-end gap-1.5 ml-auto px-2 ${hasPermission('departments.view_employees') ? 'text-muted-foreground hover:text-indigo-600' : 'text-slate-300 cursor-not-allowed opacity-60'}`}
                                            onClick={() => openEmployeesModal(dept)}
                                            title={hasPermission('departments.view_employees') ? "View Employees" : "No Permission"}
                                            disabled={!hasPermission('departments.view_employees')}
                                        >
                                            <Users className="h-4 w-4" />
                                            <span>{dept.employees_count || 0}</span>
                                        </Button>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex justify-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className={`h-8 w-8 ${hasPermission('departments.view') ? 'text-slate-500 hover:text-slate-700 hover:bg-slate-100' : 'text-slate-300 cursor-not-allowed opacity-60'}`}
                                                onClick={() => openViewModal(dept)}
                                                title={hasPermission('departments.view') ? "View Department" : "No Permission"}
                                                disabled={!hasPermission('departments.view')}
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                            {dept.name.toLowerCase() !== 'unassigned' ? (
                                                <>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className={`h-8 w-8 ${hasPermission('departments.edit') ? 'text-blue-600 hover:text-blue-700 hover:bg-blue-50' : 'text-slate-300 cursor-not-allowed opacity-60'}`}
                                                        onClick={() => openEditModal(dept)}
                                                        title={hasPermission('departments.edit') ? "Edit Department" : "No Permission"}
                                                        disabled={!hasPermission('departments.edit')}
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className={`h-8 w-8 ${hasPermission('departments.delete') ? 'text-red-500 hover:text-red-700 hover:bg-red-50' : 'text-slate-300 cursor-not-allowed opacity-60'}`}
                                                        onClick={() => setDeleteId(dept.id)}
                                                        title={hasPermission('departments.delete') ? "Delete Department" : "No Permission"}
                                                        disabled={!hasPermission('departments.delete')}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </>
                                            ) : (
                                                <>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-slate-300 cursor-not-allowed opacity-40"
                                                        title="System default department cannot be edited"
                                                        disabled
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-slate-300 cursor-not-allowed opacity-40"
                                                        title="System default department cannot be deleted"
                                                        disabled
                                                    >
                                                        <Trash2 className="h-4 w-4" />
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

            {/* Create/Edit/View Modal */}
            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{viewMode ? 'View Department' : editMode ? 'Edit Department' : 'New Department'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Name {!viewMode && <span className="text-red-500">*</span>}</Label>
                            <Input
                                id="name"
                                value={currentDept.name}
                                onChange={(e) => setCurrentDept({ ...currentDept, name: e.target.value })}
                                placeholder="e.g. Engineering"
                                readOnly={viewMode}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Input
                                id="description"
                                value={currentDept.description || ''}
                                onChange={(e) => setCurrentDept({ ...currentDept, description: e.target.value })}
                                placeholder="Optional description"
                                readOnly={viewMode}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        {viewMode ? (
                            <Button onClick={() => setModalOpen(false)}>Close</Button>
                        ) : (
                            <>
                                <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
                                <Button onClick={handleSave}>{editMode ? 'Save Changes' : 'Create Department'}</Button>
                            </>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Employees List Modal */}
            <Dialog open={employeesModalOpen} onOpenChange={setEmployeesModalOpen}>
                <DialogContent className="sm:max-w-md md:max-w-2xl max-h-[80vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Employees in {selectedDeptForEmployees?.name}</DialogTitle>
                    </DialogHeader>
                    <div className="overflow-y-auto pr-2 py-4 flex-1">
                        {loadingEmployees ? (
                            <div className="text-center py-8 text-muted-foreground">Loading employees...</div>
                        ) : deptEmployees.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">No employees found in this department.</div>
                        ) : (
                            <div className="space-y-4">
                                {deptEmployees.map(emp => (
                                    <div key={emp.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 border rounded-lg bg-card gap-3">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 shrink-0 rounded-full overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center">
                                                {emp.profile_picture_url ? (
                                                    <img src={emp.profile_picture_url} alt="" className="h-full w-full object-cover" />
                                                ) : (
                                                    <span className="text-sm font-medium text-gray-500">
                                                        {emp.first_name && emp.last_name
                                                            ? `${emp.first_name[0]}${emp.last_name[0]}`.toUpperCase()
                                                            : (emp.name ? emp.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : 'EM')}
                                                    </span>
                                                )}
                                            </div>
                                            <div>
                                                <div className="font-medium text-slate-900">{emp.name || `${emp.first_name} ${emp.last_name}`}</div>
                                                <div className="text-sm text-slate-500 flex flex-wrap gap-x-3 gap-y-0.5">
                                                    <span className="font-medium">{emp.employee_code}</span>
                                                    {emp.email && <span className="text-slate-400">{emp.email}</span>}
                                                    {emp.phone && <span className="text-slate-400">{emp.phone}</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mt-2 sm:mt-0 flex gap-2 shrink-0 self-end sm:self-center">
                                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${emp.status === 'active' ? 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20' : 'bg-gray-50 text-gray-700 ring-1 ring-inset ring-gray-600/20'}`}>
                                                {emp.status}
                                            </span>
                                            {emp.role && (
                                                <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20">
                                                    {emp.role}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button onClick={() => setEmployeesModalOpen(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Modal */}
            <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-red-600 flex items-center gap-2">
                            <Trash2 className="h-5 w-5" />
                            Delete Department
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <p className="text-sm text-muted-foreground">
                            Are you sure you want to delete this department? This action cannot be undone.
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={confirmDelete}>Delete Department</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

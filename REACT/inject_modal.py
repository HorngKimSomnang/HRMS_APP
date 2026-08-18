import re

with open('REACT/src/pages/employees/EmployeeList.tsx', 'r') as f:
    content = f.read()

# 1. Add imports (Briefcase, Building2, Info, Shield)
if 'Briefcase' not in content:
    content = content.replace("import { Pencil, UserMinus, Plus, Search, Eye, Archive, KeyRound, RotateCcw, Users, Shield } from 'lucide-react';", 
                              "import { Pencil, UserMinus, Plus, Search, Eye, Archive, KeyRound, RotateCcw, Users, Shield, Briefcase, Building2, Info, Save } from 'lucide-react';")

# 2. Add state inside EmployeeList component
state_code = """    const [selectedAccessEmployee, setSelectedAccessEmployee] = useState<Employee | null>(null);
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
"""
if 'const [selectedAccessEmployee' not in content:
    content = content.replace("const [viewMode, setViewMode] = useState<'current' | 'archived'>('current');", 
                              "const [viewMode, setViewMode] = useState<'current' | 'archived'>('current');\n" + state_code)

# 3. Add Top right button next to "Add Employee"
top_button = """
                {viewMode === 'current' && canManageAccess && (
                    <Button
                        className={`gap-2 border shadow-sm transition-all ${
                            selectedAccessEmployee 
                                ? 'border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 hover:border-purple-300' 
                                : 'border-slate-200 bg-slate-50 text-slate-400 opacity-60 cursor-not-allowed'
                        }`}
                        disabled={!selectedAccessEmployee}
                        onClick={() => selectedAccessEmployee && openAccessModal(selectedAccessEmployee)}
                        title={selectedAccessEmployee ? `Manage access for ${selectedAccessEmployee.last_name} ${selectedAccessEmployee.first_name}` : 'Select an employee row first'}
                    >
                        <Shield className="h-4 w-4" />
                        {selectedAccessEmployee ? `${selectedAccessEmployee.last_name} Access` : 'Add Access'}
                    </Button>
                )}
"""
if '{selectedAccessEmployee ?' not in content:
    content = content.replace(
        "{viewMode === 'current' && (\n                    <Button className=\"gap-2\" onClick={() => navigate('/employees/create')}>\n                        <Plus className=\"h-4 w-4\" /> {t('employees.add_employee')}\n                    </Button>\n                )}",
        "<div className=\"flex items-center gap-3\">\n" + top_button + "\n                {viewMode === 'current' && (\n                    <Button className=\"gap-2\" onClick={() => navigate('/employees/create')}>\n                        <Plus className=\"h-4 w-4\" /> {t('employees.add_employee')}\n                    </Button>\n                )}\n                </div>"
    )

# 4. Remove Shield button from Actions column
content = re.sub(r'<Button\s+variant="ghost"\s+size="icon"\s+onClick=\{\(\) => navigate\(`/roles/manage\?userId=\$\{employee\.user_id\}`\)\}\s+title="Manage Access"\s*>\s*<Shield className="h-4 w-4 text-purple-500" />\s*</Button>', '', content, flags=re.DOTALL)

# 5. Make TableRow clickable
content = re.sub(
    r'<TableRow key=\{employee\.id\}>',
    r'<TableRow key={employee.id} className={`cursor-pointer transition-colors ${selectedAccessEmployee?.id === employee.id ? \'bg-purple-50/50 hover:bg-purple-50/70 border-l-2 border-l-purple-500\' : \'\'}`} onClick={() => viewMode === \'current\' && setSelectedAccessEmployee(employee)}>',
    content
)

# 6. Append the Dialog JSX before the closing </div>
modal_jsx = """
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
"""

if 'Edit Employee Access' not in content:
    content = content.replace('</div >\n    );\n}', modal_jsx + '\n        </div >\n    );\n}')

with open('REACT/src/pages/employees/EmployeeList.tsx', 'w') as f:
    f.write(content)


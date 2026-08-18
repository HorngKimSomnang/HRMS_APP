import re

with open('REACT/src/pages/employees/CreateEmployee.tsx', 'r') as f:
    content = f.read()

# Replace job_title with role in formData
content = content.replace("job_title: '', // Added replacement for branch/dept", "role: 'Employee',")
content = content.replace("job_title: '',", "role: 'Employee',")

# Add roles and departments state
state_code = """
    const [shifts, setShifts] = useState<ShiftOption[]>([]);
    const [roles, setRoles] = useState<any[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);

    useEffect(() => {
        const fetchOptions = async () => {
            try {
                const [shiftRes, roleRes, deptRes] = await Promise.all([
                    api.get('/shifts'),
                    api.get('/admin/roles'),
                    api.get('/admin/departments')
                ]);
                const availableShifts = shiftRes.data.data || [];
                setShifts(availableShifts);
                setRoles(roleRes.data || []);
                setDepartments(deptRes.data || []);
                
                setFormData(current => ({
                    ...current,
                    shift_id: current.shift_id || availableShifts[0]?.id || '',
                    role: current.role || 'Employee',
                    department: current.department || (deptRes.data && deptRes.data[0]?.name) || ''
                }));
            } catch (err) {
                console.error("Failed to fetch options", err);
            }
        };
        fetchOptions();
    }, []);
"""

content = re.sub(r'const \[shifts, setShifts].*?}, \[\]\);', state_code.strip(), content, flags=re.DOTALL)

# Replace the inputs in UI
ui_replace = """                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">System Role</label>
                        <select
                            name="role"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            onChange={handleChange}
                            value={formData.role}
                            required
                        >
                            <option value="">Select Role</option>
                            {roles.map(r => (
                                <option key={r.id} value={r.name}>{r.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Department</label>
                        <select
                            name="department"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            onChange={handleChange}
                            value={formData.department}
                            required
                        >
                            <option value="">Select Department</option>
                            {departments.map(d => (
                                <option key={d.id} value={d.name}>{d.name}</option>
                            ))}
                        </select>
                    </div>"""

# Find the div containing job_title and department
content = re.sub(r'<div className="space-y-1\.5">\s*<label className="text-sm font-medium">Job Title</label>\s*<Input name="job_title" required value=\{formData\.job_title\} onChange=\{handleChange\} placeholder="e\.g\. Software Engineer" />\s*</div>\s*<div className="space-y-1\.5">\s*<label className="text-sm font-medium">Department</label>\s*<Input name="department" value=\{formData\.department\} onChange=\{handleChange\} placeholder="e\.g\. IT, HR, Marketing" />\s*</div>', ui_replace, content)

with open('REACT/src/pages/employees/CreateEmployee.tsx', 'w') as f:
    f.write(content)

print("Done Create")

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import api from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { formatShiftOption, type ShiftOption } from '@/utils/shift';

export default function EditEmployee() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    
    const isSuperAdmin = user?.role?.is_super_admin === true || user?.role?.name === 'Super Admin';
    
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [isSelf, setIsSelf] = useState(false);
    const [shifts, setShifts] = useState<ShiftOption[]>([]);
    const [roles, setRoles] = useState<any[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);

    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        gender: '',
        dob: '',
        shift_id: '' as string | number,
        marital_status: '',
        name_kh: '',
        emergency_contact: '',
        address: '',
        department: '',
        job_title: '',
        salary: '',
        employee_code: '',
        joining_date: '',
        role: ''
    });

    const [profilePicture, setProfilePicture] = useState<File | null>(null);
    const [docNationalId, setDocNationalId] = useState<File | null>(null);
    const [docDegree, setDocDegree] = useState<File | null>(null);
    const [docCv, setDocCv] = useState<File | null>(null);

    const fetchEmployee = useCallback(async () => {
        try {
            const response = await api.get(`/employees/${id}`);
            const emp = response.data.data;
            if (user?.id === emp.user_id) {
                setIsSelf(true);
            }
            setFormData({
                first_name: emp.first_name,
                last_name: emp.last_name,
                email: emp.email || '',
                phone: emp.phone || '',
                gender: emp.gender,
                dob: emp.dob ? emp.dob.split('T')[0].split(' ')[0] : '',
                shift_id: emp.shift_id || '',
                marital_status: emp.documents?.marital_status || '',
                name_kh: emp.documents?.name_kh || '',
                emergency_contact: emp.documents?.emergency_contact || '',
                address: emp.address || '',
                department: emp.department || '',
                job_title: emp.job_title,
                salary: emp.salary || '',
                employee_code: emp.employee_code,
                joining_date: emp.joining_date ? emp.joining_date.split('T')[0].split(' ')[0] : '',
                role: emp.role || 'Employee'
            });
        } catch (error) {
            console.error('Failed to fetch employee', error);
        } finally {
            setFetching(false);
        }
    }, [id, user?.id]);

    const fetchOptions = useCallback(async () => {
        try {
            const [shiftRes, roleRes, deptRes] = await Promise.allSettled([
                api.get('/shifts'),
                api.get('/admin/roles'),
                api.get('/departments')
            ]);
            
            setShifts(shiftRes.status === 'fulfilled' ? (shiftRes.value.data.data || []) : []);
            setRoles(roleRes.status === 'fulfilled' ? (roleRes.value.data || []) : []);
            setDepartments(deptRes.status === 'fulfilled' ? (deptRes.value.data || []) : []);
        } catch (error) {
            console.error("Failed to fetch options", error);
        }
    }, []);

    useEffect(() => {
        fetchEmployee();
        fetchOptions();
    }, [fetchEmployee, fetchOptions]);

    useEffect(() => {
        if (!fetching && shifts.length > 0 && !formData.shift_id) {
            setFormData(current => ({
                ...current,
                shift_id: current.shift_id || shifts[0].id,
            }));
        }
    }, [fetching, shifts, formData.shift_id]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setProfilePicture(e.target.files[0]);
        }
    };

    // Specific document handlers
    const handleNationalIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) setDocNationalId(e.target.files[0]);
    };
    const handleDegreeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) setDocDegree(e.target.files[0]);
    };
    const handleCvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) setDocCv(e.target.files[0]);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const data = new FormData();
            data.append('_method', 'PUT');
            Object.entries(formData).forEach(([key, value]) => {
                if (value !== null && value !== undefined && value !== '') {
                    data.append(key, value.toString());
                }
            });

            if (profilePicture) {
                data.append('profile_picture', profilePicture);
            }
            if (docNationalId) data.append('doc_national_id', docNationalId);
            if (docDegree) data.append('doc_degree', docDegree);
            if (docCv) data.append('doc_cv', docCv);

            await api.post(`/employees/${id}`, data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            navigate('/employees');
        } catch (error: any) {
            console.error('Failed to update employee', error);
            toast.error(error.response?.data?.message || 'Failed to update employee');
        } finally {
            setLoading(false);
        }
    };

    if (fetching) return <div>Loading...</div>;

    return (
        <div className="max-w-5xl mx-auto py-4">
            <div className="flex items-center gap-4 mb-4 px-1">
                <button type="button" onClick={() => navigate('/employees')} className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors shadow-sm">
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">Edit Employee</h2>
            </div>
            
            <div className="bg-gradient-to-br from-blue-50/40 via-white to-white rounded-2xl shadow-sm border border-blue-100 p-6 sm:p-8">
                <form onSubmit={handleSubmit} className="space-y-5">

                {/* Profile Picture Input */}
                <div className="space-y-1.5">
                    <label className="text-sm font-medium">Profile Picture</label>
                    <Input type="file" onChange={handleFileChange} accept="image/*" />
                    <p className="text-xs text-muted-foreground">Leave blank to keep current picture.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">First Name</label>
                        <Input name="first_name" value={formData.first_name} required onChange={handleChange} />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Last Name</label>
                        <Input name="last_name" value={formData.last_name} required onChange={handleChange} />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Name in Khmer</label>
                        <Input name="name_kh" value={formData.name_kh} onChange={handleChange} placeholder="ឈ្មោះជាភាសាខ្មែរ" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Emergency Contact</label>
                        <Input name="emergency_contact" value={formData.emergency_contact} onChange={handleChange} placeholder="Guardian/Parents Number" />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Email</label>
                        <Input name="email" type="email" value={formData.email} required onChange={handleChange} placeholder="name@example.com" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Phone Number</label>
                        <Input name="phone" value={formData.phone} onChange={handleChange} />
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Date of Birth</label>
                        <Input name="dob" type="date" value={formData.dob} onChange={handleChange} />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Gender</label>
                        <select
                            name="gender"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            onChange={handleChange}
                            value={formData.gender}
                        >
                            <option value="">Select Gender</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Marital Status</label>
                        <select
                            name="marital_status"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            onChange={handleChange}
                            value={formData.marital_status}
                        >
                            <option value="">Select Marital Status</option>
                            <option value="Single">Single</option>
                            <option value="Married">Married (Have Family)</option>
                            <option value="Divorced">Divorced</option>
                            <option value="Widowed">Widowed</option>
                        </select>
                    </div>
                </div>

                <div className="space-y-4 border p-4 rounded-lg bg-slate-50/50">
                    <h3 className="font-semibold text-slate-800">Attached Documents</h3>
                    <p className="text-xs text-muted-foreground -mt-2 mb-2">Uploading a new file will replace the existing document of that type.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">National ID</label>
                            <Input type="file" onChange={handleNationalIdChange} />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Degree</label>
                            <Input type="file" onChange={handleDegreeChange} />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">CV</label>
                            <Input type="file" onChange={handleCvChange} />
                        </div>
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-sm font-medium">Address</label>
                    <textarea
                        name="address"
                        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={formData.address}
                        onChange={handleChange}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Employee Code (Read-only)</label>
                        <Input name="employee_code" value={formData.employee_code} disabled className="bg-muted cursor-not-allowed" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Joining Date</label>
                        <Input name="joining_date" type="date" value={formData.joining_date} required onChange={handleChange} />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                        <label className="text-sm font-medium">Role</label>
                        <select
                            name="role"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            onChange={handleChange}
                            value={formData.role}
                            disabled={isSelf}
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
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Salary (Monthly){(isSelf && !isSuperAdmin) && "(Read-only for your own profile)"}</label>
                        <Input name="salary" type="number" value={formData.salary} onChange={handleChange} disabled={isSelf && !isSuperAdmin} className={(isSelf && !isSuperAdmin) ? "bg-muted cursor-not-allowed" : ""} />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Assigned Shift</label>
                        <select
                            name="shift_id"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            onChange={handleChange}
                            value={formData.shift_id}
                            required
                            disabled={shifts.length === 0}
                        >
                            <option value="" disabled>Select an assigned shift</option>
                            {shifts.map(shift => (
                                <option key={shift.id} value={shift.id}>
                                    {formatShiftOption(shift)}
                                </option>
                            ))}
                        </select>
                        <p className="text-xs text-muted-foreground">
                            Standard schedule: Monday–Saturday at Norton University.
                        </p>
                    </div>
                </div>

                

                <div className="flex justify-end gap-4 pt-6 border-t mt-8">
                    <Button type="button" variant="outline" onClick={() => navigate('/employees')} className="px-6">Cancel</Button>
                    <Button type="submit" disabled={loading} className="px-8">
                        {loading ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </form>
            </div>
        </div>
    );
}

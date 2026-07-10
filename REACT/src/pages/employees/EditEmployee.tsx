import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import api from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

export default function EditEmployee() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [isSelf, setIsSelf] = useState(false);
    const [shifts, setShifts] = useState<any[]>([]);

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
                email: emp.email ? emp.email.replace('@gmail.com', '') : '',
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

    const fetchShifts = useCallback(async () => {
        try {
            const res = await api.get('/shifts');
            setShifts(res.data.data);
        } catch (error) {
            console.error("Failed to fetch shifts", error);
        }
    }, []);

    useEffect(() => {
        fetchEmployee();
        fetchShifts();
    }, [fetchEmployee, fetchShifts]);

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
                    let finalValue = value.toString();
                    if (key === 'email' && !finalValue.includes('@')) {
                        finalValue = `${finalValue}@gmail.com`;
                    }
                    data.append(key, finalValue);
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
            <div className="bg-gradient-to-br from-blue-50/40 via-white to-white rounded-2xl shadow-sm border border-blue-100 p-6 sm:p-8">
                <h2 className="text-2xl font-bold tracking-tight mb-6 text-slate-900 border-b pb-4">Edit Employee</h2>
                <form onSubmit={handleSubmit} className="space-y-5">

                {/* Profile Picture Input */}
                <div className="space-y-1.5">
                    <label className="text-sm font-medium">Profile Picture / រូបថតប្រវត្តិរូប</label>
                    <Input type="file" onChange={handleFileChange} accept="image/*" />
                    <p className="text-xs text-muted-foreground">Leave blank to keep current picture.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">First Name / នាមខ្លួន</label>
                        <Input name="first_name" value={formData.first_name} required onChange={handleChange} />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Last Name / នាមត្រកូល</label>
                        <Input name="last_name" value={formData.last_name} required onChange={handleChange} />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Name in Khmer / ឈ្មោះជាភាសាខ្មែរ</label>
                        <Input name="name_kh" value={formData.name_kh} onChange={handleChange} placeholder="ឈ្មោះជាភាសាខ្មែរ" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Emergency Contact / ទំនាក់ទំនងបន្ទាន់</label>
                        <Input name="emergency_contact" value={formData.emergency_contact} onChange={handleChange} placeholder="Guardian/Parents Number" />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Email / អ៊ីមែល</label>
                        <div className="flex rounded-md">
                            <Input name="email" type="text" value={formData.email} required onChange={handleChange} className="rounded-r-none focus-visible:ring-0 focus-visible:ring-offset-0" placeholder="username" />
                            <div className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-input bg-muted text-muted-foreground text-sm">
                                @gmail.com
                            </div>
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Phone Number / លេខទូរស័ព្ទ</label>
                        <Input name="phone" value={formData.phone} onChange={handleChange} />
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Date of Birth / ថ្ងៃខែឆ្នាំកំណើត</label>
                        <Input name="dob" type="date" value={formData.dob} onChange={handleChange} />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Gender / ភេទ</label>
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
                        <label className="text-sm font-medium">Marital Status / ស្ថានភាពគ្រួសារ</label>
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
                            <label className="text-sm font-medium">National ID / អត្តសញ្ញាណប័ណ្ណ</label>
                            <Input type="file" onChange={handleNationalIdChange} />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Degree / សញ្ញាប័ត្រ</label>
                            <Input type="file" onChange={handleDegreeChange} />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">CV / ប្រវត្តិរូបសង្ខេប</label>
                            <Input type="file" onChange={handleCvChange} />
                        </div>
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-sm font-medium">Address / អាសយដ្ឋាន</label>
                    <textarea
                        name="address"
                        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={formData.address}
                        onChange={handleChange}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Employee Code (Read-only) / លេខកូដបុគ្គលិក</label>
                        <Input name="employee_code" value={formData.employee_code} disabled className="bg-muted cursor-not-allowed" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Joining Date / ថ្ងៃចូលធ្វើការ</label>
                        <Input name="joining_date" type="date" value={formData.joining_date} required onChange={handleChange} />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Job Title / មុខតំណែង {isSelf && "(Read-only for your own profile)"}</label>
                        <Input name="job_title" value={formData.job_title} required onChange={handleChange} disabled={isSelf} className={isSelf ? "bg-muted cursor-not-allowed" : ""} />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Department / ផ្នែក</label>
                        <Input name="department" value={formData.department || ''} onChange={handleChange} placeholder="e.g. Engineering" />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Salary (Monthly) / ប្រាក់ខែ {isSelf && "(Read-only for your own profile)"}</label>
                        <Input name="salary" type="number" value={formData.salary} onChange={handleChange} disabled={isSelf} className={isSelf ? "bg-muted cursor-not-allowed" : ""} />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Assigned Shift / វេនការងារ</label>
                        <select
                            name="shift_id"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            onChange={handleChange}
                            value={formData.shift_id}
                        >
                            <option value="">No Shift / Default</option>
                            {shifts.map(shift => (
                                <option key={shift.id} value={shift.id}>{shift.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {user?.roles?.some((r: any) => r.name === 'Super Admin') && (
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">System Role / តួនាទីក្នុងប្រព័ន្ធ</label>
                            <select
                                name="role"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                onChange={handleChange}
                                value={formData.role}
                            >
                                <option value="Employee">Employee</option>
                                <option value="Admin">Admin</option>
                                <option value="Super Admin">Super Admin</option>
                            </select>
                        </div>
                    </div>
                )}

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

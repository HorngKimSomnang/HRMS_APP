import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import api from '@/services/api';
import { toast } from 'sonner';

export default function CreateEmployee() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        job_title: '', // Added replacement for branch/dept
        department: '',
        // branch_id: '', // Removed
        // department_id: '', // Removed
        joining_date: '',
        salary: '',
        phone: '',
        address: '',
        gender: '',
        dob: '',
        shift_id: '' as string | number,
        marital_status: '',
        name_kh: '',
        emergency_contact: ''
    });

    const [shifts, setShifts] = useState<{id: number, name: string}[]>([]);

    useEffect(() => {
        const fetchOptions = async () => {
            try {
                const res = await api.get('/shifts');
                setShifts(res.data.data || []);
            } catch {
                console.error("Failed to fetch shifts");
            }
        };
        fetchOptions();
    }, []);

    // Fetches removed as tables deleted
    /*
    const [branches, setBranches] = useState<any[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);

    useEffect(() => {
        const fetchOptions = async () => { ... };
        fetchOptions();
    }, []);
    */

    const [profilePicture, setProfilePicture] = useState<File | null>(null);
    const [docNationalId, setDocNationalId] = useState<File | null>(null);
    const [docDegree, setDocDegree] = useState<File | null>(null);
    const [docCv, setDocCv] = useState<File | null>(null);

    // ... useEffect ...

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
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
            Object.keys(formData).forEach(key => {
                const value = formData[key as keyof typeof formData];
                if (value !== null && value !== '') {
                    data.append(key, String(value));
                }
            });
            if (profilePicture) {
                data.append('profile_picture', profilePicture);
            }
            if (docNationalId) data.append('doc_national_id', docNationalId);
            if (docDegree) data.append('doc_degree', docDegree);
            if (docCv) data.append('doc_cv', docCv);

            const response = await api.post('/employees', data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            if (response.data?.credentials_email_sent === false) {
                toast.warning(response.data.message);
            } else {
                toast.success(response.data?.message || 'Employee created successfully');
            }
            
            navigate('/employees');
        } catch (error: any) {
            console.error('Failed to create employee', error);
            toast.error(error.response?.data?.message || 'Failed to create employee');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto py-4">
            <div className="bg-gradient-to-br from-blue-50/40 via-white to-white rounded-2xl shadow-sm border border-blue-100 p-6 sm:p-8">
                <h2 className="text-2xl font-bold tracking-tight mb-6 text-slate-900 border-b pb-4">Add New Employee</h2>
                <form onSubmit={handleSubmit} className="space-y-5">

                {/* Profile Picture Input */}
                <div className="space-y-1.5">
                    <label className="text-sm font-medium">Profile Picture / រូបថតប្រវត្តិរូប</label>
                    <Input type="file" onChange={handleFileChange} accept="image/*" />
                </div>

                {/* Personal Information */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">First Name / នាមខ្លួន</label>
                        <Input name="first_name" required value={formData.first_name} onChange={handleChange} />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Last Name / នាមត្រកូល</label>
                        <Input name="last_name" required value={formData.last_name} onChange={handleChange} />
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
                        <Input name="email" type="email" required value={formData.email} onChange={handleChange} placeholder="name@example.com" />
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
                        <label className="text-sm font-medium">Salary (Monthly) / ប្រាក់ខែ</label>
                        <Input name="salary" type="number" value={formData.salary} onChange={handleChange} />
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

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Joining Date / ថ្ងៃចូលធ្វើការ</label>
                        <Input name="joining_date" type="date" required value={formData.joining_date} onChange={handleChange} />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Job Title / មុខតំណែង</label>
                        <Input name="job_title" required value={formData.job_title} onChange={handleChange} placeholder="e.g. Software Engineer" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Department / ផ្នែក</label>
                        <Input name="department" value={formData.department} onChange={handleChange} placeholder="e.g. Engineering" />
                    </div>
                </div>

                <div className="flex justify-end gap-4 pt-6 border-t mt-8">
                    <Button type="button" variant="outline" onClick={() => navigate('/employees')} className="px-6">Cancel</Button>
                    <Button type="submit" disabled={loading} className="px-8">
                        {loading ? 'Creating...' : 'Create Employee'}
                    </Button>
                </div>
            </form>
            </div>
        </div>
    );
}

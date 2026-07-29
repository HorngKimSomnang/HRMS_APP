import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Mail, Phone,
    Building2, User, Clock, FileText, Briefcase, MapPin, Trash2
} from 'lucide-react';
import api from '@/services/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';

interface EmployeeDetail {
    id: number;
    employee_code: string;
    first_name: string;
    last_name: string;
    email?: string;
    phone?: string;
    job_title?: string;
    department?: string;
    joining_date?: string;
    address?: string;
    gender?: string;
    dob?: string;
    salary?: string;
    profile_picture_url?: string;
    documents?: {
        marital_status?: string;
        name_kh?: string;
        emergency_contact?: string;
        attachments?: { name: string; url: string; path: string }[];
    };
}

export default function ViewEmployee() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [employee, setEmployee] = useState<EmployeeDetail | null>(null);
    const [attendance, setAttendance] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleteDocName, setDeleteDocName] = useState<string | null>(null);
    const [deleteAttId, setDeleteAttId] = useState<number | null>(null);

    const fmt = (d?: string) => d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
    const fmtTime = (d?: string) => d ? new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';

    const fetchEmployee = useCallback(async () => {
        try {
            const [empRes, attRes] = await Promise.all([
                api.get(`/employees/${id}`),
                api.get(`/employees/${id}/attendance`).catch(() => ({ data: { data: [] } }))
            ]);
            setEmployee(empRes.data.data);
            setAttendance(attRes.data.data || []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, [id]);

    useEffect(() => { fetchEmployee(); }, [fetchEmployee]);
    useLiveRefresh(fetchEmployee, { resources: ['employees', 'attendance'] });

    const handleRemoveDocument = async () => {
        if (!deleteDocName) return;
        try {
            await api.delete(`/employees/${id}/documents/${encodeURIComponent(deleteDocName)}`);
            toast.success("Document removed");
            fetchEmployee();
        } catch { toast.error("Failed to remove document"); }
        finally { setDeleteDocName(null); }
    };

    const handleRemoveAttendance = async () => {
        if (!deleteAttId) return;
        try {
            await api.delete(`/attendance/${deleteAttId}`);
            toast.success("Attendance record removed");
            fetchEmployee();
        } catch { toast.error("Failed to remove attendance"); }
        finally { setDeleteAttId(null); }
    };

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="h-8 w-8 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
        </div>
    );
    if (!employee) return (
        <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-500">
            <p>Employee not found.</p>
            <button onClick={() => navigate('/employees')} className="text-indigo-600 font-bold hover:underline">Go Back</button>
        </div>
    );

    const initials = `${employee.first_name[0] || ''}${employee.last_name[0] || ''}`;
    
    const docs = employee.documents?.attachments || [];

    // Categorize documents into Personal vs Work
    const personalKeywords = [
        'national id', 'degree', 'certificate', 'cv', 'resume', 'passport', 
        'id card', 'birth certificate', 'family book', 'diploma', 'transcript', 
        'personal', 'academic', 'qualification', 'educational', 'license', 'study'
    ];

    const personalDocs = docs.filter(doc => {
        const nameLower = doc.name.toLowerCase();
        
        // Work keywords have highest priority for Work docs
        const workKeywords = ['contract', 'agreement', 'policy', 'handbook', 'nda', 'company', 'work', 'employment', 'business', 'notice', 'announcement', 'task'];
        if (workKeywords.some(keyword => nameLower.includes(keyword))) {
            return false;
        }

        const nameParts = [employee.first_name, employee.last_name].filter(Boolean).map(n => n.toLowerCase());
        const matchesEmployeeName = nameParts.some(part => nameLower.includes(part));
        
        return personalKeywords.some(keyword => nameLower.includes(keyword)) || matchesEmployeeName;
    });

    // Work docs removed from view

    return (
        <div className="flex flex-col gap-5 w-full max-w-[1400px] mx-auto p-4 pb-8">
            {/* Header */}
            <div className="flex items-center justify-between shrink-0 px-2">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/employees')} className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors shadow-sm">
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none mb-1">Employee Profile</h1>
                        <p className="text-sm font-medium text-slate-500">View detailed information about {employee.last_name}.</p>
                    </div>
                </div>
                <button onClick={() => navigate(`/employees/edit/${employee.id}`)}
                    className="px-4 py-2 rounded-xl bg-indigo-600 border border-indigo-700 text-white text-sm font-bold hover:bg-indigo-700 transition-all shadow-sm">
                    Edit Profile
                </button>
            </div>

            {/* MAIN CONTENT AREA - 2 Perfectly Balanced Columns */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
                    
                {/* Left Column (4/12) - Profile, Contact, Documents */}
                <div className="xl:col-span-4 flex flex-col gap-5">
                    {/* Profile Card */}
                    <div className="bg-white rounded-[16px] border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
                        <div className="h-24 bg-gradient-to-r from-purple-500 to-blue-500 relative"></div>
                        <div className="px-5 pb-6 relative flex flex-col items-center text-center">
                            <div className="h-24 w-24 rounded-full border-4 border-white bg-slate-100 overflow-hidden shadow-sm -mt-12 mb-4 relative z-10">
                                {employee.profile_picture_url ? (
                                    <img src={employee.profile_picture_url} className="h-full w-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-3xl font-black text-indigo-500">{initials}</div>
                                )}
                            </div>
                            <h2 className="text-xl font-black text-slate-800 leading-tight">{employee.last_name} {employee.first_name}</h2>
                            <p className="text-sm font-semibold text-blue-600 mt-1 mb-3">{employee.job_title || 'Software Engineer'}</p>
                            <p className="text-xs font-bold text-slate-500 bg-slate-50 border border-slate-200 px-4 py-1.5 rounded-full">{employee.employee_code}</p>
                        </div>
                    </div>

                    {/* Contact Info */}
                    <div className="bg-gradient-to-br from-sky-50/50 via-white to-white rounded-[16px] border border-sky-100 shadow-sm p-6">
                        <h3 className="text-base font-black text-slate-800 mb-5 pb-4 border-b border-slate-100">Contact Info</h3>
                        <div className="space-y-5">
                            {employee.email && (
                                <div className="flex items-center gap-3 text-sm font-semibold text-slate-600">
                                    <Mail className="h-5 w-5 text-slate-400 shrink-0" />
                                    <span className="truncate">{employee.email}</span>
                                </div>
                            )}
                            {employee.phone && (
                                <div className="flex items-center gap-3 text-sm font-semibold text-slate-600">
                                    <Phone className="h-5 w-5 text-slate-400 shrink-0" />
                                    <span>{employee.phone}</span>
                                </div>
                            )}
                            <div className="flex items-center gap-3 text-sm font-semibold text-slate-600">
                                <MapPin className="h-5 w-5 text-slate-400 shrink-0" />
                                <span className="truncate">{employee.address || '—'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Attached Documents */}
                    <div className="bg-gradient-to-br from-indigo-50/50 via-white to-white rounded-[16px] border border-indigo-100 shadow-sm p-6">
                        <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                                <FileText className="h-5 w-5 text-blue-600" />
                                <h3 className="text-base font-black text-slate-800">Attached Documents</h3>
                            </div>
                            <span className="text-xs font-black text-slate-500 bg-slate-100 px-3 py-1 rounded-md">{personalDocs.length} Files</span>
                        </div>
                        
                        <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-1">
                            {personalDocs.length > 0 ? personalDocs.map((doc, i) => (
                                <div key={i} className="flex items-center justify-between p-3 rounded-[12px] border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors group">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-500 border border-indigo-100/50 shrink-0">
                                            <FileText className="h-4 w-4" />
                                        </div>
                                        <span className="text-sm font-bold text-slate-700 truncate">{doc.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0 ml-3">
                                        <a href={doc.url} target="_blank" rel="noreferrer" className="text-xs font-black uppercase tracking-wider text-indigo-600 hover:text-white hover:bg-indigo-600 transition-colors bg-white px-4 py-2 rounded-md border border-slate-200 shadow-sm">
                                            View
                                        </a>
                                        <button onClick={() => setDeleteDocName(doc.name)} className="p-2 rounded-md text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors border border-transparent hover:border-red-100 ml-1" title="Delete Document">
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            )) : (
                                <div className="p-8 rounded-[12px] border border-dashed border-slate-200 flex items-center justify-center text-slate-400 text-sm font-bold">
                                    No documents attached.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column (8/12) - Employment, Personal, Attendance */}
                <div className="xl:col-span-8 flex flex-col gap-5">
                    
                    {/* Employment Details */}
                    <div className="bg-gradient-to-br from-blue-50/50 via-white to-white rounded-[16px] border border-blue-100 shadow-sm p-6">
                        <div className="flex items-center gap-2 mb-5 pb-4 border-b border-slate-100">
                            <Briefcase className="h-5 w-5 text-blue-600" />
                            <h3 className="text-base font-black text-slate-800">Employment Details</h3>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-y-6 gap-x-6">
                            <div className="col-span-1 md:col-span-2">
                                <p className="text-xs font-bold text-slate-500 flex items-center gap-1.5 mb-2"><Building2 className="h-4 w-4" /> Department</p>
                                <p className="text-sm font-semibold text-slate-800">{employee.department || '—'}</p>
                            </div>
                            <div className="col-span-1 md:col-span-2">
                                <p className="text-xs font-bold text-slate-500 flex items-center gap-1.5 mb-2"><Clock className="h-4 w-4" /> Joining Date</p>
                                <p className="text-sm font-semibold text-slate-800">{fmt(employee.joining_date)}</p>
                            </div>
                            <div className="col-span-1 md:col-span-2">
                                <p className="text-xs font-bold text-slate-500 flex items-center gap-1.5 mb-2"><FileText className="h-4 w-4" /> Base Salary</p>
                                <p className="text-sm font-semibold text-slate-800">{employee.salary ? `$${employee.salary}` : '—'}</p>
                            </div>
                            <div className="col-span-1 md:col-span-2">
                                <p className="text-xs font-bold text-slate-500 flex items-center gap-1.5 mb-2"><Clock className="h-4 w-4" /> Shift Assignment</p>
                                <p className="text-sm font-semibold text-slate-800">Standard Shift</p>
                            </div>
                        </div>
                    </div>

                    {/* Personal Information */}
                    <div className="bg-gradient-to-br from-violet-50/50 via-white to-white rounded-[16px] border border-violet-100 shadow-sm p-6">
                        <div className="flex items-center gap-2 mb-5 pb-4 border-b border-slate-100">
                            <User className="h-5 w-5 text-blue-600" />
                            <h3 className="text-base font-black text-slate-800">Personal Information</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-y-6 gap-x-6">
                            <div>
                                <p className="text-xs font-bold text-slate-500 mb-2">Gender</p>
                                <p className="text-sm font-semibold text-slate-800 capitalize">{employee.gender || '—'}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-500 mb-2">Date of Birth</p>
                                <p className="text-sm font-semibold text-slate-800">{fmt(employee.dob)}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-500 mb-2">Name in Khmer</p>
                                <p className="text-sm font-semibold text-slate-800">{employee.documents?.name_kh || '—'}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-500 mb-2">Emergency Contact</p>
                                <p className="text-sm font-semibold text-slate-800">{employee.documents?.emergency_contact || '—'}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-500 mb-2">Marital Status</p>
                                <p className="text-sm font-semibold text-slate-800 capitalize">{employee.documents?.marital_status || 'Single'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Attendance History */}
                    <div className="bg-gradient-to-br from-green-50/50 via-white to-white rounded-[16px] border border-green-100 shadow-sm p-6 flex flex-col flex-1">
                        <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                                <Clock className="h-5 w-5 text-blue-600" />
                                <h3 className="text-base font-black text-slate-800">Attendance History</h3>
                            </div>
                            <span className="text-xs font-black text-slate-500 bg-slate-100 px-3 py-1.5 rounded-md">{attendance.length} Records</span>
                        </div>
                        
                        <div className="overflow-y-auto max-h-[350px] rounded-[12px] border border-slate-100 bg-slate-50/30 hide-scrollbar">
                            {attendance.length > 0 ? (
                                <table className="w-full text-left border-collapse">
                                    <thead className="sticky top-0 bg-slate-50/90 backdrop-blur-md z-10 shadow-sm">
                                        <tr>
                                            <th className="px-5 py-4 text-xs font-black text-slate-500 uppercase tracking-widest border-b border-slate-100">Date</th>
                                            <th className="px-5 py-4 text-xs font-black text-slate-500 uppercase tracking-widest border-b border-slate-100">In</th>
                                            <th className="px-5 py-4 text-xs font-black text-slate-500 uppercase tracking-widest border-b border-slate-100">Out</th>
                                            <th className="px-5 py-4 text-xs font-black text-slate-500 uppercase tracking-widest border-b border-slate-100 text-right"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {attendance.map((att, i) => (
                                            <tr key={i} className="hover:bg-slate-100/50 transition-colors border-b border-slate-100/50 last:border-none">
                                                <td className="px-5 py-4 text-sm font-bold text-slate-700 whitespace-nowrap">{fmt(att.date)}</td>
                                                <td className="px-5 py-4 text-sm font-semibold text-slate-600">{fmtTime(att.clock_in)}</td>
                                                <td className="px-5 py-4 text-sm font-semibold text-slate-600">{fmtTime(att.clock_out)}</td>
                                                <td className="px-5 py-4 text-sm font-semibold text-slate-600 text-right">
                                                    <button onClick={() => setDeleteAttId(att.id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete Record">
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="flex flex-col items-center justify-center text-slate-400 gap-4 p-12">
                                    <Clock className="h-10 w-10 opacity-30" />
                                    <p className="text-sm font-bold">No attendance records found</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </div>

            {/* Modals */}
            <Dialog open={!!deleteDocName} onOpenChange={(open) => !open && setDeleteDocName(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-red-600 flex items-center gap-2"><Trash2 className="h-5 w-5" /> Delete Document</DialogTitle>
                    </DialogHeader>
                    <div className="py-4"><p className="text-sm text-slate-600">Are you sure you want to delete this document? This cannot be undone.</p></div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteDocName(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleRemoveDocument}>Delete Document</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!deleteAttId} onOpenChange={(open) => !open && setDeleteAttId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-red-600 flex items-center gap-2"><Trash2 className="h-5 w-5" /> Delete Attendance Record</DialogTitle>
                    </DialogHeader>
                    <div className="py-4"><p className="text-sm text-slate-600">Are you sure you want to delete this attendance record? This cannot be undone.</p></div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteAttId(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleRemoveAttendance}>Delete Record</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Mail, Phone,
    Building2, User, Clock, FileText, Briefcase, MapPin, Trash2
} from 'lucide-react';
import api from '@/services/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
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

    const personalKeywords = [
        'national id', 'degree', 'certificate', 'cv', 'resume', 'passport', 
        'id card', 'birth certificate', 'family book', 'diploma', 'transcript', 
        'personal', 'academic', 'qualification', 'educational', 'license', 'study'
    ];

    const personalDocs = docs.filter(doc => {
        const nameLower = doc.name.toLowerCase();
        
        const workKeywords = ['contract', 'agreement', 'policy', 'handbook', 'nda', 'company', 'work', 'employment', 'business', 'notice', 'announcement', 'task'];
        if (workKeywords.some(keyword => nameLower.includes(keyword))) {
            return false;
        }

        const nameParts = [employee.first_name, employee.last_name].filter(Boolean).map(n => n.toLowerCase());
        const matchesEmployeeName = nameParts.some(part => nameLower.includes(part));
        
        return personalKeywords.some(keyword => nameLower.includes(keyword)) || matchesEmployeeName;
    });

    const ReadOnlyField = ({ label, value }: { label: string, value?: string | number }) => (
        <div className="space-y-1.5">
            <label className="text-sm font-medium">{label}</label>
            <Input value={value || ''} disabled className="bg-muted cursor-not-allowed text-slate-800" />
        </div>
    );

    const ReadOnlyTextArea = ({ label, value }: { label: string, value?: string }) => (
        <div className="space-y-1.5">
            <label className="text-sm font-medium">{label}</label>
            <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-muted px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-100 text-slate-800"
                value={value || ''}
                disabled
            />
        </div>
    );

    return (
        <div className="max-w-5xl mx-auto py-4">
            <div className="flex items-center gap-4 mb-4 px-1">
                <button type="button" onClick={() => navigate('/employees')} className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors shadow-sm">
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">Employee Profile</h2>
            </div>

            <div className="bg-gradient-to-br from-blue-50/40 via-white to-white rounded-2xl shadow-sm border border-blue-100 p-6 sm:p-8 flex flex-col gap-5">
                
                {/* Profile Picture */}
                <div className="space-y-1.5">
                    <label className="text-sm font-medium">Profile Picture</label>
                    <div className="h-24 w-24 rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
                        {employee.profile_picture_url ? (
                            <img src={employee.profile_picture_url} className="h-full w-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-3xl font-black text-indigo-500">{initials}</div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <ReadOnlyField label="First Name" value={employee.first_name} />
                    <ReadOnlyField label="Last Name" value={employee.last_name} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <ReadOnlyField label="Name in Khmer" value={employee.documents?.name_kh} />
                    <ReadOnlyField label="Emergency Contact" value={employee.documents?.emergency_contact} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <ReadOnlyField label="Email" value={employee.email} />
                    <ReadOnlyField label="Phone Number" value={employee.phone} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <ReadOnlyField label="Date of Birth" value={fmt(employee.dob)} />
                    <ReadOnlyField label="Gender" value={employee.gender} />
                    <ReadOnlyField label="Marital Status" value={employee.documents?.marital_status} />
                </div>

                <div className="space-y-4 border p-4 rounded-lg bg-slate-50/50">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-slate-800">Attached Documents</h3>
                        <span className="text-xs font-black text-slate-500 bg-slate-100 px-3 py-1 rounded-md">{personalDocs.length} Files</span>
                    </div>
                    
                    <div className="flex flex-col gap-3">
                        {personalDocs.length > 0 ? personalDocs.map((doc, i) => (
                            <div key={i} className="flex items-center justify-between p-3 rounded-[12px] border border-slate-200 bg-white shadow-sm">
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
                            <div className="p-8 rounded-[12px] border border-dashed border-slate-200 flex items-center justify-center text-slate-400 text-sm font-bold bg-white">
                                No documents attached.
                            </div>
                        )}
                    </div>
                </div>

                <ReadOnlyTextArea label="Address" value={employee.address} />

                <div className="grid grid-cols-2 gap-4">
                    <ReadOnlyField label="Employee Code" value={employee.employee_code} />
                    <ReadOnlyField label="Joining Date" value={fmt(employee.joining_date)} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <ReadOnlyField label="Role" value={(employee as any)?.user?.role?.name || (employee as any)?.role?.name || (employee as any)?.role || '—'} />
                    <ReadOnlyField label="Department" value={employee.department} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <ReadOnlyField label="Salary (Monthly)" value={employee.salary ? `$${employee.salary}` : '—'} />
                    <ReadOnlyField label="Assigned Shift" value={(employee as any)?.shift?.name || 'Standard Shift'} />
                </div>
            </div>

            {/* Attendance History */}
            <div className="mt-8 bg-gradient-to-br from-green-50/40 via-white to-white rounded-2xl shadow-sm border border-green-100 p-6 sm:p-8">
                <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-green-600" />
                        <h3 className="text-lg font-bold tracking-tight text-slate-900">Attendance History</h3>
                    </div>
                    <span className="text-xs font-black text-slate-500 bg-slate-100 px-3 py-1.5 rounded-md">{attendance.length} Records</span>
                </div>
                
                <div className="overflow-y-auto max-h-[350px] rounded-xl border border-slate-200 bg-slate-50/50">
                    {attendance.length > 0 ? (
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 bg-white z-10 shadow-sm">
                                <tr>
                                    <th className="px-5 py-4 text-xs font-black text-slate-500 uppercase tracking-widest border-b border-slate-200">Date</th>
                                    <th className="px-5 py-4 text-xs font-black text-slate-500 uppercase tracking-widest border-b border-slate-200">In</th>
                                    <th className="px-5 py-4 text-xs font-black text-slate-500 uppercase tracking-widest border-b border-slate-200">Out</th>
                                    <th className="px-5 py-4 text-xs font-black text-slate-500 uppercase tracking-widest border-b border-slate-200 text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white">
                                {attendance.map((att, idx) => (
                                    <tr key={att.id} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                                        <td className="px-5 py-3 text-sm font-semibold text-slate-800">{fmt(att.date)}</td>
                                        <td className="px-5 py-3 text-sm font-bold text-emerald-600">{fmtTime(att.clock_in)}</td>
                                        <td className="px-5 py-3 text-sm font-bold text-amber-600">{fmtTime(att.clock_out)}</td>
                                        <td className="px-5 py-3 text-sm font-bold text-right">
                                            <span className={`px-3 py-1 rounded-full text-[10px] uppercase tracking-wider ${att.status === 'Present' ? 'bg-emerald-100 text-emerald-700' :
                                                att.status === 'Absent' ? 'bg-red-100 text-red-700' :
                                                att.status === 'Late' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                                                {att.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                            <Clock className="h-8 w-8 mb-3 opacity-20" />
                            <p className="text-sm font-bold">No attendance records found.</p>
                        </div>
                    )}
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

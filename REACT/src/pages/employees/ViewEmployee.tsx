import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, Calendar, MapPin, Briefcase, Building2, User, Clock, Wallet } from 'lucide-react';
import api from '@/services/api';
import { Button } from '@/components/ui/Button';

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
    const [loading, setLoading] = useState(true);

    const formatDate = (dateString?: string) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    useEffect(() => {
        fetchEmployee();
    }, [id]);

    const fetchEmployee = async () => {
        try {
            const response = await api.get(`/employees/${id}`);
            setEmployee(response.data.data);
        } catch (error) {
            console.error('Failed to fetch employee details', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-muted-foreground">Loading employee details...</div>;
    }

    if (!employee) {
        return (
            <div className="p-8 text-center">
                <p className="text-muted-foreground mb-4">Employee not found.</p>
                <Button onClick={() => navigate('/employees')}>Back to Employees</Button>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Button variant="outline" size="icon" onClick={() => navigate('/employees')}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">Employee Profile</h2>
                        <p className="text-muted-foreground">View detailed information about {employee.first_name}.</p>
                    </div>
                </div>
                <Button onClick={() => navigate(`/employees/edit/${employee.id}`)} variant="outline">
                    Edit Profile
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Column: Quick Profile */}
                <div className="col-span-1 space-y-6">
                    <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
                        <div className="bg-gradient-to-r from-violet-500 to-primary h-24"></div>
                        <div className="px-6 pb-6 pt-0 flex flex-col items-center -mt-12 text-center">
                            <div className="h-24 w-24 rounded-full border-4 border-card bg-muted overflow-hidden flex items-center justify-center mb-3">
                                {employee.profile_picture_url ? (
                                    <img src={employee.profile_picture_url} alt="Profile" className="h-full w-full object-cover" />
                                ) : (
                                    <span className="text-3xl font-bold text-muted-foreground">
                                        {employee.first_name[0]}{employee.last_name[0]}
                                    </span>
                                )}
                            </div>
                            <h3 className="text-xl font-bold">{employee.first_name} {employee.last_name}</h3>
                            <p className="text-primary font-medium text-sm">{employee.job_title || 'No Title'}</p>
                            <p className="text-muted-foreground text-xs mt-1">{employee.employee_code}</p>
                        </div>
                    </div>

                    <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-5 space-y-4">
                        <h4 className="font-semibold border-b pb-2">Contact Info</h4>
                        <div className="space-y-3">
                            <div className="flex items-start gap-3 text-sm">
                                <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                                <span className="text-slate-700 break-all">{employee.email || '-'}</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                <span className="text-slate-700">{employee.phone || '-'}</span>
                            </div>
                            <div className="flex items-start gap-3 text-sm">
                                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                <span className="text-slate-700 leading-snug">{employee.address || '-'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Detailed Info */}
                <div className="col-span-1 md:col-span-2 space-y-6">
                    <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
                        <h4 className="font-semibold text-lg border-b pb-3 mb-4 flex items-center gap-2">
                            <Briefcase className="h-5 w-5 text-primary" /> Employment Details
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-4">
                            <div>
                                <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" /> Department</p>
                                <p className="font-medium">{employee.department || '-'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Joining Date</p>
                                <p className="font-medium">{formatDate(employee.joining_date)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1.5"><Wallet className="h-3.5 w-3.5" /> Base Salary</p>
                                <p className="font-medium">{employee.salary ? `$${employee.salary}` : '-'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Shift Assignment</p>
                                <p className="font-medium">Standard Shift</p>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
                        <h4 className="font-semibold text-lg border-b pb-3 mb-4 flex items-center gap-2">
                            <User className="h-5 w-5 text-primary" /> Personal Information
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-4">
                            <div>
                                <p className="text-sm text-muted-foreground mb-1">Gender</p>
                                <p className="font-medium capitalize">{employee.gender || '-'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground mb-1">Date of Birth</p>
                                <p className="font-medium">{formatDate(employee.dob)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground mb-1">Name in Khmer</p>
                                <p className="font-medium">{employee.documents?.name_kh || '-'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground mb-1">Emergency Contact</p>
                                <p className="font-medium">{employee.documents?.emergency_contact || '-'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground mb-1">Marital Status</p>
                                <p className="font-medium capitalize">{employee.documents?.marital_status || 'Single'}</p>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
                        <h4 className="font-semibold text-lg border-b pb-3 mb-4 flex items-center gap-2">
                            <Briefcase className="h-5 w-5 text-primary" /> Attached Documents
                        </h4>
                        <div className="space-y-3">
                            {employee.documents?.attachments && employee.documents.attachments.length > 0 ? (
                                employee.documents.attachments.map((doc, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center text-primary text-xl">
                                                📄
                                            </div>
                                            <div>
                                                <p className="font-medium text-sm">{doc.name}</p>
                                            </div>
                                        </div>
                                        <a href={doc.url} target="_blank" rel="noreferrer" className="text-primary text-sm hover:underline">
                                            View/Download
                                        </a>
                                    </div>
                                ))
                            ) : (
                                <p className="text-muted-foreground text-sm">No documents attached.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

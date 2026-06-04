import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import api from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { Check, X, CalendarDays, FileText, CheckCircle2, XCircle, ShieldAlert, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/Label";
import { Input } from "@/components/ui/Input";
import { toast } from 'sonner';

export default function LeaveList() {
    const { user } = useAuth();
    const isSuperAdmin = user?.roles?.some((r: any) => r.name === 'Super Admin') ?? false;
    const [leaves, setLeaves] = useState<any[]>([]);
    const [balances, setBalances] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
    const [employees, setEmployees] = useState<any[]>([]);
    const [isAssignOpen, setIsAssignOpen] = useState(false);
    const [assignForm, setAssignForm] = useState({
        employee_id: '',
        date: new Date().toISOString().split('T')[0],
        reason: 'Assigned Day Off by Admin'
    });

    const [revokeId, setRevokeId] = useState<number | null>(null);
    const [statusUpdate, setStatusUpdate] = useState<{ id: number, status: 'approved' | 'rejected' } | null>(null);
    const [rejectionReason, setRejectionReason] = useState("");

    const fetchLeaves = async (isPolling = false) => {
        if (!isPolling) setLoading(true);
        try {
            const [resLeaves, resBalances, resEmployees] = await Promise.all([
                api.get('/leaves'),
                api.get('/leaves/balances'),
                api.get('/employees?status=active&all=true')
            ]);
            // Backend returns direct array for index()
            setLeaves(Array.isArray(resLeaves.data) ? resLeaves.data : (resLeaves.data.data || []));
            setBalances(Array.isArray(resBalances.data) ? resBalances.data : []);
            setEmployees(resEmployees.data.data || resEmployees.data || []);
        } catch (error) {
            console.error("Failed to fetch leaves", error);
        } finally {
            if (!isPolling) setLoading(false);
        }
    };

    useEffect(() => {
        fetchLeaves();
        const interval = setInterval(() => fetchLeaves(true), 10000);
        return () => clearInterval(interval);
    }, []);

    const openStatusModal = (id: number, status: 'approved' | 'rejected') => {
        setStatusUpdate({ id, status });
        setRejectionReason("");
    };

    const confirmStatusUpdate = async () => {
        if (!statusUpdate) return;
        const { id, status } = statusUpdate;
        let rejection_reason = '';

        if (status === 'rejected') {
            if (rejectionReason.trim() === '') {
                toast.error("Rejection reason is required.");
                return;
            }
            rejection_reason = rejectionReason;
        }

        try {
            await api.put(`/leaves/${id}/status`, { status, rejection_reason });
            setLeaves(leaves.map(l => l.id === id ? { ...l, status } : l));
            setStatusUpdate(null);
        } catch (error: any) {
            console.error("Failed to update status", error);
            const msg = error.response?.data?.message || "Failed to update status";
            toast(msg);
        }
    };

    const openRevokeModal = (id: number) => {
        setRevokeId(id);
    };

    const confirmRevoke = async () => {
        if (!revokeId) return;
        try {
            await api.delete(`/leaves/${revokeId}`);
            setLeaves(leaves.filter(l => l.id !== revokeId));
            setRevokeId(null);
            toast.success("Leave revoked and balance refunded!");
        } catch (error: any) {
            console.error("Failed to revoke leave", error);
            toast.error(error.response?.data?.message || "Failed to revoke leave");
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'approved': 
                return (
                    <div className="inline-flex items-center gap-1.5 text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-3 py-1 rounded-full text-xs font-semibold shadow-sm transition-all hover:bg-emerald-100 hover:shadow-emerald-100">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Approved
                    </div>
                );
            case 'rejected': 
                return (
                    <div className="inline-flex items-center gap-1.5 text-red-700 bg-red-50 border border-red-200/60 px-3 py-1 rounded-full text-xs font-semibold shadow-sm transition-all hover:bg-red-100 hover:shadow-red-100">
                        <XCircle className="h-3.5 w-3.5" /> Rejected
                    </div>
                );
            case 'pending': 
                return (
                    <div className="inline-flex items-center gap-1.5 text-amber-700 bg-amber-50 border border-amber-200/60 px-3 py-1 rounded-full text-xs font-semibold shadow-sm transition-all hover:bg-amber-100 hover:shadow-amber-100">
                        <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse"></div> Pending
                    </div>
                );
            default: return <span className="text-gray-600 bg-gray-100 px-3 py-1 rounded-full text-xs">{status}</span>;
        }
    };

    const filteredLeaves = leaves.filter(l => filter === 'all' || l.status === filter);

    const handleAssignDayOff = async () => {
        if (!assignForm.employee_id) return toast('Select an employee');
        try {
            await api.post('/leaves', {
                employee_id: assignForm.employee_id,
                leave_type: 'Scheduled Day Off',
                start_date: assignForm.date,
                end_date: assignForm.date,
                reason: assignForm.reason
            });
            setIsAssignOpen(false);
            fetchLeaves();
            toast.success("Day Off assigned successfully!");
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to assign day off");
        }
    };

    return (
        <div className="space-y-6">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 p-8 text-white shadow-xl">
                <div className="relative z-10 flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold font-poppins">Leave Management</h1>
                        <p className="text-blue-100 mt-2 text-sm font-medium">Review, approve, and manage employee leave requests seamlessly.</p>
                    </div>
                    <Button variant="secondary" className="bg-white text-blue-700 hover:bg-blue-50" onClick={() => setIsAssignOpen(true)}>
                        + Assign Day Off
                    </Button>
                </div>
                {/* Decorative Pattern */}
                <div className="absolute right-0 top-0 h-full w-1/3 opacity-20">
                    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                        <path fill="#FFFFFF" d="M44.7,-76.4C58.9,-69.2,71.8,-59.1,81.6,-46.6C91.4,-34.1,98.1,-19.2,95.8,-5.3C93.5,8.6,82.2,21.5,70.9,32.2C59.6,42.9,48.3,51.4,36.4,58.5C24.5,65.6,11.9,71.3,-1.2,73.4C-14.3,75.5,-29.6,74,-42.6,67.3C-55.6,60.6,-66.3,48.7,-74.8,35.3C-83.3,21.9,-89.6,7,-87.8,-7.1C-86,-21.2,-76.1,-34.5,-64.8,-45.5C-53.5,-56.5,-40.8,-65.2,-27.5,-73.1C-14.2,-81,-0.3,-88.1,13.8,-88C28,-87.9,40,-80.6,44.7,-76.4Z" transform="translate(100 100)" />
                    </svg>
                </div>
            </div>

            {/* Leave Balances (For Logged-in User) */}
            {balances.length > 0 && (
                <div className="mt-6">
                    <h2 className="text-sm font-semibold text-muted-foreground mb-3 px-1">Your Leave Balances</h2>
                    <div className="flex overflow-x-auto pb-2 gap-3 hide-scrollbar snap-x">
                        {balances.map(b => (
                            <div key={b.leave_type} className="flex-none w-48 bg-card border rounded-xl p-3 shadow-sm snap-start">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider truncate w-2/3">{b.leave_type}</h3>
                                    {b.days_remaining === 0 && <span className="text-[9px] bg-red-100 text-red-600 font-bold px-1.5 py-0.5 rounded-sm">LIMIT</span>}
                                </div>
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-xl font-bold text-foreground leading-none">{b.days_remaining}</span>
                                    <span className="text-xs font-medium text-muted-foreground">/ {b.days_allowed} d</span>
                                </div>
                                <div className="mt-2.5 w-full bg-secondary rounded-full h-1.5 overflow-hidden">
                                    <div 
                                        className={`h-full ${b.days_remaining === 0 ? 'bg-red-500' : 'bg-primary'}`} 
                                        style={{ width: `${b.days_allowed > 0 ? (b.days_used / b.days_allowed) * 100 : 0}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="flex items-center gap-1.5 p-1.5 rounded-full bg-card border border-border shadow-sm w-fit mt-6 overflow-hidden relative">
                {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`relative px-6 py-2.5 text-sm font-semibold rounded-full capitalize transition-all duration-300 outline-none ${filter === f ? 'text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
                    >
                        {filter === f && (
                            <motion.div
                                layoutId="leaveTabs"
                                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                className="absolute inset-0 bg-primary/10 backdrop-blur-sm shadow-[0_0_10px_rgba(59,130,246,0.1)] border border-primary/20 rounded-full"
                            />
                        )}
                        <span className="relative z-10">{f} Requests</span>
                    </button>
                ))}
            </div>

            <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="rounded-2xl border bg-card/70 backdrop-blur-xl shadow-lg dark:shadow-none overflow-hidden"
            >
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead>Employee</TableHead>
                            <TableHead>Leave Type</TableHead>
                            <TableHead>Duration</TableHead>
                            <TableHead>Dates</TableHead>
                            <TableHead>Reason</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center h-32 text-muted-foreground">Loading requests...</TableCell>
                            </TableRow>
                        ) : filteredLeaves.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center h-32 text-muted-foreground">
                                    No {filter === 'all' ? '' : filter} leave requests found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredLeaves.map((leave) => (
                                <TableRow key={leave.id} className="hover:bg-muted/50 transition-colors">
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                                {(leave.user?.name?.[0] || leave.employee?.first_name?.[0] || "U").toUpperCase()}
                                            </div>
                                            <div>
                                                <div>{leave.user?.name || `${leave.employee?.first_name} ${leave.employee?.last_name}`}</div>
                                                <div className="text-xs text-muted-foreground">{leave.employee?.employee_code}</div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-medium text-foreground">
                                        <div className="flex items-center gap-2">
                                            <FileText className="h-4 w-4 text-muted-foreground" />
                                            {leave.leave_type?.name}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2 bg-muted/50 border border-border px-2.5 py-1 rounded-md w-fit">
                                            <span className="font-bold text-foreground">{leave.days_count}</span>
                                            <span className="text-xs text-muted-foreground font-medium">Days</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-sm font-medium text-foreground/80">
                                        <div className="flex items-center gap-2">
                                            <CalendarDays className="h-4 w-4 text-muted-foreground" />
                                            <span>{new Date(leave.start_date).toLocaleDateString()} - {new Date(leave.end_date).toLocaleDateString()}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="max-w-[200px] truncate text-muted-foreground" title={leave.reason}>
                                            {leave.reason}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {getStatusBadge(leave.status)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <AnimatePresence>
                                            {/* NORMAL: Approve/Reject for pending leaves (Admin + Super Admin) */}
                                            {leave.status === 'pending' && (
                                                <motion.div
                                                    initial={{ opacity: 0, scale: 0.9 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    exit={{ opacity: 0, scale: 0.9 }}
                                                    className="flex justify-end gap-2"
                                                >
                                                    <Button size="icon" variant="outline" className="h-9 w-9 rounded-full bg-background shadow-sm text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 hover:scale-105 transition-all outline-none" onClick={() => openStatusModal(leave.id, 'approved')} title="Approve">
                                                        <Check className="h-4 w-4 stroke-[3]" />
                                                    </Button>
                                                    <Button size="icon" variant="outline" className="h-9 w-9 rounded-full bg-background shadow-sm text-red-600 hover:text-red-700 hover:bg-red-500/10 hover:scale-105 transition-all outline-none" onClick={() => openStatusModal(leave.id, 'rejected')} title="Reject">
                                                        <X className="h-4 w-4 stroke-[3]" />
                                                    </Button>
                                                </motion.div>
                                            )}

                                            {/* GOD MODE: Super Admin override on already-processed leaves */}
                                            {leave.status !== 'pending' && isSuperAdmin && (
                                                <motion.div
                                                    initial={{ opacity: 0, scale: 0.9 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    className="flex flex-col items-end gap-1.5"
                                                >
                                                    <div className="flex items-center gap-1 text-[10px] text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full font-semibold">
                                                        <ShieldAlert className="h-3 w-3" /> God Mode Override
                                                    </div>
                                                    <div className="flex gap-1.5">
                                                        {leave.status !== 'approved' && (
                                                            <Button size="icon" variant="outline" className="h-8 w-8 rounded-full text-emerald-600 hover:bg-emerald-50 border-emerald-200" onClick={() => openStatusModal(leave.id, 'approved')} title="Override: Approve">
                                                                <Check className="h-3.5 w-3.5 stroke-[3]" />
                                                            </Button>
                                                        )}
                                                        {leave.status !== 'rejected' && (
                                                            <Button size="icon" variant="outline" className="h-8 w-8 rounded-full text-red-600 hover:bg-red-50 border-red-200" onClick={() => openStatusModal(leave.id, 'rejected')} title="Override: Reject">
                                                                <X className="h-3.5 w-3.5 stroke-[3]" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </motion.div>
                                            )}

                                            {/* Admin: Revoke already-processed leaves */}
                                            {leave.status !== 'pending' && (isSuperAdmin || user?.roles?.some((r: any) => r.name === 'Admin')) && (
                                                <Button 
                                                    size="icon" 
                                                    variant="ghost" 
                                                    className="h-8 w-8 ml-2 text-red-500 hover:text-red-700 hover:bg-red-50" 
                                                    onClick={() => openRevokeModal(leave.id)} 
                                                    title="Revoke / Soft Delete"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </AnimatePresence>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </motion.div>

            <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Assign Day Off</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>Employee</Label>
                            <select 
                                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={assignForm.employee_id}
                                onChange={e => setAssignForm({...assignForm, employee_id: e.target.value})}
                            >
                                <option value="">Select Employee...</option>
                                {employees.map(emp => (
                                    <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="grid gap-2">
                            <Label>Date</Label>
                            <Input 
                                type="date" 
                                value={assignForm.date}
                                onChange={e => setAssignForm({...assignForm, date: e.target.value})}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Reason / Note</Label>
                            <Input 
                                value={assignForm.reason}
                                onChange={e => setAssignForm({...assignForm, reason: e.target.value})}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAssignOpen(false)}>Cancel</Button>
                        <Button onClick={handleAssignDayOff}>Confirm Day Off</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Status Update Confirmation Modal */}
            <Dialog open={!!statusUpdate} onOpenChange={(open) => !open && setStatusUpdate(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirm {statusUpdate?.status === 'approved' ? 'Approval' : 'Rejection'}</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <p className="text-sm text-muted-foreground mb-4">
                            Are you sure you want to <strong>{statusUpdate?.status}</strong> this leave request?
                        </p>
                        {statusUpdate?.status === 'rejected' && (
                            <div className="grid gap-2">
                                <Label>Reason for Rejection <span className="text-red-500">*</span></Label>
                                <Input 
                                    placeholder="Enter rejection reason..."
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    autoFocus
                                />
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setStatusUpdate(null)}>Cancel</Button>
                        <Button 
                            variant={statusUpdate?.status === 'rejected' ? 'destructive' : 'default'}
                            onClick={confirmStatusUpdate}
                        >
                            Confirm {statusUpdate?.status}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Revoke Confirmation Modal */}
            <Dialog open={!!revokeId} onOpenChange={(open) => !open && setRevokeId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-red-600 flex items-center gap-2">
                            <ShieldAlert className="h-5 w-5" />
                            Revoke Leave
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <p className="text-sm text-muted-foreground">
                            Are you sure you want to <strong>REVOKE</strong> this leave? 
                            This action will soft-delete the record and automatically refund the employee's leave balance.
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRevokeId(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={confirmRevoke}>Yes, Revoke Leave</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import api from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { Check, X, Clock, CalendarDays, CheckCircle2, XCircle, Banknote } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';

export default function OvertimeList() {
    const { user } = useAuth();
    const isAdmin = user?.roles?.some((r: any) => r.name === 'Admin') ?? false;
    const [overtimes, setOvertimes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
    const [statusUpdate, setStatusUpdate] = useState<{ id: number, status: 'approved' | 'rejected' } | null>(null);

    const fetchOvertimes = async (isPolling = false) => {
        if (!isPolling) setLoading(true);
        try {
            const res = await api.get('/overtimes');
            setOvertimes(Array.isArray(res.data) ? res.data : (res.data.data || []));
        } catch (error) {
            console.error("Failed to fetch overtimes", error);
        } finally {
            if (!isPolling) setLoading(false);
        }
    };

    useEffect(() => {
        fetchOvertimes();
        const interval = setInterval(() => fetchOvertimes(true), 10000);
        return () => clearInterval(interval);
    }, []);

    const confirmStatusUpdate = async () => {
        if (!statusUpdate) return;
        const { id, status } = statusUpdate;

        try {
            await api.put(`/overtimes/${id}`, { status });
            // Optimistic update
            setOvertimes(overtimes.map(ot => ot.id === id ? { ...ot, status } : ot));
            setStatusUpdate(null);
            toast.success(`Overtime request ${status}`);
        } catch (error: any) {
            console.error("Failed to update status", error);
            const msg = error.response?.data?.message || "Failed to update status";
            toast(msg);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'approved': 
                return (
                    <div className="flex flex-col gap-1">
                        <div className="inline-flex items-center gap-1.5 text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-3 py-1 rounded-full text-xs font-semibold">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Approved
                        </div>
                        <div className="inline-flex items-center gap-1.5 text-blue-600 bg-blue-50 border border-blue-200/60 px-2.5 py-0.5 rounded-full text-[10px] font-medium">
                            <Banknote className="h-3 w-3" /> Queued for Payroll
                        </div>
                    </div>
                );
            case 'rejected': 
                return (
                    <div className="inline-flex items-center gap-1.5 text-red-700 bg-red-50 border border-red-200/60 px-3 py-1 rounded-full text-xs font-semibold">
                        <XCircle className="h-3.5 w-3.5" /> Rejected
                    </div>
                );
            case 'pending': 
                return (
                    <div className="inline-flex items-center gap-1.5 text-amber-700 bg-amber-50 border border-amber-200/60 px-3 py-1 rounded-full text-xs font-semibold">
                        <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse"></div> Pending
                    </div>
                );
            default: return <span className="text-gray-600 bg-gray-100 px-3 py-1 rounded-full text-xs">{status}</span>;
        }
    };

    const filteredOvertimes = overtimes.filter(l => filter === 'all' || l.status === filter);

    return (
        <div className="space-y-6">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-rose-500 via-pink-600 to-purple-600 p-8 text-white shadow-xl">
                <div className="relative z-10">
                    <h1 className="text-3xl font-bold font-poppins">Overtime Management</h1>
                    <p className="text-rose-100 mt-2 text-sm font-medium">Review, approve, and manage employee overtime requests seamlessly.</p>
                </div>
                {/* Decorative Pattern */}
                <div className="absolute right-0 top-0 h-full w-1/3 opacity-20">
                    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                        <path fill="#FFFFFF" d="M44.7,-76.4C58.9,-69.2,71.8,-59.1,81.6,-46.6C91.4,-34.1,98.1,-19.2,95.8,-5.3C93.5,8.6,82.2,21.5,70.9,32.2C59.6,42.9,48.3,51.4,36.4,58.5C24.5,65.6,11.9,71.3,-1.2,73.4C-14.3,75.5,-29.6,74,-42.6,67.3C-55.6,60.6,-66.3,48.7,-74.8,35.3C-83.3,21.9,-89.6,7,-87.8,-7.1C-86,-21.2,-76.1,-34.5,-64.8,-45.5C-53.5,-56.5,-40.8,-65.2,-27.5,-73.1C-14.2,-81,-0.3,-88.1,13.8,-88C28,-87.9,40,-80.6,44.7,-76.4Z" transform="translate(100 100)" />
                    </svg>
                </div>
            </div>

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
                                layoutId="otTabs"
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
                            <TableHead>Date</TableHead>
                            <TableHead>Duration</TableHead>
                            <TableHead>Time</TableHead>
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
                        ) : filteredOvertimes.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center h-32 text-muted-foreground">
                                    No {filter === 'all' ? '' : filter} overtime requests found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredOvertimes.map((ot) => (
                                <TableRow key={ot.id} className="hover:bg-muted/50 transition-colors">
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                                {(ot.employee?.user?.name?.[0] || ot.employee?.employee_code?.[0] || "U").toUpperCase()}
                                            </div>
                                            <div>
                                                <div>{ot.employee?.user?.name}</div>
                                                <div className="text-xs text-muted-foreground">{ot.employee?.employee_code}</div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-sm font-medium text-foreground/80">
                                        <div className="flex items-center gap-2">
                                            <CalendarDays className="h-4 w-4 text-muted-foreground" />
                                            <span>{new Date(ot.date).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2 bg-muted/50 border border-border px-2.5 py-1 rounded-md w-fit">
                                            <span className="font-bold text-foreground">{ot.hours}</span>
                                            <span className="text-xs text-muted-foreground font-medium">Hours</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-sm font-medium text-foreground/80">
                                        <div className="flex items-center gap-2">
                                            <Clock className="h-4 w-4 text-muted-foreground" />
                                            <span>
                                                {ot.start_time && ot.end_time 
                                                  ? `${ot.start_time.substring(0, 5)} - ${ot.end_time.substring(0, 5)}`
                                                  : '-'}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="max-w-[200px] truncate text-muted-foreground" title={ot.reason}>
                                            {ot.reason}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {getStatusBadge(ot.status)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {/* Only Admin can approve/reject — Super Admin has God Mode via backend */}
                                        {isAdmin && (
                                            <AnimatePresence>
                                                {ot.status === 'pending' && (
                                                    <motion.div 
                                                        initial={{ opacity: 0, scale: 0.9 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        exit={{ opacity: 0, scale: 0.9 }}
                                                        className="flex justify-end gap-2"
                                                    >
                                                        <Button size="icon" variant="outline" className="h-9 w-9 rounded-full bg-background shadow-sm text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 hover:scale-105 transition-all outline-none" onClick={() => setStatusUpdate({ id: ot.id, status: 'approved' })} title="Approve">
                                                            <Check className="h-4 w-4 stroke-[3]" />
                                                        </Button>
                                                        <Button size="icon" variant="outline" className="h-9 w-9 rounded-full bg-background shadow-sm text-red-600 hover:text-red-700 hover:bg-red-500/10 hover:scale-105 transition-all outline-none" onClick={() => setStatusUpdate({ id: ot.id, status: 'rejected' })} title="Reject">
                                                            <X className="h-4 w-4 stroke-[3]" />
                                                        </Button>
                                                    </motion.div>
                                                )}
                                                {ot.status !== 'pending' && (
                                                    <span className="text-xs text-muted-foreground italic">Processed</span>
                                                )}
                                            </AnimatePresence>
                                        )}
                                        {!isAdmin && (
                                            <span className="text-xs text-muted-foreground italic">View Only</span>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </motion.div>

            {/* Status Update Confirmation Modal */}
            <Dialog open={!!statusUpdate} onOpenChange={(open) => !open && setStatusUpdate(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirm {statusUpdate?.status === 'approved' ? 'Approval' : 'Rejection'}</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <p className="text-sm text-muted-foreground">
                            Are you sure you want to <strong>{statusUpdate?.status}</strong> this overtime request?
                        </p>
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
        </div>
    );
}

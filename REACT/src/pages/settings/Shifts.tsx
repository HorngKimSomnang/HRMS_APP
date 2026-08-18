import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import api from '@/services/api';
import { Plus, Edit, Trash2, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';

interface Shift {
    id: number;
    name: string;
    start_time: string;
    end_time: string;
    grace_period_minutes: number;
    work_days?: string[];
}

export default function Shifts() {
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [viewShift, setViewShift] = useState<Shift | null>(null);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    
    const [formData, setFormData] = useState({
        id: null as number | null,
        name: '',
        start_time: '08:00',
        end_time: '16:55',
        grace_period_minutes: 15,
        work_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as string[],
    });

    const fetchShifts = async () => {
        try {
            const res = await api.get('/shifts');
            setShifts(res.data.data);
        } catch {
            toast.error('Failed to fetch shifts');
        } finally {
            setLoading(false);
        }
    };

    useLiveRefresh(fetchShifts, { resources: 'shifts' });

    useEffect(() => {
        fetchShifts();
    }, []);

    const handleSubmit = async () => {
        const previousShifts = shifts;
        const temporaryId = -Date.now();
        const optimisticShift: Shift = {
            ...formData,
            id: formData.id ?? temporaryId,
            start_time: formData.start_time.length === 5 ? `${formData.start_time}:00` : formData.start_time,
            end_time: formData.end_time.length === 5 ? `${formData.end_time}:00` : formData.end_time,
        };

        setShifts(current => formData.id
            ? current.map(shift => shift.id === formData.id ? optimisticShift : shift)
            : [...current, optimisticShift]
        );
        setIsDialogOpen(false);

        try {
            if (formData.id) {
                const response = await api.put(`/shifts/${formData.id}`, formData);
                setShifts(current => current.map(shift => (
                    shift.id === formData.id ? response.data.data : shift
                )));
                toast.success('Shift updated');
            } else {
                const response = await api.post('/shifts', formData);
                setShifts(current => current.map(shift => (
                    shift.id === temporaryId ? response.data.data : shift
                )));
                toast.success('Shift created');
            }
        } catch (error: any) {
            setShifts(previousShifts);
            setIsDialogOpen(true);
            toast.error(error.response?.data?.message || 'Failed to save shift');
        }
    };

    const confirmDelete = async () => {
        if (!deleteId) return;
        const id = deleteId;
        const previousShifts = shifts;
        setShifts(current => current.filter(shift => shift.id !== id));
        setDeleteId(null);

        try {
            await api.delete(`/shifts/${id}`);
            toast.success('Shift deleted');
        } catch {
            setShifts(previousShifts);
            toast.error('Failed to delete shift');
        }
    };

    const openEdit = (shift: Shift) => {
        // Strip out seconds if any for the time input types
        setFormData({
            id: shift.id,
            name: shift.name,
            start_time: shift.start_time.substring(0, 5),
            end_time: shift.end_time.substring(0, 5),
            grace_period_minutes: shift.grace_period_minutes,
            work_days: shift.work_days || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        });
        setIsDialogOpen(true);
    };

    const openCreate = () => {
        setFormData({ id: null, name: '', start_time: '08:00', end_time: '16:55', grace_period_minutes: 15, work_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] });
        setIsDialogOpen(true);
    };

    return (
        <div className="p-6">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 p-8 text-white shadow-xl mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="relative z-10">
                    <h1 className="text-3xl font-bold font-poppins">Shift & Schedule Management</h1>
                    <p className="text-cyan-100 mt-2 text-sm font-medium">Configure and manage employee work shifts and timing rules.</p>
                </div>
                <div className="relative z-10">
                    <Button onClick={openCreate} className="bg-white/20 hover:bg-white/30 text-white border-white/50 backdrop-blur-sm"><Plus className="w-4 h-4 mr-2" /> Add Shift</Button>
                </div>
                {/* Decorative Pattern */}
                <div className="absolute top-0 right-0 -mt-10 -mr-10 h-40 w-40 rounded-full bg-white/10 blur-3xl"></div>
                <div className="absolute bottom-0 right-20 -mb-10 h-32 w-32 rounded-full bg-white/10 blur-2xl"></div>
            </div>

            <div className="bg-gradient-to-br from-amber-50/50 via-card to-card text-card-foreground rounded-xl border border-amber-100 shadow-sm flex flex-col">
                <div className="p-6 pb-2">
                    <h3 className="text-lg font-semibold leading-none tracking-tight">Configured Shifts</h3>
                </div>
                <div className="p-6 pt-0">
                    {loading ? <p>Loading...</p> : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Shift Name</TableHead>
                                    <TableHead>Start Time</TableHead>
                                    <TableHead>End Time</TableHead>
                                    <TableHead>Working Days</TableHead>
                                    <TableHead>Grace Period (mins)</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {shifts.map(shift => (
                                    <TableRow key={shift.id}>
                                        <TableCell className="font-medium">{shift.name}</TableCell>
                                        <TableCell>{shift.start_time}</TableCell>
                                        <TableCell>{shift.end_time}</TableCell>
                                        <TableCell>{shift.work_days ? shift.work_days.map(d => d.substring(0, 3)).join(', ') : 'Mon, Tue, Wed, Thu, Fri, Sat'}</TableCell>
                                        <TableCell>{shift.grace_period_minutes}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => setViewShift(shift)}>
                                                <Eye className="w-4 h-4 text-slate-500" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => openEdit(shift)}>
                                                <Edit className="w-4 h-4 text-blue-500" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => setDeleteId(shift.id)}>
                                                <Trash2 className="w-4 h-4 text-red-500" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {shifts.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-4">No shifts created yet.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </div>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{formData.id ? 'Edit' : 'Create'} Shift</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>Shift Name</Label>
                            <Input placeholder="e.g. Morning Shift" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>Start Time</Label>
                                <Input type="time" value={formData.start_time} onChange={e => setFormData({ ...formData, start_time: e.target.value })} />
                            </div>
                            <div className="grid gap-2">
                                <Label>End Time</Label>
                                <Input type="time" value={formData.end_time} onChange={e => setFormData({ ...formData, end_time: e.target.value })} />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label>Late Grace Period (Minutes)</Label>
                            <Input type="number" min="0" value={formData.grace_period_minutes} onChange={e => setFormData({ ...formData, grace_period_minutes: parseInt(e.target.value) || 0 })} />
                        </div>
                        <div className="grid gap-2">
                            <Label>Working Days</Label>
                            <div className="flex flex-wrap gap-2 mt-1">
                                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
                                    <label key={day} className="flex items-center gap-1 text-sm border px-2 py-1 rounded cursor-pointer hover:bg-gray-50">
                                        <input 
                                            type="checkbox" 
                                            checked={formData.work_days?.includes(day) || false}
                                            onChange={(e) => {
                                                const current = formData.work_days || [];
                                                setFormData({
                                                    ...formData,
                                                    work_days: e.target.checked 
                                                        ? [...current, day] 
                                                        : current.filter(d => d !== day)
                                                });
                                            }}
                                        />
                                        {day.substring(0, 3)}
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSubmit}>Save Shift</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* View Modal */}
            <Dialog open={!!viewShift} onOpenChange={(open) => !open && setViewShift(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Shift Details</DialogTitle>
                    </DialogHeader>
                    {viewShift && (
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-3 gap-4 text-sm">
                                <div className="font-semibold text-muted-foreground">Shift Name:</div>
                                <div className="col-span-2">{viewShift.name}</div>
                                
                                <div className="font-semibold text-muted-foreground">Start Time:</div>
                                <div className="col-span-2">{viewShift.start_time}</div>
                                
                                <div className="font-semibold text-muted-foreground">End Time:</div>
                                <div className="col-span-2">{viewShift.end_time}</div>
                                
                                <div className="font-semibold text-muted-foreground">Grace Period:</div>
                                <div className="col-span-2">{viewShift.grace_period_minutes} minutes</div>
                                
                                <div className="font-semibold text-muted-foreground">Working Days:</div>
                                <div className="col-span-2">
                                    {viewShift.work_days ? viewShift.work_days.join(', ') : 'Monday, Tuesday, Wednesday, Thursday, Friday, Saturday'}
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setViewShift(null)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Modal */}
            <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-red-600 flex items-center gap-2">
                            <Trash2 className="h-5 w-5" />
                            Delete Shift
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <p className="text-sm text-muted-foreground">
                            Are you sure you want to delete this shift?
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={confirmDelete}>Delete Shift</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

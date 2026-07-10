import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import api from '@/services/api';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

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
    const [deleteId, setDeleteId] = useState<number | null>(null);
    
    const [formData, setFormData] = useState({
        id: null as number | null,
        name: '',
        start_time: '08:00',
        end_time: '17:00',
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

    useEffect(() => {
        fetchShifts();
    }, []);

    const handleSubmit = async () => {
        try {
            if (formData.id) {
                await api.put(`/shifts/${formData.id}`, formData);
                toast.success('Shift updated');
            } else {
                await api.post('/shifts', formData);
                toast.success('Shift created');
            }
            setIsDialogOpen(false);
            fetchShifts();
        } catch {
            toast.error('Failed to save shift');
        }
    };

    const confirmDelete = async () => {
        if (!deleteId) return;
        try {
            await api.delete(`/shifts/${deleteId}`);
            toast.success('Shift deleted');
            fetchShifts();
            setDeleteId(null);
        } catch {
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
        setFormData({ id: null, name: '', start_time: '08:00', end_time: '17:00', grace_period_minutes: 15, work_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] });
        setIsDialogOpen(true);
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Shift & Schedule Management</h1>
                <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> Add Shift</Button>
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
                                        <TableCell>{shift.work_days ? shift.work_days.map(d => d.substring(0, 3)).join(', ') : 'Mon, Tue, Wed, Thu, Fri'}</TableCell>
                                        <TableCell>{shift.grace_period_minutes}</TableCell>
                                        <TableCell className="text-right">
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
                                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
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


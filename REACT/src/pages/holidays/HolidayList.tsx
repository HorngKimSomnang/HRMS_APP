import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import api from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { Trash2, Plus, Calendar, PartyPopper } from "lucide-react";
import { toast } from 'sonner';

interface Holiday {
    id: number;
    name: string;
    start_date: string;
    end_date: string;
    type: 'public' | 'company';
    description?: string;
}

export default function HolidayList() {
    const { user } = useAuth();
    const isAdminOrSuper = user?.roles?.some((r: any) => r.name === 'Super Admin' || r.name === 'Admin') ?? false;
    const [holidays, setHolidays] = useState<Holiday[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);

    // Form State
    const [newName, setNewName] = useState('');
    const [newStartDate, setNewStartDate] = useState('');
    const [newEndDate, setNewEndDate] = useState('');
    const [newType, setNewType] = useState<'public' | 'company'>('public');

    const fetchHolidays = async () => {
        setLoading(true);
        try {
            // Holidays are stored as announcements with type 'Holiday'
            const res = await api.get('/announcements', { params: { type: 'Holiday' } });
            const raw = res.data.data || res.data || [];
            // Map announcement fields to holiday shape
            setHolidays(raw.map((a: any) => ({
                id: a.id,
                name: a.title,
                start_date: a.start_date || '',
                end_date: a.end_date || a.start_date || '',
                type: a.type === 'Holiday' ? 'public' : 'company',
                description: a.content,
            })));
        } catch (error) {
            console.error("Failed to fetch holidays", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHolidays();
    }, []);

    const handleCreate = async () => {
        try {
            await api.post('/announcements', {
                type: 'Holiday',
                title: newName,
                content: newName,
                start_date: newStartDate,
                end_date: newEndDate,
                is_published: true,
            });
            setNewName('');
            setNewStartDate('');
            setNewEndDate('');
            setIsCreateOpen(false);
            fetchHolidays();
            toast.success("Holiday created successfully");
        } catch (e: any) {
            toast.error(e.response?.data?.message || "Failed to create holiday");
        }
    };

    const confirmDelete = async () => {
        if (!deleteId) return;
        try {
            await api.delete(`/announcements/${deleteId}`);
            setHolidays(holidays.filter(h => h.id !== deleteId));
            setDeleteId(null);
            toast.success("Holiday deleted successfully");
        } catch (e: any) {
            toast.error(e.response?.data?.message || "Failed to delete holiday");
        }
    };

    // Calculate upcoming holiday for the highlight card
    const nextHoliday = holidays
        .filter(h => new Date(h.start_date) >= new Date())
        .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())[0];

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Holidays & Announcements</h1>
                    <p className="text-muted-foreground mt-1">Manage public holidays and company events.</p>
                </div>
                {isAdminOrSuper && (
                    <Button onClick={() => setIsCreateOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" /> Add Holiday
                    </Button>
                )}
                {!isAdminOrSuper && (
                    <span className="text-xs text-muted-foreground bg-gray-50 border border-gray-200 px-3 py-2 rounded-lg">
                        🔒 Holiday management is restricted to Admin & Super Admin
                    </span>
                )}
            </div>

            {/* Highlight Card for Next Holiday */}
            {nextHoliday && (
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-blue-100 text-sm font-medium mb-1">
                            <PartyPopper className="h-4 w-4" />
                            <span>Upcoming Holiday</span>
                        </div>
                        <h2 className="text-3xl font-bold">{nextHoliday.name}</h2>
                        <p className="text-blue-100 mt-1 flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {new Date(nextHoliday.start_date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                            {nextHoliday.end_date && nextHoliday.end_date !== nextHoliday.start_date && (
                                <> - {new Date(nextHoliday.end_date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</>
                            )}
                        </p>
                    </div>
                    <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg text-center min-w-[100px]">
                        <span className="block text-2xl font-bold">
                            {Math.ceil((new Date(nextHoliday.start_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))}
                        </span>
                        <span className="text-xs text-blue-100 uppercase font-medium">Days Left</span>
                    </div>
                </div>
            )}

            <div className="rounded-xl border border-sky-100 bg-gradient-to-br from-sky-50/50 via-card to-card shadow-sm overflow-hidden">
                <div className="p-6 border-b bg-muted/30">
                    <h3 className="font-semibold text-lg">All Holidays</h3>
                    <p className="text-sm text-muted-foreground">List of all registered holidays and events for this year.</p>
                </div>
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead className="pl-6">Date</TableHead>
                            <TableHead>Holiday Name</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead className="text-right pr-6">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={4} className="text-center h-32">Loading...</TableCell></TableRow>
                        ) : holidays.length === 0 ? (
                            <TableRow><TableCell colSpan={4} className="text-center h-32 text-muted-foreground">No holidays found.</TableCell></TableRow>
                        ) : (
                            holidays.map((holiday) => (
                                <TableRow key={holiday.id} className="hover:bg-muted/50">
                                    <TableCell className="font-medium pl-6">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                                                <Calendar className="h-4 w-4" />
                                            </div>
                                            <span className="text-base">
                                                {new Date(holiday.start_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                {holiday.end_date && holiday.end_date !== holiday.start_date && (
                                                    <> - {new Date(holiday.end_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</>
                                                )}
                                            </span>
                                            <span className="text-xs text-muted-foreground ml-1">
                                                {new Date(holiday.start_date).getFullYear()}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-base">{holiday.name}</TableCell>
                                    <TableCell>
                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide border ${holiday.type === 'public' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-purple-50 text-purple-700 border-purple-200'}`}>
                                            {holiday.type}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right pr-6">
                                        {isAdminOrSuper && (
                                            <Button size="icon" variant="ghost" className="text-muted-foreground hover:text-red-600 hover:bg-red-50" onClick={() => setDeleteId(holiday.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add New Holiday</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Name</label>
                            <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. New Year" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Start Date</label>
                            <Input type="date" value={newStartDate} onChange={e => setNewStartDate(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">End Date</label>
                            <Input type="date" value={newEndDate} onChange={e => setNewEndDate(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Type</label>
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={newType}
                                onChange={e => setNewType(e.target.value as any)}
                            >
                                <option value="public">Public Holiday</option>
                                <option value="company">Company Event</option>
                            </select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreate}>Save Holiday</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Modal */}
            <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-red-600 flex items-center gap-2">
                            <Trash2 className="h-5 w-5" />
                            Delete Holiday
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <p className="text-sm text-muted-foreground">
                            Are you sure you want to delete this holiday/announcement?
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={confirmDelete}>Delete Holiday</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

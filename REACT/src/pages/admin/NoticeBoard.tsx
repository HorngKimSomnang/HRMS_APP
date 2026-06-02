import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import api from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Notice {
    id: number;
    title: string;
    content: string;
    type: string;
    is_published: boolean;
    created_at: string;
    creator: { name: string };
}

export default function NoticeBoard() {
    const [notices, setNotices] = useState<Notice[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const { user } = useAuth();
    const isSuperAdmin = user?.roles?.some((role: any) => role.name === 'Super Admin');
    
    const [formData, setFormData] = useState({
        id: null as number | null,
        title: '',
        content: '',
        type: 'General',
        is_published: true,
    });

    const fetchNotices = async () => {
        try {
            const res = await api.get('/announcements');
            setNotices(res.data.data);
        } catch (error) {
            toast.error('Failed to fetch notices');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotices();
    }, []);

    const handleSubmit = async () => {
        try {
            if (formData.id) {
                await api.put(`/announcements/${formData.id}`, formData);
                toast.success('Notice updated');
            } else {
                await api.post('/announcements', formData);
                toast.success('Notice created');
            }
            setIsDialogOpen(false);
            fetchNotices();
        } catch (error: any) {
            const msg = error.response?.data?.message || 'Failed to save notice';
            const errors = error.response?.data?.errors ? JSON.stringify(error.response.data.errors) : '';
            toast.error(msg + (errors ? '\n' + errors : ''));
        }
    };

    const confirmDelete = async () => {
        if (!deleteId) return;
        try {
            await api.delete(`/announcements/${deleteId}`);
            toast.success('Notice deleted');
            fetchNotices();
            setDeleteId(null);
        } catch (error) {
            toast.error('Failed to delete notice');
        }
    };

    const handleApprove = async (id: number) => {
        try {
            await api.put(`/announcements/${id}`, { is_published: true });
            toast.success('Notice approved and published!');
            fetchNotices();
        } catch (error) {
            toast.error('Failed to approve notice');
        }
    };

    const openEdit = (notice: Notice) => {
        setFormData({
            id: notice.id,
            title: notice.title,
            content: notice.content,
            type: notice.type,
            is_published: notice.is_published,
        });
        setIsDialogOpen(true);
    };

    const openCreate = () => {
        setFormData({ id: null, title: '', content: '', type: 'General', is_published: true });
        setIsDialogOpen(true);
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Notice Board</h1>
                <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> Publish Notice</Button>
            </div>

            <div className="bg-card text-card-foreground rounded-xl border shadow-sm flex flex-col">
                <div className="p-6 pb-2">
                    <h3 className="text-lg font-semibold leading-none tracking-tight">All Announcements</h3>
                </div>
                <div className="p-6 pt-0">
                    {loading ? <p>Loading...</p> : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Title</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Author</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {notices.map(notice => (
                                    <TableRow key={notice.id}>
                                        <TableCell className="font-medium">{notice.title}</TableCell>
                                        <TableCell>
                                            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                                                {notice.type}
                                            </span>
                                        </TableCell>
                                        <TableCell>{notice.creator?.name}</TableCell>
                                        <TableCell>
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${notice.is_published ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                                                {notice.is_published ? 'Published' : 'Pending Approval'}
                                            </span>
                                        </TableCell>
                                        <TableCell>{new Date(notice.created_at).toLocaleDateString()}</TableCell>
                                        <TableCell className="text-right">
                                            {isSuperAdmin && !notice.is_published && (
                                                <Button variant="outline" size="sm" className="mr-2 h-8 text-green-600 border-green-200 bg-green-50 hover:bg-green-100" onClick={() => handleApprove(notice.id)}>
                                                    Approve
                                                </Button>
                                            )}
                                            {(!notice.creator || notice.creator.name !== 'Super Admin' || isSuperAdmin) && (
                                                <>
                                                    <Button variant="ghost" size="icon" onClick={() => openEdit(notice)}>
                                                        <Edit className="w-4 h-4 text-blue-500" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => setDeleteId(notice.id)}>
                                                        <Trash2 className="w-4 h-4 text-red-500" />
                                                    </Button>
                                                </>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {notices.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-4">No notices found.</TableCell>
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
                        <DialogTitle>{formData.id ? 'Edit' : 'Create'} Notice</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>Title</Label>
                            <Input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
                        </div>
                        <div className="grid gap-2">
                            <Label>Content</Label>
                            <textarea 
                                className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm md:text-sm"
                                value={formData.content} 
                                onChange={e => setFormData({ ...formData, content: e.target.value })} 
                            />
                        </div>
                        <div className="grid gap-2 transform">
                            <Label>Type</Label>
                            <select 
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={formData.type} 
                                onChange={e => setFormData({ ...formData, type: e.target.value })}
                            >
                                <option value="General">General</option>
                                <option value="Info">Info</option>
                                <option value="Urgent">Urgent</option>
                                <option value="Holiday">Holiday</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                            <input 
                                type="checkbox" 
                                id="is_published" 
                                checked={formData.is_published} 
                                onChange={e => setFormData({ ...formData, is_published: e.target.checked })} 
                            />
                            <Label htmlFor="is_published">Publish Immediately to Mobile App</Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSubmit}>Save Notice</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Modal */}
            <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-red-600 flex items-center gap-2">
                            <Trash2 className="h-5 w-5" />
                            Delete Notice
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <p className="text-sm text-muted-foreground">
                            Are you sure you want to delete this notice? This action cannot be undone.
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={confirmDelete}>Delete Notice</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}


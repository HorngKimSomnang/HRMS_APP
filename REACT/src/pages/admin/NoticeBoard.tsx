import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import api from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { Plus, Edit, Trash2, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';

interface Notice {
    id: number;
    title: string;
    content: string;
    type: string;
    is_published: boolean;
    created_at: string;
    creator: { name: string };
}

interface NoticeBoardProps {
    embedded?: boolean;
}

export default function NoticeBoard({ embedded = false }: NoticeBoardProps) {
    const [notices, setNotices] = useState<Notice[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [viewNotice, setViewNotice] = useState<Notice | null>(null);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const { user, hasPermission } = useAuth();
    const isSuperAdmin = user?.roles?.some((r: any) => r.is_super_admin);
    const canViewNotices = hasPermission('notice_board.view');
    const canCreateNotices = hasPermission('notice_board.create');
    const canEditNotices = hasPermission('notice_board.edit');
    const canDeleteNotices = hasPermission('notice_board.delete');
    
    // Fallback logic for legacy admin roles if no strict perms are setup
    const isAdmin = user?.roles?.some((role: any) => role.name === 'Admin' || role.name === 'Super Admin');
    const canManageNotices = Boolean(isSuperAdmin || isAdmin || canCreateNotices || canEditNotices || canDeleteNotices);
    
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
            // Holidays have their own dedicated page; keep them out of the general notice board.
            setNotices(res.data.data.filter((n: Notice) => n.type !== 'Holiday'));
        } catch {
            toast.error('Failed to fetch notices');
        } finally {
            setLoading(false);
        }
    };

    useLiveRefresh(
        () => canViewNotices ? fetchNotices() : Promise.resolve(),
        { resources: 'announcements' }
    );

    useEffect(() => {
        if (canViewNotices) {
            fetchNotices();
        } else {
            setLoading(false);
        }
    }, [canViewNotices]);

    const handleSubmit = async () => {
        const previousNotices = notices;
        const temporaryId = -Date.now();
        const existingNotice = notices.find(notice => notice.id === formData.id);
        const optimisticNotice: Notice = {
            ...formData,
            id: formData.id ?? temporaryId,
            created_at: existingNotice?.created_at ?? new Date().toISOString(),
            creator: existingNotice?.creator ?? { name: user?.name ?? 'Current administrator' },
        };

        setNotices(current => formData.id
            ? current.map(notice => notice.id === formData.id ? optimisticNotice : notice)
            : [optimisticNotice, ...current]
        );
        setIsDialogOpen(false);

        try {
            if (formData.id) {
                const response = await api.put(`/announcements/${formData.id}`, formData);
                setNotices(current => current.map(notice => notice.id === formData.id
                    ? { ...notice, ...response.data.data, creator: notice.creator }
                    : notice
                ));
                toast.success('Notice updated');
            } else {
                const response = await api.post('/announcements', formData);
                setNotices(current => current.map(notice => notice.id === temporaryId
                    ? { ...notice, ...response.data.data, creator: notice.creator }
                    : notice
                ));
                toast.success('Notice created');
            }
        } catch (error: any) {
            setNotices(previousNotices);
            setIsDialogOpen(true);
            const msg = error.response?.data?.message || 'Failed to save notice';
            const errors = error.response?.data?.errors ? JSON.stringify(error.response.data.errors) : '';
            toast.error(msg + (errors ? '\n' + errors : ''));
        }
    };

    const confirmDelete = async () => {
        if (!deleteId) return;
        const id = deleteId;
        const previousNotices = notices;
        setNotices(current => current.filter(notice => notice.id !== id));
        setDeleteId(null);

        try {
            await api.delete(`/announcements/${id}`);
            toast.success('Notice deleted');
        } catch {
            setNotices(previousNotices);
            toast.error('Failed to delete notice');
        }
    };

    const handleApprove = async (id: number) => {
        const previousNotices = notices;
        setNotices(current => current.map(notice => (
            notice.id === id ? { ...notice, is_published: true } : notice
        )));

        try {
            await api.put(`/announcements/${id}`, { is_published: true });
            toast.success('Notice approved and published!');
        } catch {
            setNotices(previousNotices);
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

    if (!canViewNotices && !canManageNotices) return null;

    return (
        <div className={embedded ? "pt-2" : "p-6"}>
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 p-8 text-white shadow-xl mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="relative z-10">
                    <h1 className="text-3xl font-bold font-poppins">Notice Board</h1>
                    <p className="text-amber-100 mt-2 text-sm font-medium">Manage and view system-wide announcements</p>
                </div>
                {(canCreateNotices || isAdmin) && (
                    <div className="relative z-10">
                        <Button onClick={openCreate} className="bg-white/20 hover:bg-white/30 text-white border-white/50 backdrop-blur-sm">
                            <Plus className="w-4 h-4 mr-2" /> Publish Notice
                        </Button>
                    </div>
                )}
                <div className="absolute top-0 right-0 -mt-10 -mr-10 h-40 w-40 rounded-full bg-white/10 blur-3xl"></div>
                <div className="absolute bottom-0 right-20 -mb-10 h-32 w-32 rounded-full bg-white/10 blur-2xl"></div>
            </div>

            <div className="bg-gradient-to-br from-amber-50/50 via-card to-card text-card-foreground rounded-xl border border-amber-100 shadow-sm flex flex-col">
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
                                                    <Button variant="ghost" size="icon" onClick={() => setViewNotice(notice)}>
                                                        <Eye className="w-4 h-4 text-slate-500" />
                                                    </Button>
                                                    {(canEditNotices || isAdmin) && (
                                                        <Button variant="ghost" size="icon" onClick={() => openEdit(notice)} title="Edit Notice">
                                                            <Edit className="w-4 h-4 text-blue-500" />
                                                        </Button>
                                                    )}
                                                    {(canDeleteNotices || isAdmin) && (
                                                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(notice.id)} title="Delete Notice">
                                                            <Trash2 className="w-4 h-4 text-red-500" />
                                                        </Button>
                                                    )}
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

            {/* View Notice Modal */}
            <Dialog open={!!viewNotice} onOpenChange={(open) => !open && setViewNotice(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{viewNotice?.title}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                            <span className="font-semibold text-foreground">Author:</span> {viewNotice?.creator?.name}
                            <span className="mx-2">•</span>
                            <span className="font-semibold text-foreground">Type:</span> {viewNotice?.type}
                            <span className="mx-2">•</span>
                            <span className="font-semibold text-foreground">Date:</span> {viewNotice ? new Date(viewNotice.created_at).toLocaleDateString() : ''}
                        </div>
                        <div className="bg-muted p-4 rounded-md whitespace-pre-wrap text-sm">
                            {viewNotice?.content}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setViewNotice(null)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

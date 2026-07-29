import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import api from '@/services/api';
import { getStorageUrl } from '@/core/config';
import { entityAccent } from '@/core/entityColors';
import { Plus, Edit, Trash2, ArrowLeft, Upload, Paperclip, MessageSquare, MessageSquareText, Table2 } from 'lucide-react';
import { toast } from 'sonner';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';

interface EntityField {
    id: number;
    key: string;
    label: string;
    type: 'text' | 'number' | 'date' | 'boolean' | 'dropdown' | 'textarea' | 'file';
    options: string[] | null;
    is_required: boolean;
}

interface EntityDetail {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    allow_employee_submissions: boolean;
    fields: EntityField[];
}

interface EntityRecord {
    id: number;
    data: Record<string, any>;
    creator?: { id: number; name: string } | null;
    admin_reply?: { message: string; replied_by: string; replied_at: string } | null;
}

const renderValue = (field: EntityField, value: any): string => {
    if (value === null || value === undefined || value === '') return '—';
    if (field.type === 'boolean') return value ? 'Yes' : 'No';
    if (field.type === 'date') {
        const d = new Date(value);
        return isNaN(d.getTime()) ? String(value) : d.toLocaleDateString();
    }
    return String(value);
};

function FileFieldCell({ slug, record, field, onUploaded }: { slug: string; record: EntityRecord; field: EntityField; onUploaded: () => void }) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const value = record.data[field.key] as { name: string; path: string } | undefined;

    const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            await api.post(`/entities/${slug}/records/${record.id}/files/${field.key}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            toast.success('File uploaded');
            onUploaded();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to upload file');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="flex items-center gap-2">
            <input ref={inputRef} type="file" className="hidden" onChange={handleFileSelected} />
            {value?.path ? (
                <>
                    <a
                        href={getStorageUrl(value.path)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-blue-600 hover:underline text-sm truncate max-w-[140px]"
                    >
                        <Paperclip className="w-3.5 h-3.5 flex-shrink-0" /> {value.name}
                    </a>
                    <button
                        type="button"
                        onClick={() => inputRef.current?.click()}
                        disabled={uploading}
                        className="text-xs text-muted-foreground hover:text-primary disabled:opacity-50"
                    >
                        {uploading ? '...' : 'Replace'}
                    </button>
                </>
            ) : (
                <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
                    <Upload className="w-3.5 h-3.5 mr-1" /> {uploading ? 'Uploading...' : 'Upload'}
                </Button>
            )}
        </div>
    );
}

interface EntityRecordsPanelProps {
    slug: string;
    /** Called after a record/entity change that a parent list might want to reflect (e.g. records_count). */
    onRecordsChanged?: () => void;
    /** Called if the initial load fails — lets the host decide what "leaving" means (navigate away, close modal, etc). */
    onLoadError?: () => void;
}

export function EntityRecordsPanel({ slug, onRecordsChanged, onLoadError }: EntityRecordsPanelProps) {
    const onLoadErrorRef = useRef(onLoadError);
    onLoadErrorRef.current = onLoadError;

    const [entity, setEntity] = useState<EntityDetail | null>(null);
    const [records, setRecords] = useState<EntityRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState<{ id: number | null; data: Record<string, any> }>({ id: null, data: {} });
    const [pendingFiles, setPendingFiles] = useState<Record<string, File>>({});
    const [replyRecord, setReplyRecord] = useState<EntityRecord | null>(null);
    const [replyText, setReplyText] = useState('');
    const [sendingReply, setSendingReply] = useState(false);

    const fetchAll = useCallback(async () => {
        try {
            const [entityRes, recordsRes] = await Promise.all([
                api.get(`/entities/${slug}`),
                api.get(`/entities/${slug}/records`),
            ]);
            setEntity(entityRes.data.data);
            setRecords(recordsRes.data.data.data || []);
        } catch {
            toast.error('Failed to load entity');
            onLoadErrorRef.current?.();
        } finally {
            setLoading(false);
        }
    }, [slug]);

    useLiveRefresh(fetchAll, { resources: 'entities' });

    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    const openCreate = () => {
        setFormData({ id: null, data: {} });
        setPendingFiles({});
        setIsDialogOpen(true);
    };

    const openEdit = (record: EntityRecord) => {
        setFormData({ id: record.id, data: { ...record.data } });
        setPendingFiles({});
        setIsDialogOpen(true);
    };

    const updateField = (key: string, value: any) => {
        setFormData(prev => ({ ...prev, data: { ...prev.data, [key]: value } }));
    };

    const handleSubmit = async () => {
        setSaving(true);
        try {
            let recordId = formData.id;
            if (formData.id) {
                await api.put(`/entities/${slug}/records/${formData.id}`, { data: formData.data });
            } else {
                const res = await api.post(`/entities/${slug}/records`, { data: formData.data });
                recordId = res.data.data.id;
            }

            for (const [fieldKey, file] of Object.entries(pendingFiles)) {
                const fileForm = new FormData();
                fileForm.append('file', file);
                await api.post(`/entities/${slug}/records/${recordId}/files/${fieldKey}`, fileForm, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
            }

            toast.success(formData.id ? 'Record updated' : 'Record created');
            setIsDialogOpen(false);
            fetchAll();
            onRecordsChanged?.();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to save record');
        } finally {
            setSaving(false);
        }
    };

    const openReply = (record: EntityRecord) => {
        setReplyRecord(record);
        setReplyText(record.admin_reply?.message ?? '');
    };

    const sendReply = async () => {
        if (!replyRecord || !replyText.trim()) return;
        setSendingReply(true);
        try {
            await api.put(`/entities/${slug}/records/${replyRecord.id}/reply`, { message: replyText.trim() });
            toast.success('Reply sent');
            setReplyRecord(null);
            fetchAll();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to send reply');
        } finally {
            setSendingReply(false);
        }
    };

    const confirmDelete = async () => {
        if (!deleteId) return;
        try {
            await api.delete(`/entities/${slug}/records/${deleteId}`);
            toast.success('Record deleted');
            fetchAll();
            onRecordsChanged?.();
            setDeleteId(null);
        } catch {
            toast.error('Failed to delete record');
        }
    };

    if (loading) {
        return <div className="py-8 text-center text-sm text-muted-foreground">Loading...</div>;
    }

    if (!entity) {
        return null;
    }

    const accent = entityAccent(entity.id);

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-xl border flex items-center justify-center flex-shrink-0 ${accent.bg} ${accent.border}`}>
                        <Table2 className={`h-5 w-5 ${accent.text}`} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">{entity.name}</h1>
                        {entity.description && <p className="text-muted-foreground mt-0.5 text-sm">{entity.description}</p>}
                    </div>
                </div>
                <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> Add Record</Button>
            </div>

            <div className="bg-card text-card-foreground rounded-xl border shadow-sm flex flex-col">
                <div className="p-6 pt-4 overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                {entity.fields.map(field => (
                                    <TableHead key={field.key}>{field.label}</TableHead>
                                ))}
                                {entity.allow_employee_submissions && <TableHead>Submitted By</TableHead>}
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {records.map(record => (
                                <TableRow key={record.id}>
                                    {entity.fields.map(field => (
                                        <TableCell key={field.key}>
                                            {field.type === 'file'
                                                ? <FileFieldCell slug={slug} record={record} field={field} onUploaded={fetchAll} />
                                                : renderValue(field, record.data[field.key])}
                                        </TableCell>
                                    ))}
                                    {entity.allow_employee_submissions && (
                                        <TableCell>{record.creator?.name ?? '—'}</TableCell>
                                    )}
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => openReply(record)} title={record.admin_reply ? 'Edit reply' : 'Reply'}>
                                            {record.admin_reply
                                                ? <MessageSquareText className="w-4 h-4 text-emerald-600" />
                                                : <MessageSquare className="w-4 h-4 text-muted-foreground" />}
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => openEdit(record)}>
                                            <Edit className="w-4 h-4 text-blue-500" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(record.id)}>
                                            <Trash2 className="w-4 h-4 text-red-500" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {records.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={entity.fields.length + (entity.allow_employee_submissions ? 2 : 1)} className="text-center py-4">No records yet.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{formData.id ? 'Edit' : 'Add'} Record</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        {entity.fields.map(field => (
                            <div className="grid gap-2" key={field.key}>
                                <Label>{field.label}{field.is_required && <span className="text-red-500"> *</span>}</Label>
                                {field.type === 'text' && (
                                    <Input value={formData.data[field.key] ?? ''} onChange={e => updateField(field.key, e.target.value)} />
                                )}
                                {field.type === 'number' && (
                                    <Input type="number" value={formData.data[field.key] ?? ''} onChange={e => updateField(field.key, e.target.value)} />
                                )}
                                {field.type === 'date' && (
                                    <Input type="date" value={formData.data[field.key] ?? ''} onChange={e => updateField(field.key, e.target.value)} />
                                )}
                                {field.type === 'textarea' && (
                                    <textarea
                                        className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                        value={formData.data[field.key] ?? ''}
                                        onChange={e => updateField(field.key, e.target.value)}
                                    />
                                )}
                                {field.type === 'boolean' && (
                                    <label className="flex items-center gap-2 text-sm cursor-pointer w-fit">
                                        <input
                                            type="checkbox"
                                            checked={!!formData.data[field.key]}
                                            onChange={e => updateField(field.key, e.target.checked)}
                                        />
                                        Yes
                                    </label>
                                )}
                                {field.type === 'dropdown' && (
                                    <select
                                        className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                        value={formData.data[field.key] ?? ''}
                                        onChange={e => updateField(field.key, e.target.value)}
                                    >
                                        <option value="">— Select —</option>
                                        {(field.options || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                )}
                                {field.type === 'file' && (
                                    <div className="space-y-1.5">
                                        {formData.data[field.key]?.path && !pendingFiles[field.key] && (
                                            <a
                                                href={getStorageUrl(formData.data[field.key].path)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 text-blue-600 hover:underline text-sm truncate max-w-[220px]"
                                            >
                                                <Paperclip className="w-3.5 h-3.5 flex-shrink-0" /> {formData.data[field.key].name}
                                            </a>
                                        )}
                                        <Input
                                            type="file"
                                            className="text-sm"
                                            onChange={e => {
                                                const file = e.target.files?.[0];
                                                if (file) setPendingFiles(prev => ({ ...prev, [field.key]: file }));
                                            }}
                                        />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSubmit} disabled={saving}>{saving ? 'Saving...' : 'Save Record'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-red-600 flex items-center gap-2">
                            <Trash2 className="h-5 w-5" />
                            Delete Record
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <p className="text-sm text-muted-foreground">Are you sure you want to delete this record?</p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={confirmDelete}>Delete Record</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!replyRecord} onOpenChange={(open) => !open && setReplyRecord(null)}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <MessageSquare className="h-5 w-5 text-emerald-600" />
                            {replyRecord?.admin_reply ? 'Edit Reply' : 'Reply to Submission'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-3 py-2">
                        {replyRecord?.admin_reply && (
                            <p className="text-xs text-muted-foreground">
                                Last replied by {replyRecord.admin_reply.replied_by} on{' '}
                                {new Date(replyRecord.admin_reply.replied_at).toLocaleString()}
                            </p>
                        )}
                        <textarea
                            className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            placeholder="Write a reply the employee will see on their submission..."
                            value={replyText}
                            onChange={e => setReplyText(e.target.value)}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setReplyRecord(null)}>Cancel</Button>
                        <Button onClick={sendReply} disabled={sendingReply || !replyText.trim()}>{sendingReply ? 'Sending...' : 'Send Reply'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default function EntityRecords() {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();

    if (!slug) return null;

    return (
        <div className="p-6">
            <div className="mb-4">
                <Link to="/entities" className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 w-fit">
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to Custom Entities
                </Link>
            </div>
            <EntityRecordsPanel slug={slug} onLoadError={() => navigate('/entities')} />
        </div>
    );
}

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import api from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { EntityRecordsPanel } from './EntityRecords';
import { entityAccent } from '@/core/entityColors';
import { Plus, Edit, Trash2, ArrowRight, Database, Table2, Layers, Rows3, Users, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';

const FIELD_TYPES = ['text', 'number', 'date', 'boolean', 'dropdown', 'textarea', 'file'] as const;
type FieldType = typeof FIELD_TYPES[number];

const FIELD_TYPE_LABELS: Record<FieldType, string> = {
    text: 'Text',
    number: 'Number',
    date: 'Date',
    boolean: 'Yes / No',
    dropdown: 'Dropdown',
    textarea: 'Long Text',
    file: 'File Attachment',
};

interface EntityFieldForm {
    id?: number;
    label: string;
    type: FieldType;
    is_required: boolean;
    optionsText: string; // raw comma-separated input, only used when type === 'dropdown'
}

interface CustomEntity {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    fields_count: number;
    records_count: number;
    allow_employee_submissions: boolean;
}

const blankField = (): EntityFieldForm => ({ label: '', type: 'text', is_required: false, optionsText: '' });

export default function EntityList() {
    const { user } = useAuth();
    const isSuperAdmin = user?.roles?.some((r: any) => r.name === 'Super Admin') ?? false;
    const [entities, setEntities] = useState<CustomEntity[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [saving, setSaving] = useState(false);
    const [managingSlug, setManagingSlug] = useState<string | null>(null);

    const [formData, setFormData] = useState<{ id: number | null; slug: string; name: string; description: string; allow_employee_submissions: boolean; fields: EntityFieldForm[] }>({
        id: null,
        slug: '',
        name: '',
        description: '',
        allow_employee_submissions: false,
        fields: [blankField()],
    });

    const fetchEntities = async () => {
        try {
            const res = await api.get('/entities');
            setEntities(res.data.data);
        } catch {
            toast.error('Failed to fetch custom entities');
        } finally {
            setLoading(false);
        }
    };

    useLiveRefresh(fetchEntities, { resources: 'entities' });

    useEffect(() => {
        fetchEntities();
    }, []);

    const openCreate = () => {
        setFormData({ id: null, slug: '', name: '', description: '', allow_employee_submissions: false, fields: [blankField()] });
        setIsDialogOpen(true);
    };

    const openEdit = async (entity: CustomEntity) => {
        try {
            const res = await api.get(`/entities/${entity.slug}`);
            const fields = (res.data.data.fields || []).map((f: any) => ({
                id: f.id,
                label: f.label,
                type: f.type,
                is_required: f.is_required,
                optionsText: (f.options || []).join(', '),
            }));
            setFormData({
                id: entity.id,
                slug: entity.slug,
                name: res.data.data.name,
                description: res.data.data.description || '',
                allow_employee_submissions: !!res.data.data.allow_employee_submissions,
                fields: fields.length > 0 ? fields : [blankField()],
            });
            setIsDialogOpen(true);
        } catch {
            toast.error('Failed to load entity details');
        }
    };

    const updateField = (index: number, patch: Partial<EntityFieldForm>) => {
        setFormData(prev => ({
            ...prev,
            fields: prev.fields.map((f, i) => (i === index ? { ...f, ...patch } : f)),
        }));
    };

    const addField = () => {
        setFormData(prev => ({ ...prev, fields: [...prev.fields, blankField()] }));
    };

    const removeField = (index: number) => {
        setFormData(prev => ({ ...prev, fields: prev.fields.filter((_, i) => i !== index) }));
    };

    const validateBeforeSubmit = (): string | null => {
        if (!formData.name.trim()) return 'Please enter a name for this entity.';
        if (formData.fields.length === 0) return 'Add at least one field.';
        for (const f of formData.fields) {
            if (!f.label.trim()) return 'Every field needs a label.';
            if (f.type === 'dropdown' && !f.optionsText.trim()) return `Field "${f.label}" needs at least one dropdown option.`;
        }
        return null;
    };

    const handleSubmit = async () => {
        const validationError = validateBeforeSubmit();
        if (validationError) {
            toast.error(validationError);
            return;
        }

        const payload = {
            name: formData.name,
            description: formData.description || null,
            allow_employee_submissions: formData.allow_employee_submissions,
            fields: formData.fields.map(f => ({
                id: f.id,
                label: f.label,
                type: f.type,
                is_required: f.is_required,
                options: f.type === 'dropdown'
                    ? f.optionsText.split(',').map(s => s.trim()).filter(Boolean)
                    : undefined,
            })),
        };

        setSaving(true);
        try {
            if (formData.id) {
                await api.put(`/entities/${formData.slug}`, payload);
                toast.success('Entity updated');
            } else {
                await api.post('/entities', payload);
                toast.success('Entity created');
            }
            setIsDialogOpen(false);
            fetchEntities();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to save entity');
        } finally {
            setSaving(false);
        }
    };

    const confirmDelete = async () => {
        if (!deleteId) return;
        const entity = entities.find(e => e.id === deleteId);
        if (!entity) return;
        try {
            await api.delete(`/entities/${entity.slug}`);
            toast.success('Entity deleted');
            fetchEntities();
            setDeleteId(null);
        } catch {
            toast.error('Failed to delete entity');
        }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center shadow-sm shadow-primary/20 flex-shrink-0">
                        <Database className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Custom Entities</h1>
                        <p className="text-muted-foreground mt-0.5 text-sm">
                            {isSuperAdmin ? 'Define your own data collections and fields — no code required.' : 'Manage records for your organization\'s data collections.'}
                        </p>
                    </div>
                </div>
                {isSuperAdmin && <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> New Entity</Button>}
            </div>

            <div className="bg-card text-card-foreground rounded-xl border shadow-sm flex flex-col">
                <div className="p-6 pb-2 flex items-center justify-between">
                    <h3 className="text-lg font-semibold leading-none tracking-tight">Your Entities</h3>
                    {!loading && (
                        <span className="text-xs font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                            {entities.length} total
                        </span>
                    )}
                </div>
                <div className="p-6 pt-0">
                    {loading ? <p>Loading...</p> : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Fields</TableHead>
                                    <TableHead>Records</TableHead>
                                    <TableHead>Visibility</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {entities.map(entity => {
                                    const accent = entityAccent(entity.id);
                                    return (
                                    <TableRow key={entity.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2.5">
                                                <div className={`h-8 w-8 rounded-lg border flex items-center justify-center flex-shrink-0 ${accent.bg} ${accent.border}`}>
                                                    <Table2 className={`h-4 w-4 ${accent.text}`} />
                                                </div>
                                                {entity.name}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">{entity.description || '—'}</TableCell>
                                        <TableCell>
                                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">
                                                <Layers className="h-3 w-3" /> {entity.fields_count}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">
                                                <Rows3 className="h-3 w-3" /> {entity.records_count}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            {entity.allow_employee_submissions ? (
                                                <span className="inline-flex items-center gap-1.5 text-blue-700 bg-blue-50 border border-blue-200/60 px-3 py-1 rounded-full text-xs font-semibold">
                                                    <Users className="h-3.5 w-3.5" /> Employee-submittable
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 text-slate-600 bg-slate-100 border border-slate-200/60 px-3 py-1 rounded-full text-xs font-semibold">
                                                    <ShieldCheck className="h-3.5 w-3.5" /> Admin only
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" onClick={() => setManagingSlug(entity.slug)}>
                                                Manage Records <ArrowRight className="w-3.5 h-3.5 ml-1" />
                                            </Button>
                                            {isSuperAdmin && (
                                                <>
                                                    <Button variant="ghost" size="icon" onClick={() => openEdit(entity)}>
                                                        <Edit className="w-4 h-4 text-blue-500" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => setDeleteId(entity.id)}>
                                                        <Trash2 className="w-4 h-4 text-red-500" />
                                                    </Button>
                                                </>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                    );
                                })}
                                {entities.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-4">No custom entities created yet.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </div>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{formData.id ? 'Edit' : 'Create'} Entity</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>Name</Label>
                            <Input placeholder="e.g. Company Vehicles" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                        </div>
                        <div className="grid gap-2">
                            <Label>Description (optional)</Label>
                            <textarea
                                className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                placeholder="What is this collection for?"
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>

                        <label className="flex items-center gap-2 text-sm cursor-pointer w-fit">
                            <input
                                type="checkbox"
                                checked={formData.allow_employee_submissions}
                                onChange={e => setFormData({ ...formData, allow_employee_submissions: e.target.checked })}
                            />
                            Allow employees to submit their own records
                        </label>

                        <div className="grid gap-2">
                            <div className="flex items-center justify-between">
                                <Label>Fields</Label>
                                <Button type="button" variant="outline" size="sm" onClick={addField}>
                                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Field
                                </Button>
                            </div>
                            <div className="space-y-3">
                                {formData.fields.map((field, index) => (
                                    <div key={index} className="border rounded-lg p-3 space-y-2">
                                        <div className="flex gap-2 items-start">
                                            <div className="flex-1">
                                                <Input
                                                    placeholder="Field label, e.g. Plate Number"
                                                    value={field.label}
                                                    onChange={e => updateField(index, { label: e.target.value })}
                                                />
                                            </div>
                                            <select
                                                className="flex h-10 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                                value={field.type}
                                                onChange={e => updateField(index, { type: e.target.value as FieldType })}
                                            >
                                                {FIELD_TYPES.map(t => <option key={t} value={t}>{FIELD_TYPE_LABELS[t]}</option>)}
                                            </select>
                                            <Button type="button" variant="ghost" size="icon" onClick={() => removeField(index)} disabled={formData.fields.length === 1}>
                                                <Trash2 className="w-4 h-4 text-red-500" />
                                            </Button>
                                        </div>
                                        {field.type === 'dropdown' && (
                                            <Input
                                                placeholder="Options, comma-separated (e.g. HR, Finance, Ops)"
                                                value={field.optionsText}
                                                onChange={e => updateField(index, { optionsText: e.target.value })}
                                            />
                                        )}
                                        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer w-fit">
                                            <input
                                                type="checkbox"
                                                checked={field.is_required}
                                                onChange={e => updateField(index, { is_required: e.target.checked })}
                                            />
                                            Required
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSubmit} disabled={saving}>{saving ? 'Saving...' : 'Save Entity'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-red-600 flex items-center gap-2">
                            <Trash2 className="h-5 w-5" />
                            Delete Entity
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <p className="text-sm text-muted-foreground">
                            Are you sure you want to delete this entity? All of its records will also be removed.
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={confirmDelete}>Delete Entity</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!managingSlug} onOpenChange={(open) => !open && setManagingSlug(null)}>
                <DialogContent className="sm:max-w-[1100px] max-h-[90vh] overflow-y-auto">
                    <DialogTitle className="sr-only">Manage records{managingSlug ? ` — ${managingSlug}` : ''}</DialogTitle>
                    {managingSlug && (
                        <EntityRecordsPanel
                            slug={managingSlug}
                            onRecordsChanged={fetchEntities}
                            onLoadError={() => setManagingSlug(null)}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

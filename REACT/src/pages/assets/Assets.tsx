import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/Label";
import { Input } from "@/components/ui/Input";
import api from "@/services/api";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Package, Plus, Trash2, Search, UserCheck, Undo2, History, Laptop, Smartphone, Car, Armchair, Wrench, Box, Eye, Pencil } from "lucide-react";
import { useLiveRefresh } from "@/hooks/useLiveRefresh";
import { useAuth } from "@/context/AuthContext";

const statusBadge: Record<string, string> = {
    available: "bg-green-100 text-green-700",
    assigned: "bg-blue-100 text-blue-700",
    maintenance: "bg-orange-100 text-orange-700",
    retired: "bg-slate-100 text-slate-500",
};

const conditionBadge: Record<string, string> = {
    new: "bg-emerald-100 text-emerald-700",
    good: "bg-sky-100 text-sky-700",
    fair: "bg-amber-100 text-amber-700",
    poor: "bg-red-100 text-red-700",
};

const CATEGORIES = ["laptop", "phone", "vehicle", "furniture", "equipment", "other"] as const;

const categoryIcon: Record<string, any> = {
    laptop: Laptop, phone: Smartphone, vehicle: Car, furniture: Armchair, equipment: Wrench, other: Box,
};

const emptyAsset = { name: '', code: '', category: 'laptop', serial_no: '', purchase_date: '', purchase_cost: '', condition: 'good', notes: '' };

export default function Assets() {
    const { t } = useTranslation();
    const { hasPermission } = useAuth();
    const [assets, setAssets] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');

    const [assetForm, setAssetForm] = useState<any | null>(null);
    const [assignForm, setAssignForm] = useState<any | null>(null);   // { asset, employee_id, assigned_at, notes }
    const [returnForm, setReturnForm] = useState<any | null>(null);   // { asset, returned_condition, notes }
    const [historyFor, setHistoryFor] = useState<any | null>(null);   // { asset, rows }
    const [viewAsset, setViewAsset] = useState<any | null>(null);

    useEffect(() => {
        api.get('/employees?status=active&all=true')
            .then(res => setEmployees(res.data.data ?? res.data ?? []))
            .catch(() => toast.error("Failed to load employees"));
    }, []);

    const load = useCallback(async () => {
        try {
            const res = await api.get('/assets', { params: { search: search || undefined, status: statusFilter || undefined, category: categoryFilter || undefined } });
            setAssets(res.data.data ?? []);
            setStats(res.data.stats ?? null);
        } catch {
            toast.error("Failed to load assets");
        } finally {
            setLoading(false);
        }
    }, [search, statusFilter, categoryFilter]);

    useLiveRefresh(async () => {
        await load();
        const res = await api.get('/employees?status=active&all=true');
        setEmployees(res.data.data ?? res.data ?? []);
    }, { resources: ['assets', 'employees'] });

    useEffect(() => {
        const timer = setTimeout(load, search ? 300 : 0); // debounce typing
        return () => clearTimeout(timer);
    }, [load, search]);

    // ---------- actions ----------
    const saveAsset = async () => {
        const previousAssets = assets;
        const temporaryId = -Date.now();
        const formSnapshot = assetForm;
        const payload = { ...formSnapshot, purchase_cost: formSnapshot.purchase_cost === '' ? null : formSnapshot.purchase_cost, purchase_date: formSnapshot.purchase_date || null };
        const optimisticAsset = {
            ...payload,
            id: formSnapshot.id ?? temporaryId,
            status: formSnapshot.status ?? 'available',
        };

        setAssets(current => formSnapshot.id
            ? current.map(asset => asset.id === formSnapshot.id ? { ...asset, ...optimisticAsset } : asset)
            : [...current, optimisticAsset]
        );
        setAssetForm(null);

        try {
            if (formSnapshot.id) {
                const response = await api.put(`/assets/${formSnapshot.id}`, payload);
                setAssets(current => current.map(asset => (
                    asset.id === formSnapshot.id ? response.data.data : asset
                )));
            } else {
                const response = await api.post('/assets', payload);
                setAssets(current => current.map(asset => (
                    asset.id === temporaryId ? response.data.data : asset
                )));
            }
        } catch (err: any) {
            setAssets(previousAssets);
            setAssetForm(formSnapshot);
            toast.error(err.response?.data?.message || "Failed to save asset");
        }
    };

    const deleteAsset = async (asset: any) => {
        if (!window.confirm(t('assets.confirm_delete', 'Delete this asset?'))) return;
        const previousAssets = assets;
        setAssets(current => current.filter(item => item.id !== asset.id));

        try {
            await api.delete(`/assets/${asset.id}`);
        } catch (err: any) {
            setAssets(previousAssets);
            toast.error(err.response?.data?.message || "Failed to delete");
        }
    };

    const submitAssign = async () => {
        try {
            await api.post(`/assets/${assignForm.asset.id}/assign`, {
                employee_id: assignForm.employee_id,
                assigned_at: assignForm.assigned_at || undefined,
                notes: assignForm.notes || undefined,
            });
            setAssignForm(null);
            load();
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Failed to assign");
        }
    };

    const submitReturn = async () => {
        try {
            await api.post(`/assets/${returnForm.asset.id}/return`, {
                returned_condition: returnForm.returned_condition || undefined,
                notes: returnForm.notes || undefined,
            });
            setReturnForm(null);
            load();
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Failed to return");
        }
    };

    const openHistory = async (asset: any) => {
        try {
            const res = await api.get(`/assets/${asset.id}/history`);
            setHistoryFor({ asset, rows: res.data.data ?? [] });
        } catch { toast.error("Failed to load history"); }
    };

    const money = (v: any) => v == null ? '—' : `$${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

    return (
        <div className="space-y-5">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-stone-600 via-neutral-600 to-gray-600 p-8 text-white shadow-xl mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="relative z-10">
                    <h1 className="text-3xl font-bold font-poppins">{t('assets.title', 'Asset Directory')}</h1>
                    <p className="text-stone-200 mt-2 text-sm font-medium">{t('assets.subtitle', 'Manage company properties and assignments.')}</p>
                </div>
                <div className="relative z-10">
                    {hasPermission('assets.create') && (
                        <Button onClick={() => setAssetForm({ ...emptyAsset })} className="bg-white/20 hover:bg-white/30 text-white border-white/50 backdrop-blur-sm">
                            <Plus className="mr-2 h-4 w-4" /> {t('assets.new_asset', 'New Asset')}
                        </Button>
                    )}
                </div>
                {/* Decorative Pattern */}
                <div className="absolute top-0 right-0 -mt-10 -mr-10 h-40 w-40 rounded-full bg-white/10 blur-3xl"></div>
                <div className="absolute bottom-0 right-20 -mb-10 h-32 w-32 rounded-full bg-white/10 blur-2xl"></div>
            </div>

            {/* Summary strip */}
            {stats && (
                <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                    <div className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/60 via-card to-card p-4 px-5 shadow-sm">
                        <p className="text-sm font-medium text-muted-foreground">{t('assets.total', 'Total assets')}</p>
                        <h3 className="text-2xl font-bold mt-1">{stats.total}</h3>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{t('assets.total_value', 'Value')}: {money(stats.total_value)}</p>
                    </div>
                    <div className="rounded-xl border border-green-100 bg-gradient-to-br from-green-50/60 via-card to-card p-4 px-5 shadow-sm">
                        <p className="text-sm font-medium text-muted-foreground">{t('assets.available', 'Available')}</p>
                        <h3 className="text-2xl font-bold mt-1 text-green-600">{stats.available}</h3>
                    </div>
                    <div className="rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50/60 via-card to-card p-4 px-5 shadow-sm">
                        <p className="text-sm font-medium text-muted-foreground">{t('assets.assigned', 'Assigned')}</p>
                        <h3 className="text-2xl font-bold mt-1 text-blue-600">{stats.assigned}</h3>
                    </div>
                    <div className="rounded-xl border border-orange-100 bg-gradient-to-br from-orange-50/60 via-card to-card p-4 px-5 shadow-sm">
                        <p className="text-sm font-medium text-muted-foreground">{t('assets.maintenance', 'In maintenance')}</p>
                        <h3 className="text-2xl font-bold mt-1 text-orange-600">{stats.maintenance}</h3>
                    </div>
                </div>
            )}

            {/* Filters + table */}
            <div className="rounded-xl border bg-card shadow-sm">
                <div className="flex flex-wrap items-center gap-3 p-4 border-b">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input className="pl-9" placeholder={t('assets.search_ph', 'Search name, code, serial...')} value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    <select className="rounded-md border px-3 py-2 text-sm bg-background" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                        <option value="">{t('assets.all_statuses', 'All statuses')}</option>
                        {Object.keys(statusBadge).map(s => <option key={s} value={s}>{t(`assets.status_${s}`, s)}</option>)}
                    </select>
                    <select className="rounded-md border px-3 py-2 text-sm bg-background" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
                        <option value="">{t('assets.all_categories', 'All categories')}</option>
                        {CATEGORIES.map(c => <option key={c} value={c}>{t(`assets.cat_${c}`, c)}</option>)}
                    </select>
                </div>

                {loading ? (
                    <div className="p-10 text-center text-sm text-muted-foreground animate-pulse">{t('common.loading', 'Loading...')}</div>
                ) : assets.length === 0 ? (
                    <div className="p-12 text-center">
                        <Package className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground mb-4">{t('assets.empty', 'No assets yet. Register the first company asset.')}</p>
                        {hasPermission('assets.create') && (
                            <Button variant="outline" onClick={() => setAssetForm({ ...emptyAsset })}>
                                <Plus className="h-4 w-4 mr-1" /> {t('assets.new_asset', 'New Asset')}
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b text-left text-[12px] uppercase text-muted-foreground">
                                    <th className="px-4 py-3 font-medium">{t('assets.asset', 'Asset')}</th>
                                    <th className="px-4 py-3 font-medium">{t('assets.category', 'Category')}</th>
                                    <th className="px-4 py-3 font-medium">{t('assets.condition', 'Condition')}</th>
                                    <th className="px-4 py-3 font-medium">{t('assets.status', 'Status')}</th>
                                    <th className="px-4 py-3 font-medium">{t('assets.holder', 'Held by')}</th>
                                    <th className="px-4 py-3 font-medium text-right">{t('assets.cost', 'Cost')}</th>
                                    <th className="px-4 py-3 font-medium text-right">{t('common.actions', 'Actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {assets.map((a: any) => {
                                    const Icon = categoryIcon[a.category] ?? Box;
                                    return (
                                        <tr key={a.id} className="border-b last:border-0 hover:bg-muted/30">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="rounded-lg bg-slate-100 p-2 text-slate-500 shrink-0"><Icon className="h-4 w-4" /></div>
                                                    <div className="min-w-0">
                                                        <p className="font-medium truncate">{a.name}</p>
                                                        <p className="text-[11px] text-muted-foreground">{a.code}{a.serial_no ? ` · SN: ${a.serial_no}` : ''}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 capitalize">{String(t(`assets.cat_${a.category}`, a.category))}</td>
                                            <td className="px-4 py-3">
                                                <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded capitalize ${conditionBadge[a.condition] ?? ''}`}>{String(t(`assets.cond_${a.condition}`, a.condition))}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded capitalize ${statusBadge[a.status] ?? ''}`}>{String(t(`assets.status_${a.status}`, a.status))}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                {a.current_assignment?.employee?.name
                                                    ? <span className="font-medium">{a.current_assignment.employee.name}</span>
                                                    : <span className="text-muted-foreground">—</span>}
                                            </td>
                                            <td className="px-4 py-3 text-right tabular-nums">{money(a.purchase_cost)}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-end gap-0.5">
                                                    {a.status === 'available' && (
                                                        <Button variant="ghost" size="sm" className="text-blue-600" title={!hasPermission('assets.assign') ? 'No permission' : t('assets.assign', 'Assign')}
                                                            disabled={!hasPermission('assets.assign')}
                                                            onClick={() => setAssignForm({ asset: a, employee_id: employees[0]?.id ?? '', assigned_at: new Date().toISOString().slice(0, 10), notes: '' })}>
                                                            <UserCheck className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                    {a.status === 'assigned' && (
                                                        <Button variant="ghost" size="sm" className="text-orange-500" title={!hasPermission('assets.return') ? 'No permission' : t('assets.return', 'Return')}
                                                            disabled={!hasPermission('assets.return')}
                                                            onClick={() => setReturnForm({ asset: a, returned_condition: a.condition, notes: '' })}>
                                                            <Undo2 className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                    <Button variant="ghost" size="sm" disabled={!hasPermission('assets.view')} title={!hasPermission('assets.view') ? 'No permission' : t('assets.history', 'History')} onClick={() => openHistory(a)}>
                                                        <History className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-700 hover:bg-slate-50" disabled={!hasPermission('assets.view')} title={!hasPermission('assets.view') ? 'No permission' : t('common.view', 'View')} onClick={() => setViewAsset(a)}>
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500 hover:text-blue-700 hover:bg-blue-50" disabled={!hasPermission('assets.edit')} title={!hasPermission('assets.edit') ? 'No permission' : t('common.edit', 'Edit')} onClick={() => setAssetForm({ ...a, purchase_date: a.purchase_date?.slice(0, 10) ?? '', purchase_cost: a.purchase_cost ?? '' })}>
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50" disabled={!hasPermission('assets.delete')} title={!hasPermission('assets.delete') ? 'No permission' : t('common.delete', 'Delete')} onClick={() => deleteAsset(a)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ---------- Asset Dialog ---------- */}
            <Dialog open={!!assetForm} onOpenChange={(open) => !open && setAssetForm(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{assetForm?.id ? t('common.edit', 'Edit') : t('assets.new_asset', 'New Asset')}</DialogTitle>
                    </DialogHeader>
                    {assetForm && (
                        <div className="space-y-3 py-2">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label>{t('assets.name', 'Name')}</Label>
                                    <Input placeholder="MacBook Pro 14" value={assetForm.name} onChange={e => setAssetForm({ ...assetForm, name: e.target.value })} />
                                </div>
                                <div>
                                    <Label>{t('assets.code', 'Asset code')}</Label>
                                    <Input placeholder="HC-LT-001" value={assetForm.code} onChange={e => setAssetForm({ ...assetForm, code: e.target.value })} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label>{t('assets.category', 'Category')}</Label>
                                    <select className="w-full mt-1 rounded-md border px-3 py-2 text-sm bg-background"
                                        value={assetForm.category} onChange={e => setAssetForm({ ...assetForm, category: e.target.value })}>
                                        {CATEGORIES.map(c => <option key={c} value={c}>{t(`assets.cat_${c}`, c)}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <Label>{t('assets.serial', 'Serial no.')}</Label>
                                    <Input value={assetForm.serial_no ?? ''} onChange={e => setAssetForm({ ...assetForm, serial_no: e.target.value })} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label>{t('assets.purchase_date', 'Purchase date')}</Label>
                                    <Input type="date" value={assetForm.purchase_date ?? ''} onChange={e => setAssetForm({ ...assetForm, purchase_date: e.target.value })} />
                                </div>
                                <div>
                                    <Label>{t('assets.cost', 'Cost')} ($)</Label>
                                    <Input type="number" min={0} step="0.01" value={assetForm.purchase_cost} onChange={e => setAssetForm({ ...assetForm, purchase_cost: e.target.value })} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label>{t('assets.condition', 'Condition')}</Label>
                                    <select className="w-full mt-1 rounded-md border px-3 py-2 text-sm bg-background"
                                        value={assetForm.condition} onChange={e => setAssetForm({ ...assetForm, condition: e.target.value })}>
                                        {Object.keys(conditionBadge).map(c => <option key={c} value={c}>{t(`assets.cond_${c}`, c)}</option>)}
                                    </select>
                                </div>
                                {assetForm.id && (
                                    <div>
                                        <Label>{t('assets.status', 'Status')}</Label>
                                        <select className="w-full mt-1 rounded-md border px-3 py-2 text-sm bg-background"
                                            value={assetForm.status}
                                            disabled={assetForm.status === 'assigned'}
                                            onChange={e => setAssetForm({ ...assetForm, status: e.target.value })}>
                                            <option value="available">{t('assets.status_available', 'Available')}</option>
                                            <option value="maintenance">{t('assets.status_maintenance', 'Maintenance')}</option>
                                            <option value="retired">{t('assets.status_retired', 'Retired')}</option>
                                            {assetForm.status === 'assigned' && <option value="assigned">{t('assets.status_assigned', 'Assigned')}</option>}
                                        </select>
                                    </div>
                                )}
                            </div>
                            <div>
                                <Label>{t('assets.notes', 'Notes')}</Label>
                                <Input value={assetForm.notes ?? ''} onChange={e => setAssetForm({ ...assetForm, notes: e.target.value })} />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAssetForm(null)}>{t('common.cancel', 'Cancel')}</Button>
                        <Button onClick={saveAsset} disabled={!assetForm?.name || !assetForm?.code}>{t('common.save', 'Save')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ---------- Assign Dialog ---------- */}
            <Dialog open={!!assignForm} onOpenChange={(open) => !open && setAssignForm(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('assets.assign_title', 'Assign')} — {assignForm?.asset?.name}</DialogTitle>
                    </DialogHeader>
                    {assignForm && (
                        <div className="space-y-3 py-2">
                            <div>
                                <Label>{t('assets.employee', 'Employee')}</Label>
                                <select className="w-full mt-1 rounded-md border px-3 py-2 text-sm bg-background"
                                    value={assignForm.employee_id} onChange={e => setAssignForm({ ...assignForm, employee_id: e.target.value })}>
                                    {employees.map((emp: any) => (
                                        <option key={emp.id} value={emp.id}>{emp.name ?? `${emp.first_name} ${emp.last_name}`}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <Label>{t('assets.assigned_date', 'Assigned date')}</Label>
                                <Input type="date" value={assignForm.assigned_at} onChange={e => setAssignForm({ ...assignForm, assigned_at: e.target.value })} />
                            </div>
                            <div>
                                <Label>{t('assets.notes', 'Notes')}</Label>
                                <Input placeholder={t('assets.assign_notes_ph', 'e.g. Includes charger and bag')} value={assignForm.notes} onChange={e => setAssignForm({ ...assignForm, notes: e.target.value })} />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAssignForm(null)}>{t('common.cancel', 'Cancel')}</Button>
                        <Button onClick={submitAssign} disabled={!assignForm?.employee_id}>{t('assets.assign', 'Assign')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ---------- Return Dialog ---------- */}
            <Dialog open={!!returnForm} onOpenChange={(open) => !open && setReturnForm(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('assets.return_title', 'Return')} — {returnForm?.asset?.name}</DialogTitle>
                    </DialogHeader>
                    {returnForm && (
                        <div className="space-y-3 py-2">
                            <p className="text-sm text-muted-foreground">
                                {t('assets.return_from', 'Returning from')}: <span className="font-medium text-foreground">{returnForm.asset.current_assignment?.employee?.name ?? '—'}</span>
                            </p>
                            <div>
                                <Label>{t('assets.returned_condition', 'Condition on return')}</Label>
                                <select className="w-full mt-1 rounded-md border px-3 py-2 text-sm bg-background"
                                    value={returnForm.returned_condition} onChange={e => setReturnForm({ ...returnForm, returned_condition: e.target.value })}>
                                    {Object.keys(conditionBadge).map(c => <option key={c} value={c}>{t(`assets.cond_${c}`, c)}</option>)}
                                </select>
                            </div>
                            <div>
                                <Label>{t('assets.notes', 'Notes')}</Label>
                                <Input value={returnForm.notes} onChange={e => setReturnForm({ ...returnForm, notes: e.target.value })} />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setReturnForm(null)}>{t('common.cancel', 'Cancel')}</Button>
                        <Button onClick={submitReturn}>{t('assets.return', 'Return')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ---------- History Dialog ---------- */}
            <Dialog open={!!historyFor} onOpenChange={(open) => !open && setHistoryFor(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('assets.history', 'History')} — {historyFor?.asset?.name}</DialogTitle>
                    </DialogHeader>
                    <div className="py-2 max-h-[50vh] overflow-y-auto space-y-2">
                        {historyFor?.rows?.length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-6">{t('assets.no_history', 'Never assigned yet.')}</p>
                        )}
                        {historyFor?.rows?.map((h: any) => (
                            <div key={h.id} className="rounded-lg border p-3 text-sm">
                                <div className="flex items-center justify-between gap-2">
                                    <p className="font-medium">{h.employee?.name ?? '—'}</p>
                                    <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${h.returned_at ? 'bg-slate-100 text-slate-500' : 'bg-blue-100 text-blue-700'}`}>
                                        {h.returned_at ? t('assets.returned', 'Returned') : t('assets.holding', 'Holding')}
                                    </span>
                                </div>
                                <p className="text-[12px] text-muted-foreground mt-1">
                                    {new Date(h.assigned_at).toLocaleDateString()} → {h.returned_at ? new Date(h.returned_at).toLocaleDateString() : '…'}
                                    {h.returned_condition && ` · ${t(`assets.cond_${h.returned_condition}`, h.returned_condition)}`}
                                </p>
                                {h.notes && <p className="text-[12px] text-muted-foreground mt-1 whitespace-pre-line">{h.notes}</p>}
                            </div>
                        ))}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setHistoryFor(null)}>{t('common.close', 'Close')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ---------- View Asset Dialog ---------- */}
            <Dialog open={!!viewAsset} onOpenChange={(open) => !open && setViewAsset(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('assets.view_asset', 'View Asset')} — {viewAsset?.name}</DialogTitle>
                    </DialogHeader>
                    {viewAsset && (
                        <div className="space-y-3 py-2">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label className="text-xs text-muted-foreground uppercase">{t('assets.name', 'Name')}</Label>
                                    <p className="font-medium">{viewAsset.name || '—'}</p>
                                </div>
                                <div>
                                    <Label className="text-xs text-muted-foreground uppercase">{t('assets.code', 'Asset code')}</Label>
                                    <p className="font-medium">{viewAsset.code || '—'}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label className="text-xs text-muted-foreground uppercase">{t('assets.category', 'Category')}</Label>
                                    <p className="font-medium capitalize">{String(t(`assets.cat_${viewAsset.category}`, viewAsset.category)) || '—'}</p>
                                </div>
                                <div>
                                    <Label className="text-xs text-muted-foreground uppercase">{t('assets.serial', 'Serial no.')}</Label>
                                    <p className="font-medium">{viewAsset.serial_no || '—'}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label className="text-xs text-muted-foreground uppercase">{t('assets.purchase_date', 'Purchase date')}</Label>
                                    <p className="font-medium">{viewAsset.purchase_date ? new Date(viewAsset.purchase_date).toLocaleDateString() : '—'}</p>
                                </div>
                                <div>
                                    <Label className="text-xs text-muted-foreground uppercase">{t('assets.cost', 'Cost')} ($)</Label>
                                    <p className="font-medium tabular-nums">{money(viewAsset.purchase_cost)}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label className="text-xs text-muted-foreground uppercase">{t('assets.condition', 'Condition')}</Label>
                                    <p className="font-medium capitalize">{String(t(`assets.cond_${viewAsset.condition}`, viewAsset.condition)) || '—'}</p>
                                </div>
                                <div>
                                    <Label className="text-xs text-muted-foreground uppercase">{t('assets.status', 'Status')}</Label>
                                    <p className="font-medium capitalize">{String(t(`assets.status_${viewAsset.status}`, viewAsset.status)) || '—'}</p>
                                </div>
                            </div>
                            <div>
                                <Label className="text-xs text-muted-foreground uppercase">{t('assets.notes', 'Notes')}</Label>
                                <p className="font-medium whitespace-pre-line">{viewAsset.notes || '—'}</p>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setViewAsset(null)}>{t('common.close', 'Close')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

import { useState, useEffect, useRef, useCallback } from "react";
import api from "@/services/api";
import { MapPin, Trash2, Pencil, MessageSquare } from "lucide-react";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';

const DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// ── Helpers ───────────────────────────────────────────────────────────────────

const StatusBadge = ({ status, suspicious, lateReason, earlyOutReason }: { status: string; suspicious?: boolean; lateReason?: string | null; earlyOutReason?: string | null }) => {
    if (suspicious) {
        return (
            <div>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    </svg>
                    Check Hours
                </span>
                <div className="text-xs text-amber-600 mt-0.5">Possible missed clock-out</div>
            </div>
        );
    }
    const cfg: Record<string, { label: string; className: string; reasonBox: string; reasonIcon: string; reasonText: string }> = {
        present:   { label: 'Present',   className: 'bg-green-100 text-green-700',   reasonBox: 'bg-green-50 border-green-200',   reasonIcon: 'text-green-500',   reasonText: 'text-green-800' },
        late:      { label: 'Late',       className: 'bg-orange-100 text-orange-700', reasonBox: 'bg-orange-50 border-orange-200', reasonIcon: 'text-orange-500', reasonText: 'text-orange-800' },
        early_out: { label: 'Early Out',  className: 'bg-yellow-100 text-yellow-700', reasonBox: 'bg-yellow-50 border-yellow-200', reasonIcon: 'text-yellow-600', reasonText: 'text-yellow-800' },
        warning:   { label: 'Warning',    className: 'bg-red-100 text-red-600',       reasonBox: 'bg-red-50 border-red-200',       reasonIcon: 'text-red-500',     reasonText: 'text-red-800' },
        absent:    { label: 'Absent',     className: 'bg-red-100 text-red-700',       reasonBox: 'bg-red-50 border-red-200',       reasonIcon: 'text-red-500',     reasonText: 'text-red-800' },
        on_leave:  { label: 'On Leave',   className: 'bg-blue-100 text-blue-700',     reasonBox: 'bg-blue-50 border-blue-200',     reasonIcon: 'text-blue-500',    reasonText: 'text-blue-800' },
    };
    const c = cfg[status] ?? { label: status ?? '—', className: 'bg-gray-100 text-gray-500', reasonBox: 'bg-gray-50 border-gray-200', reasonIcon: 'text-gray-400', reasonText: 'text-gray-700' };
    const reason = status === 'late' ? lateReason : status === 'early_out' ? earlyOutReason : null;
    return (
        <div>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${c.className}`}>{c.label}</span>
            {reason && (
                <div className={`flex items-start gap-1.5 mt-1.5 px-2.5 py-1.5 rounded-lg border max-w-[240px] ${c.reasonBox}`}>
                    <MessageSquare className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${c.reasonIcon}`} />
                    <span className={`text-sm font-medium leading-snug ${c.reasonText}`}>{reason}</span>
                </div>
            )}
        </div>
    );
};

const HoursBadge = ({ hours, crossesMidnight }: { hours: string; crossesMidnight?: boolean }) => {
    if (!hours || hours === '-') return <span className="text-gray-400 text-sm">—</span>;
    if (hours === '—') {
        return (
            <div>
                <span className="text-red-400 font-mono text-sm font-medium">—</span>
                <div className="text-xs text-red-400 mt-0.5 whitespace-nowrap">Needs review</div>
            </div>
        );
    }
    const h = parseInt(hours.match(/^(\d+)/)?.[1] ?? '0');
    const colorClass =
        h >= 10 ? 'text-orange-500' :
        h < 4   ? 'text-amber-500'  :
                   'text-emerald-600 font-medium';
    return (
        <div className="flex items-center gap-1">
            <span className={`font-mono text-sm ${colorClass}`}>{hours}</span>
            {crossesMidnight && (
                <span className="text-xs text-purple-500 font-semibold" title="Clocked out past midnight">+1d</span>
            )}
        </div>
    );
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function AttendanceList() {
    const [attendances, setAttendances] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [clearing, setClearing] = useState(false);
    const [removing, setRemoving] = useState<number | null>(null);
    const [filterDate, setFilterDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const markerRefs = useRef<{ [key: number]: any }>({});

    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [isClearLogsOpen, setIsClearLogsOpen] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState<any>(null);
    const [manualTime, setManualTime] = useState("");

    const fetchAttendances = useCallback(async (isPolling = false) => {
        try {
            const res = await api.get(`/reports/attendance?start_date=${filterDate}&end_date=${filterDate}`);
            setAttendances(res.data.data);
        } catch (err) {
            console.error(err);
        } finally {
            if (!isPolling) setLoading(false);
        }
    }, [filterDate]);

    useEffect(() => {
        fetchAttendances();
        const interval = setInterval(() => fetchAttendances(true), 10000);
        return () => clearInterval(interval);
    }, [fetchAttendances]);

    const handleManualClockOut = () => {
        if (!manualTime || !selectedRecord) return;
        api.put(`/attendance/${selectedRecord.id}/manual-clock-out`, { clock_out_time: manualTime })
            .then(() => { setShowModal(false); setManualTime(""); fetchAttendances(); })
            .catch(() => toast.error("Failed to save clock out time."));
    };

    const confirmRemoveRecord = () => {
        if (!deleteId) return;
        setRemoving(deleteId);
        api.delete(`/attendance/${deleteId}`)
            .then(() => { fetchAttendances(); toast.success("Attendance record removed"); })
            .catch(() => toast.error("Failed to remove record."))
            .finally(() => { setRemoving(null); setDeleteId(null); });
    };

    const confirmClearLogs = () => {
        setClearing(true);
        api.delete('/attendance/clear')
            .then(() => { fetchAttendances(); toast.success("All attendance records cleared"); })
            .catch(() => toast.error("Failed to clear logs."))
            .finally(() => { setClearing(false); setIsClearLogsOpen(false); });
    };

    const formatTime = (isoString: string) => {
        if (!isoString) return "—";
        return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const validLocations = attendances.filter(a => a.latitude && a.longitude);
    const centerPosition: [number, number] = [11.5564, 104.9282];

    const handleRowClick = (recordId: number) => {
        const marker = markerRefs.current[recordId];
        if (marker) { marker.openPopup(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">Attendance</h1>
                    <p className="text-muted-foreground mt-1">Manage your organization's HR resources efficiently.</p>
                </div>
                <button
                    onClick={() => setIsClearLogsOpen(true)}
                    disabled={clearing || attendances.length === 0}
                    className="flex items-center gap-2 bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                    <Trash2 className="w-4 h-4" />
                    {clearing ? "Clearing..." : "Clear Logs"}
                </button>
            </div>

            {/* Live Location Map */}
            <div className="bg-gradient-to-br from-green-50/40 via-white to-white p-6 rounded-lg border border-green-100 shadow-sm">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Live Location Feed (GPS Verified)</h3>
                <div className="h-[400px] rounded-lg overflow-hidden border border-slate-200 z-0 relative">
                    {loading ? (
                        <div className="h-full w-full flex items-center justify-center bg-gray-50 text-gray-400">Loading Map...</div>
                    ) : (
                        <MapContainer center={centerPosition} zoom={13} scrollWheelZoom={false} style={{ height: "100%", width: "100%" }}>
                            <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            {validLocations.map((record: any, index: number) => (
                                <Marker
                                    key={record.id}
                                    ref={(ref) => { if (ref) markerRefs.current[record.id] = ref; }}
                                    position={[
                                        parseFloat(record.latitude) + (index * 0.0002),
                                        parseFloat(record.longitude) + (index * 0.0002),
                                    ]}
                                >
                                    <Popup>
                                        <div className="text-sm">
                                            <strong className="block mb-1 text-primary">{record.employee?.user?.name || record.employee?.employee_code}</strong>
                                            <span className="text-gray-600 block">Check In: <span className="font-medium text-gray-900">{formatTime(record.clock_in)}</span></span>
                                            <span className="text-gray-600 block mb-1">Check Out: <span className="font-medium text-gray-900">{formatTime(record.clock_out)}</span></span>
                                            <span className="text-gray-400 text-xs block pt-1 border-t">{record.address || 'Unknown Address'}</span>
                                        </div>
                                    </Popup>
                                </Marker>
                            ))}
                        </MapContainer>
                    )}
                </div>
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="inline-block h-2 w-2 rounded-full bg-green-500"></span>
                    Active markers show real-time Clock In locations. Click marker for details.
                </div>
            </div>

            {/* Logs Table */}
            <div className="bg-gradient-to-br from-green-50/40 via-white to-white rounded-lg border border-green-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">Daily Attendance Logs</h3>
                        <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>Normal (4–9 h)</span>
                            <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-orange-400"></span>Long (&ge;10 h)</span>
                            <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-red-400"></span>Suspicious (&gt;14 h)</span>
                            <span className="flex items-center gap-1"><span className="text-purple-500 font-bold text-sm">+1d</span>Past midnight</span>
                        </div>
                    </div>
                    <input
                        type="date"
                        value={filterDate}
                        onChange={(e) => { setLoading(true); setFilterDate(e.target.value); }}
                        className="px-3 py-1.5 border rounded-lg text-sm text-gray-700 focus:ring-primary focus:border-primary"
                    />
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 font-medium uppercase text-xs">
                            <tr>
                                <th className="px-6 py-4">Employee</th>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Check In</th>
                                <th className="px-6 py-4">Check Out</th>
                                <th className="px-6 py-4">Hours</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Location</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr><td colSpan={8} className="px-6 py-8 text-center text-muted-foreground">Loading...</td></tr>
                            ) : attendances.length === 0 ? (
                                <tr><td colSpan={8} className="px-6 py-8 text-center text-muted-foreground">No attendance records found for this date.</td></tr>
                            ) : (
                                attendances.map((record: any) => {
                                    const isSuspicious = record.hours_worked === '—';
                                    const isNonAttendanceStatus = ['absent', 'on_leave'].includes(record.status);
                                    const isMissingCheckout = !record.clock_out && !isNonAttendanceStatus;
                                    return (
                                        <tr
                                            key={record.id}
                                            onClick={() => handleRowClick(record.id)}
                                            className={`transition-colors cursor-pointer ${
                                                record.deleted_at  ? 'bg-red-50 hover:bg-red-100 opacity-70' :
                                                isSuspicious       ? 'bg-amber-50 hover:bg-amber-100' :
                                                isMissingCheckout  ? 'bg-orange-50 hover:bg-orange-100' :
                                                                     'hover:bg-blue-50'
                                            }`}
                                            title={record.deleted_at ? "This record was removed" : "Click to view on map"}
                                        >
                                            <td className="px-6 py-4 font-semibold text-gray-900">
                                                {record.employee?.user?.name || record.employee?.employee_code || "N/A"}
                                            </td>
                                            <td className="px-6 py-4 text-gray-600">
                                                {new Date(record.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </td>
                                            <td className="px-6 py-4 text-gray-700 font-mono">
                                                {formatTime(record.clock_in)}
                                            </td>
                                            <td className="px-6 py-4 font-mono">
                                                {isNonAttendanceStatus ? (
                                                    <span className="text-gray-400">—</span>
                                                ) : isMissingCheckout ? (
                                                    <div>
                                                        <span className="text-orange-400 text-xs font-sans font-medium">Not clocked out</span>
                                                        <div className="text-[10px] text-amber-500 mt-0.5">
                                                            Flagged for HR review at midnight
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className={record.crosses_midnight ? 'text-purple-600' : 'text-gray-700'}>
                                                        {formatTime(record.clock_out)}
                                                        {record.crosses_midnight && <span className="ml-1 text-xs text-purple-500 font-sans font-semibold">+1d</span>}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <HoursBadge hours={record.hours_worked} crossesMidnight={record.crosses_midnight} />
                                            </td>
                                            <td className="px-6 py-4">
                                                <StatusBadge
                                                    status={record.status}
                                                    suspicious={isSuspicious}
                                                    lateReason={record.late_reason}
                                                    earlyOutReason={record.early_out_reason}
                                                />
                                            </td>
                                            <td className="px-6 py-4 text-gray-600">
                                                <div className="flex items-center gap-1.5">
                                                    <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                                    <span className="truncate max-w-[180px]">
                                                        {isNonAttendanceStatus ? "Not applicable" : (record.address || "GPS Verified")}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {record.deleted_at ? (
                                                        <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-1 rounded">Removed</span>
                                                    ) : (
                                                        <>
                                                            {!isNonAttendanceStatus && (() => {
                                                                const isToday = record.date?.startsWith(new Date().toISOString().split('T')[0]);
                                                                const openFixModal = (e: React.MouseEvent) => {
                                                                    e.stopPropagation();
                                                                    setSelectedRecord(record);
                                                                    // Pre-fill with shift end time so admin has a sensible starting point
                                                                    const shiftEnd = record.employee?.shift?.end_time ?? '17:00';
                                                                    setManualTime(shiftEnd.slice(0, 5));
                                                                    setShowModal(true);
                                                                };
                                                                if (!record.clock_out && isToday) {
                                                                    // Today + no clock_out → show Fix button so admin can act early
                                                                    return (
                                                                        <button
                                                                            onClick={openFixModal}
                                                                            className="text-xs bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-200 px-3 py-1 rounded font-medium transition-colors"
                                                                        >
                                                                            Fix Clock Out
                                                                        </button>
                                                                    );
                                                                }
                                                                if (!record.clock_out && !isToday) {
                                                                    // Past date + no clock_out → allow manual fix
                                                                    return (
                                                                        <button
                                                                            onClick={openFixModal}
                                                                            className="text-xs bg-primary/10 text-primary hover:bg-primary/20 px-3 py-1 rounded font-medium transition-colors"
                                                                        >
                                                                            Fix Clock Out
                                                                        </button>
                                                                    );
                                                                }
                                                                // Has clock_out → allow edit (correction)
                                                                return (
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setSelectedRecord(record);
                                                                            setManualTime(new Date(record.clock_out).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
                                                                            setShowModal(true);
                                                                        }}
                                                                        className="p-1.5 text-amber-500 hover:bg-amber-50 rounded transition-colors"
                                                                        title="Edit Clock Out Time"
                                                                    >
                                                                        <Pencil className="w-3.5 h-3.5" />
                                                                    </button>
                                                                );
                                                            })()}
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); setDeleteId(record.id); }}
                                                                disabled={removing === record.id}
                                                                className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                                                                title="Remove Record"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Manual Clock Out Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-gray-900">
                                    {selectedRecord?.clock_out ? 'Edit Clock Out Time' : 'Manual Clock Out'}
                                </h3>
                                <p className="text-xs text-gray-500">
                                    {selectedRecord?.employee?.user?.name || selectedRecord?.employee?.employee_code || "Employee"}
                                </p>
                            </div>
                        </div>

                        {selectedRecord && new Date(selectedRecord.date).toDateString() !== new Date().toDateString() && (
                            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 mb-4">
                                <svg className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                                </svg>
                                <p className="text-xs text-amber-700 font-medium">
                                    This is a <strong>past record</strong> from{" "}
                                    {new Date(selectedRecord.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}.
                                    {" "}Set the correct clock-out time below.
                                </p>
                            </div>
                        )}

                        <div className="flex gap-3 mb-4">
                            <div className="flex-1 bg-gray-50 rounded-lg p-3 text-center">
                                <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mb-0.5">Date</p>
                                <p className="text-sm font-bold text-gray-800">
                                    {selectedRecord ? new Date(selectedRecord.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                                </p>
                            </div>
                            <div className="flex-1 bg-gray-50 rounded-lg p-3 text-center">
                                <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mb-0.5">Clock In</p>
                                <p className="text-sm font-bold text-green-700">{formatTime(selectedRecord?.clock_in)}</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                    Clock Out Time <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="time"
                                    value={manualTime}
                                    onChange={(e) => setManualTime(e.target.value)}
                                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm font-medium"
                                />
                                <p className="text-xs text-gray-400 mt-1">Time will be applied to the date shown above.</p>
                            </div>
                            <div className="flex gap-2 justify-end pt-1">
                                <button
                                    onClick={() => { setShowModal(false); setManualTime(""); }}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleManualClockOut}
                                    disabled={!manualTime}
                                    className="px-4 py-2 text-sm font-semibold bg-primary text-white hover:bg-primary/90 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Save Clock Out
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation */}
            <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-red-600 flex items-center gap-2">
                            <Trash2 className="h-5 w-5" />
                            Delete Attendance Record
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <p className="text-sm text-muted-foreground">
                            Are you sure you want to completely remove this attendance record? This action cannot be undone.
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={confirmRemoveRecord}>Delete Record</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Clear All Logs Confirmation */}
            <Dialog open={isClearLogsOpen} onOpenChange={setIsClearLogsOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-red-600 flex items-center gap-2">
                            <Trash2 className="h-5 w-5" />
                            Clear All Logs
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <p className="text-sm text-muted-foreground">
                            Are you sure you want to clear ALL attendance logs? This will wipe the attendance history and cannot be undone.
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsClearLogsOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={confirmClearLogs}>Yes, Clear All Logs</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

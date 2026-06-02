import { useState, useEffect, useRef } from "react";
import api from "@/services/api";
import { MapPin, Trash2 } from "lucide-react";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';

// Fix for default marker icon in React-Leaflet
const DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

export default function AttendanceList() {
    const [attendances, setAttendances] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [clearing, setClearing] = useState(false);
    const [removing, setRemoving] = useState<number | null>(null);
    const [filterDate, setFilterDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const markerRefs = useRef<{[key: number]: any}>({});
    
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [isClearLogsOpen, setIsClearLogsOpen] = useState(false);

    const [showModal, setShowModal] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState<any>(null);
    const [manualTime, setManualTime] = useState("");

    const handleManualClockOut = () => {
        if (!manualTime || !selectedRecord) return;
        
        api.put(`/attendance/${selectedRecord.id}/manual-clock-out`, { clock_out_time: manualTime })
            .then(res => {
                setShowModal(false);
                setManualTime("");
                fetchAttendances();
            })
            .catch(err => {
                console.error(err);
                toast.error("Failed to save clock out time.");
            });
    };

    const confirmRemoveRecord = () => {
        if (!deleteId) return;
        setRemoving(deleteId);
        api.delete(`/attendance/${deleteId}`)
            .then(() => {
                fetchAttendances();
                toast.success("Attendance record removed");
            })
            .catch(err => {
                console.error(err);
                toast.error("Failed to remove record.");
            })
            .finally(() => {
                setRemoving(null);
                setDeleteId(null);
            });
    };

    const fetchAttendances = (isPolling = false) => {
        if (!isPolling) setLoading(true);
        api.get(`/reports/attendance?start_date=${filterDate}&end_date=${filterDate}`)
            .then(res => {
                setAttendances(res.data.data);
            })
            .catch(err => console.error(err))
            .finally(() => {
                if (!isPolling) setLoading(false);
            });
    };

    useEffect(() => {
        fetchAttendances();
        const interval = setInterval(() => fetchAttendances(true), 10000);
        return () => clearInterval(interval);
    }, [filterDate]);

    const confirmClearLogs = () => {
        setClearing(true);
        api.delete('/attendance/clear')
            .then(() => {
                fetchAttendances();
                toast.success("All attendance records cleared");
            })
            .catch(err => {
                console.error(err);
                toast.error("Failed to clear logs.");
            })
            .finally(() => {
                setClearing(false);
                setIsClearLogsOpen(false);
            });
    };

    const formatTime = (isoString: string) => {
        if (!isoString) return "-";
        return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // Filter for valid coordinates only
    const validLocations = attendances.filter(a => a.latitude && a.longitude);
    const centerPosition: [number, number] = [11.5564, 104.9282]; // Fixed to Phnom Penh, Cambodia

    const handleRowClick = (recordId: number) => {
        const marker = markerRefs.current[recordId];
        if (marker) {
            marker.openPopup();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    return (
        <div className="space-y-6">
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

            {/* Live Location Feed Map */}
            <div className="bg-white p-6 rounded-lg border shadow-sm">
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
                                    ref={(ref) => {
                                        if (ref) markerRefs.current[record.id] = ref;
                                    }}
                                    position={[
                                        parseFloat(record.latitude) + (index * 0.0002), 
                                        parseFloat(record.longitude) + (index * 0.0002)
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
            <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
                <div className="p-6 border-b flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900">Daily Attendance Logs</h3>
                    <input 
                        type="date" 
                        value={filterDate}
                        onChange={(e) => setFilterDate(e.target.value)}
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
                                <th className="px-6 py-4">Location</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr><td colSpan={6} className="px-6 py-4 text-center text-muted-foreground">Loading...</td></tr>
                            ) : attendances.length === 0 ? (
                                <tr><td colSpan={6} className="px-6 py-4 text-center text-muted-foreground">No attendance records found for this date.</td></tr>
                            ) : (
                                attendances.map((record: any) => (
                                    <tr 
                                        key={record.id} 
                                        onClick={() => handleRowClick(record.id)}
                                        className="hover:bg-blue-50 transition-colors cursor-pointer"
                                        title="Click to view on map"
                                    >
                                        <td className="px-6 py-4 font-semibold text-gray-900">
                                            {record.employee?.user?.name || record.employee?.employee_code || "N/A"}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {new Date(record.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {formatTime(record.clock_in)}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {formatTime(record.clock_out)}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 flex items-center gap-2">
                                            <MapPin className="h-3 w-3 text-muted-foreground" />
                                            {record.address || "GPS Verified"}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {!record.clock_out && (
                                                    <button 
                                                        onClick={() => { setSelectedRecord(record); setShowModal(true); }}
                                                        className="text-xs bg-primary/10 text-primary hover:bg-primary/20 px-3 py-1 rounded font-medium transition-colors"
                                                    >
                                                        Set Clock Out
                                                    </button>
                                                )}
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setDeleteId(record.id); }}
                                                    disabled={removing === record.id}
                                                    className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                                                    title="Remove Record"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Manual Clock Out Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Manual Clock Out</h3>
                        <p className="text-sm text-gray-500 mb-4">
                            Set the checkout time for {selectedRecord?.employee?.user?.name || selectedRecord?.employee?.employee_code || "Employee"}.
                        </p>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Clock Out Time</label>
                                <input 
                                    type="time" 
                                    value={manualTime}
                                    onChange={(e) => setManualTime(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-primary focus:border-primary"
                                />
                            </div>
                            <div className="flex gap-2 justify-end">
                                <button 
                                    onClick={() => { setShowModal(false); setManualTime(""); }}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleManualClockOut}
                                    disabled={!manualTime}
                                    className="px-4 py-2 text-sm font-medium bg-primary text-white hover:bg-primary/90 rounded-lg transition-colors disabled:opacity-50"
                                >
                                    Save Time
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Record Confirmation Modal */}
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

            {/* Clear All Logs Confirmation Modal */}
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

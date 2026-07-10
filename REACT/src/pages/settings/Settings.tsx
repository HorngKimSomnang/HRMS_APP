import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import api from "@/services/api";
import { Trash2, Plus, Building2, Calendar, Lock, Moon, Sun, Upload, MapPin, Search } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { MapContainer, TileLayer, Marker, Circle, useMapEvents, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix Leaflet marker icon issue in React
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
import { toast } from 'sonner';

const DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Map click handler component
function LocationMarker({ position, setPosition }: { position: [number, number], setPosition: (pos: [number, number]) => void }) {
    useMapEvents({
        click(e) {
            setPosition([e.latlng.lat, e.latlng.lng]);
        },
    });

    return position[0] !== 0 ? <Marker position={position} /> : null;
}

function RecenterMap({ lat, lng }: { lat: string | number, lng: string | number }) {
    const map = useMap();
    useEffect(() => {
        if (lat && lng) {
            map.flyTo([Number(lat), Number(lng)], map.getZoom());
        }
    }, [lat, lng, map]);
    return null;
}

export default function Settings() {
    const { user } = useAuth();
    const [passwords, setPasswords] = useState({ current: "", new: "", confirm: "" });

    const handlePasswordUpdate = async () => {
        if (passwords.new !== passwords.confirm) {
            toast("New passwords do not match");
            return;
        }
        try {
            await api.put('/user/password', {
                current_password: passwords.current,
                new_password: passwords.new
            });
            toast.success("Password updated successfully");
            setPasswords({ current: "", new: "", confirm: "" });
        } catch (error) {
            console.error("Failed to update password", error);
            toast.error("Failed to update password");
        }
    };
    const isSuperAdmin = user?.roles?.some(r => r.name === 'Super Admin');
    const [activeTab, setActiveTab] = useState(isSuperAdmin ? "general" : "appearance"); // Default to appearance for demo
    const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // New Leave Type Form
    const [newType, setNewType] = useState({ name: "", days_allowed: "" });
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [deleteLeaveTypeId, setDeleteLeaveTypeId] = useState<number | null>(null);
    const [isDarkMode, setIsDarkMode] = useState(false);
    
    // Logo Upload Logic
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [uploadingLogo, setUploadingLogo] = useState(false);

    // Geofencing Settings
    const [geofence, setGeofence] = useState({ lat: "", lng: "", radius: "" });
    const [savingGeofence, setSavingGeofence] = useState(false);
    
    // Map Search
    const [searchQuery, setSearchQuery] = useState("");
    const [isSearching, setIsSearching] = useState(false);

    const handleSearchLocation = async () => {
        if (!searchQuery) return;
        setIsSearching(true);
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
            const data = await res.json();
            if (data && data.length > 0) {
                const { lat, lon } = data[0];
                setGeofence({ ...geofence, lat, lng: lon });
            } else {
                toast.error("Location not found");
            }
        } catch {
            toast.error("Failed to search location");
        } finally {
            setIsSearching(false);
        }
    };

    // Organization Profile
    const [orgProfile, setOrgProfile] = useState({ name: "", currency: "" });
    const [savingProfile, setSavingProfile] = useState(false);

    useEffect(() => {
        api.get('/settings').then(res => {
            const data = res.data.data || {};
            if (data.company_logo) {
                setLogoPreview(`${api.defaults.baseURL?.replace('/api', '')}/storage/${data.company_logo}`);
            }
            setGeofence({
                lat: data.office_latitude || "",
                lng: data.office_longitude || "",
                radius: data.attendance_allowed_radius || ""
            });
            setOrgProfile({
                name: data.company_name || "HEN CHEN INVESTMENT CO.,LTD",
                currency: data.currency_symbol || "$"
            });
        }).catch(err => console.error("Could not fetch settings", err));
    }, []);

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];
        const formData = new FormData();
        formData.append('logo', file);
        
        setUploadingLogo(true);
        try {
            const res = await api.post('/settings/logo', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setLogoPreview(`${api.defaults.baseURL?.replace('/api', '')}/storage/${res.data.logo_path}`);
            toast.success("Company logo successfully uploaded! It will now appear on your sidebar.");
        } catch (err) {
            console.error("Failed to upload logo", err);
            toast.error("Failed to upload logo. Ensure it is an image under 2MB.");
        } finally {
            setUploadingLogo(false);
        }
    };

    const handleSaveGeofence = async () => {
        const lat = parseFloat(geofence.lat);
        const lng = parseFloat(geofence.lng);
        const radius = parseFloat(geofence.radius);
        if (isNaN(lat) || lat < -90 || lat > 90) {
            toast.error("Latitude must be a number between -90 and 90.");
            return;
        }
        if (isNaN(lng) || lng < -180 || lng > 180) {
            toast.error("Longitude must be a number between -180 and 180.");
            return;
        }
        if (isNaN(radius) || radius <= 0) {
            toast.error("Allowed radius must be a positive number.");
            return;
        }
        setSavingGeofence(true);
        try {
            await api.post('/settings', {
                settings: [
                    { key: 'office_latitude', value: geofence.lat.toString() },
                    { key: 'office_longitude', value: geofence.lng.toString() },
                    { key: 'attendance_allowed_radius', value: geofence.radius.toString() },
                ]
            });
            toast.success("Geofencing settings saved successfully!");
        } catch (err) {
            console.error("Failed to save geofence settings", err);
            toast.error("Failed to save geofencing settings.");
        } finally {
            setSavingGeofence(false);
        }
    };

    const handleSaveProfile = async () => {
        setSavingProfile(true);
        try {
            await api.post('/settings', {
                settings: [
                    { key: 'company_name', value: orgProfile.name },
                    { key: 'currency_symbol', value: orgProfile.currency },
                ]
            });
            toast.success("Organization profile saved successfully!");
        } catch (err) {
            console.error("Failed to save profile", err);
            toast.error("Failed to save profile settings.");
        } finally {
            setSavingProfile(false);
        }
    };

    useEffect(() => {
        // Check initial theme
        const isDark = document.documentElement.classList.contains('dark');
        setIsDarkMode(isDark);
    }, []);

    useEffect(() => {
        if (activeTab === "leaves") {
            fetchLeaveTypes();
        }
    }, [activeTab]);

    const toggleTheme = () => {
        const newMode = !isDarkMode;
        setIsDarkMode(newMode);
        if (newMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    };

    const fetchLeaveTypes = async () => {
        setLoading(true);
        try {
            const res = await api.get('/leave-types');
            setLeaveTypes(res.data);
        } catch (error) {
            console.error("Failed to fetch leave types", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateLeaveType = async () => {
        try {
            await api.post('/leave-types', newType);
            setNewType({ name: "", days_allowed: "" });
            setIsDialogOpen(false);
            fetchLeaveTypes();
            toast.success("Leave type created successfully");
        } catch (error) {
            console.error("Failed to create leave type", error);
            toast.error("Failed to create leave type");
        }
    };

    const confirmDeleteLeaveType = async () => {
        if (!deleteLeaveTypeId) return;
        try {
            await api.delete(`/leave-types/${deleteLeaveTypeId}`);
            fetchLeaveTypes();
            setDeleteLeaveTypeId(null);
            toast.success("Leave type deleted successfully");
        } catch (error) {
            console.error("Failed to delete leave type", error);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
                <p className="text-muted-foreground mt-1">Manage system configurations and preferences.</p>
            </div>

            {/* Tabs Navigation */}
            <div className="flex border-b">
                {isSuperAdmin && (
                    <button
                        onClick={() => setActiveTab("general")}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "general" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                            }`}
                    >
                        <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4" /> General
                        </div>
                    </button>
                )}
                <button
                    onClick={() => setActiveTab("appearance")}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "appearance" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                >
                    <div className="flex items-center gap-2">
                        <Moon className="h-4 w-4" /> Appearance
                    </div>
                </button>
                <button
                    onClick={() => setActiveTab('attendance')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'attendance' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                >
                    <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" /> Attendance
                    </div>
                </button>
                <button
                    onClick={() => setActiveTab('leaves')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'leaves' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                >
                    <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" /> Leaves
                    </div>
                </button>
                <button
                    onClick={() => setActiveTab('security')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'security' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                >
                    <div className="flex items-center gap-2">
                        <Lock className="h-4 w-4" /> Security
                    </div>
                </button>
            </div>

            {/* Tab Content */}
            <div className="p-1">
                {activeTab === "general" && (
                    <div className="max-w-3xl space-y-6">
                        <div className="bg-gradient-to-br from-blue-50/50 via-card to-card p-6 rounded-xl border border-blue-100 shadow-sm">
                            <h3 className="text-lg font-semibold mb-4">Organization Profile</h3>
                            <div className="grid gap-4 max-w-xl">
                                <div className="grid gap-2">
                                    <label className="text-sm font-medium">Company Name</label>
                                    <Input value={orgProfile.name} onChange={e=>setOrgProfile({...orgProfile, name: e.target.value})} />
                                </div>
                                <div className="grid gap-2">
                                    <label className="text-sm font-medium">Currency Symbol</label>
                                    <Input value={orgProfile.currency} onChange={e=>setOrgProfile({...orgProfile, currency: e.target.value})} />
                                </div>
                                <div className="pt-2">
                                    <Button onClick={handleSaveProfile} disabled={savingProfile}>
                                        {savingProfile ? "Saving..." : "Save Profile"}
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-indigo-50/50 via-card to-card p-6 rounded-xl border border-indigo-100 shadow-sm">
                            <h3 className="text-lg font-semibold mb-4">Company Branding</h3>
                            <div className="grid gap-4">
                                <div className="grid gap-2">
                                    <label className="text-sm font-medium">Company Logo</label>
                                    <div className="flex items-center gap-6 mt-2">
                                        <div className="h-24 w-24 rounded-full bg-muted border flex items-center justify-center overflow-hidden">
                                            {logoPreview ? (
                                                <img src={logoPreview} alt="Company Logo" className="h-full w-full object-cover" />
                                            ) : (
                                                <Building2 className="h-8 w-8 text-muted-foreground" />
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <Button variant="outline" className="relative cursor-pointer" disabled={uploadingLogo}>
                                                <input 
                                                    type="file" 
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                                                    accept="image/*"
                                                    onChange={handleLogoUpload}
                                                />
                                                <Upload className="h-4 w-4 mr-2" />
                                                {uploadingLogo ? "Uploading..." : "Upload New Logo"}
                                            </Button>
                                            <p className="text-xs text-muted-foreground">Supported formats: JPG, PNG, SVG (Max 2MB)</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === "attendance" && (
                    <div className="max-w-4xl space-y-6">
                        <div className="bg-gradient-to-br from-sky-50/50 via-card to-card p-6 rounded-xl border border-sky-100 shadow-sm">
                            <h3 className="text-lg font-semibold mb-4 text-primary">Attendance Geofencing (GPS)</h3>
                            <div className="grid gap-6">
                                <p className="text-sm text-muted-foreground">Set the central office location and the allowed radius in meters. Employees must be within this circle to clock in or out.</p>
                                
                                <div className="flex gap-2">
                                    <Input 
                                        placeholder="Search for a location or address (e.g. Phnom Penh)..." 
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSearchLocation()}
                                    />
                                    <Button onClick={handleSearchLocation} disabled={isSearching} className="gap-2">
                                        <Search className="h-4 w-4" />
                                        {isSearching ? "Searching..." : "Search"}
                                    </Button>
                                </div>

                                <div className="border rounded-lg overflow-hidden relative z-0 h-[500px]">
                                    <MapContainer 
                                        center={geofence.lat && geofence.lng ? [parseFloat(geofence.lat), parseFloat(geofence.lng)] : [11.5564, 104.9282]} 
                                        zoom={16} 
                                        style={{ height: "100%", width: "100%" }}
                                    >
                                        <TileLayer
                                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                            attribution='&copy; OpenStreetMap contributors'
                                        />
                                        {geofence.lat && geofence.lng && (
                                            <>
                                                <LocationMarker 
                                                    position={[parseFloat(geofence.lat), parseFloat(geofence.lng)]} 
                                                    setPosition={(pos) => setGeofence({...geofence, lat: pos[0].toFixed(6), lng: pos[1].toFixed(6)})} 
                                                />
                                                <Circle 
                                                    center={[parseFloat(geofence.lat), parseFloat(geofence.lng)]} 
                                                    radius={parseFloat(geofence.radius) || 100} 
                                                    pathOptions={{ color: 'blue', fillColor: 'blue', fillOpacity: 0.2 }}
                                                />
                                            </>
                                        )}
                                        {(!geofence.lat || !geofence.lng) && (
                                            <LocationMarker 
                                                position={[11.5564, 104.9282]} 
                                                setPosition={(pos) => setGeofence({...geofence, lat: pos[0].toFixed(6), lng: pos[1].toFixed(6)})} 
                                            />
                                        )}
                                        <RecenterMap lat={geofence.lat} lng={geofence.lng} />
                                    </MapContainer>
                                    <div className="absolute top-2 right-2 z-[1000] bg-white px-2 py-1 rounded text-xs font-semibold shadow border flex items-center gap-1">
                                        <MapPin className="h-3 w-3 text-primary" /> Click map to set location
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <label className="text-sm font-medium">Office Latitude</label>
                                        <Input value={geofence.lat} onChange={e=>setGeofence({...geofence, lat:e.target.value})} placeholder="e.g. 11.5564" />
                                    </div>
                                    <div className="grid gap-2">
                                        <label className="text-sm font-medium">Office Longitude</label>
                                        <Input value={geofence.lng} onChange={e=>setGeofence({...geofence, lng:e.target.value})} placeholder="e.g. 104.9282" />
                                    </div>
                                </div>
                                <div className="grid gap-2">
                                    <label className="text-sm font-medium">Allowed Radius (Meters)</label>
                                    <Input type="number" value={geofence.radius} onChange={e=>setGeofence({...geofence, radius:e.target.value})} placeholder="e.g. 100" />
                                </div>
                                <div className="mt-2">
                                    <Button onClick={handleSaveGeofence} disabled={savingGeofence} className="w-full sm:w-auto">
                                        {savingGeofence ? "Saving..." : "Save Geofence Settings"}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === "appearance" && (
                    <div className="max-w-xl space-y-4">
                        <div className="bg-gradient-to-br from-violet-50/50 via-card to-card p-6 rounded-lg border border-violet-100 shadow-sm">
                            <h3 className="text-lg font-medium mb-4">Theme Preferences</h3>
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <label className="text-sm font-medium">Dark Mode</label>
                                    <p className="text-muted-foreground text-sm">Enable dark mode for a better viewing experience at night.</p>
                                </div>
                                <Button
                                    variant={isDarkMode ? "default" : "outline"}
                                    onClick={toggleTheme}
                                    className="w-[100px]"
                                >
                                    {isDarkMode ? (
                                        <div className="flex items-center gap-2"><Moon className="h-4 w-4" /> ON</div>
                                    ) : (
                                        <div className="flex items-center gap-2"><Sun className="h-4 w-4" /> OFF</div>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === "leaves" && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-medium">Leave Types Configuration</h3>
                            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button>
                                        <Plus className="h-4 w-4 mr-2" /> Add Leave Type
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Add New Leave Type</DialogTitle>
                                    </DialogHeader>
                                    <div className="grid gap-4 py-4">
                                        <div className="grid gap-2">
                                            <label className="text-sm font-medium">Name</label>
                                            <Input
                                                placeholder="e.g. Sick Leave"
                                                value={newType.name}
                                                onChange={(e) => setNewType({ ...newType, name: e.target.value })}
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <label className="text-sm font-medium">Days Allowed (per year)</label>
                                            <Input
                                                type="number"
                                                placeholder="12"
                                                value={newType.days_allowed}
                                                onChange={(e) => setNewType({ ...newType, days_allowed: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button onClick={handleCreateLeaveType}>Save Leave Type</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>

                        <div className="rounded-md border border-orange-100 bg-gradient-to-br from-orange-50/40 via-card to-card shadow-sm">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Leave Type Name</TableHead>
                                        <TableHead>Days Allowed</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow><TableCell colSpan={3} className="text-center h-24">Loading...</TableCell></TableRow>
                                    ) : leaveTypes.length === 0 ? (
                                        <TableRow><TableCell colSpan={3} className="text-center h-24 text-muted-foreground">No leave types defined.</TableCell></TableRow>
                                    ) : (
                                        leaveTypes.map((type) => (
                                            <TableRow key={type.id}>
                                                <TableCell className="font-medium">{type.name}</TableCell>
                                                <TableCell>{type.days_allowed} days / year</TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                                        onClick={() => setDeleteLeaveTypeId(type.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                )}
                {activeTab === 'security' && (
                    <div className="max-w-md space-y-6">
                        <div className="bg-gradient-to-br from-slate-100/70 via-card to-card p-6 rounded-lg border border-slate-200 shadow-sm">
                            <h3 className="text-lg font-medium mb-4">Change Password</h3>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Current Password</label>
                                    <Input
                                        type="password"
                                        value={passwords.current}
                                        onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">New Password</label>
                                    <Input
                                        type="password"
                                        value={passwords.new}
                                        onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Confirm New Password</label>
                                    <Input
                                        type="password"
                                        value={passwords.confirm}
                                        onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                                    />
                                </div>
                                <Button onClick={handlePasswordUpdate}>Update Password</Button>
                            </div>
                        </div>
                    </div>
                )}

            </div>

            {/* Delete Leave Type Confirmation Modal */}
            <Dialog open={!!deleteLeaveTypeId} onOpenChange={(open) => !open && setDeleteLeaveTypeId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-red-600 flex items-center gap-2">
                            <Trash2 className="h-5 w-5" />
                            Delete Leave Type
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <p className="text-sm text-muted-foreground">
                            Are you sure you want to delete this leave type? This will remove it from the system.
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteLeaveTypeId(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={confirmDeleteLeaveType}>Delete Leave Type</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

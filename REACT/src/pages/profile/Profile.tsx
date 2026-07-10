import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { User, Mail, Phone, MapPin, Building, Briefcase, Calendar } from "lucide-react";
import api from "@/services/api";
import { toast } from 'sonner';

export default function Profile() {
    const { user, updateUser } = useAuth();
    const [employee, setEmployee] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Account Update (name + email)
    const [account, setAccount] = useState({ name: "", email: "" });
    const [savingAccount, setSavingAccount] = useState(false);

    // Password Update
    const [passwords, setPasswords] = useState({ current: "", new: "", confirm: "" });

    useEffect(() => {
        if (user) setAccount({ name: user.name ?? "", email: user.email ?? "" });
    }, [user]);

    const handleAccountUpdate = async () => {
        setSavingAccount(true);
        try {
            const res = await api.put('/profile/update', { name: account.name, email: account.email });
            if (res.data.user) updateUser(res.data.user);
            toast.success("Profile updated successfully");
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to update profile");
        } finally {
            setSavingAccount(false);
        }
    };

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await api.get('/user');
                // Check if user has employee profile linked
                if (res.data.data?.employee) {
                    setEmployee(res.data.data.employee);
                } else if (res.data.employee) {
                    // Handle different API structure if needed
                    setEmployee(res.data.employee);
                } else if (user?.email) {
                    // Try fetching employee by email if not directly attached
                    const empRes = await api.get('/employees?email=' + user.email);
                    if (empRes.data.data && empRes.data.data.length > 0) {
                        setEmployee(empRes.data.data[0]);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch profile", error);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [user]);

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

    if (loading) return <div>Loading profile...</div>;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">My Profile</h1>
                <p className="text-muted-foreground">Manage your personal information and security.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Personal Info Card */}
                <div className="space-y-6">
                    <div className="p-6 bg-gradient-to-br from-blue-50/50 via-card to-card rounded-lg border border-blue-100 shadow-sm">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold border-2 border-primary">
                                {user?.name?.[0]?.toUpperCase()}
                            </div>
                            <div>
                                <h2 className="text-xl font-bold">{user?.name}</h2>
                                <p className="text-muted-foreground flex items-center gap-1 text-sm">
                                    <Mail className="h-3 w-3" /> {user?.email}
                                </p>
                                <div className="flex gap-2 mt-2">
                                    {user?.roles?.map((r: any) => (
                                        <span key={r.name} className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                                            {r.name}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {employee ? (
                            <div className="space-y-4">
                                <h3 className="font-semibold border-b pb-2">Employee Details</h3>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-muted-foreground block text-xs">Employee ID</span>
                                        <span className="font-medium flex items-center gap-1"><User className="h-3 w-3" /> {employee.employee_code}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground block text-xs">Phone</span>
                                        <span className="font-medium flex items-center gap-1"><Phone className="h-3 w-3" /> {employee.phone}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground block text-xs">Branch</span>
                                        <span className="font-medium flex items-center gap-1"><Building className="h-3 w-3" /> {employee.branch?.name}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground block text-xs">Department</span>
                                        <span className="font-medium flex items-center gap-1"><Briefcase className="h-3 w-3" /> {employee.department?.name}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground block text-xs">Joined</span>
                                        <span className="font-medium flex items-center gap-1"><Calendar className="h-3 w-3" /> {employee.joining_date}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground block text-xs">Address</span>
                                        <span className="font-medium flex items-center gap-1"><MapPin className="h-3 w-3" /> {employee.address}</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="p-4 bg-yellow-50 text-yellow-800 rounded text-sm">
                                No linked employee profile found. You are signed in as a System User.
                            </div>
                        )}
                    </div>
                </div>

                {/* Account + Security Settings */}
                <div className="space-y-6">
                    <div className="p-6 bg-gradient-to-br from-blue-50/50 via-card to-card rounded-lg border border-blue-100 shadow-sm">
                        <h3 className="text-lg font-semibold mb-4">Account</h3>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Display Name</label>
                                <Input
                                    value={account.name}
                                    onChange={(e) => setAccount({ ...account, name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Email</label>
                                <Input
                                    type="email"
                                    value={account.email}
                                    onChange={(e) => setAccount({ ...account, email: e.target.value })}
                                />
                            </div>
                            <Button onClick={handleAccountUpdate} disabled={savingAccount || !account.name || !account.email}>
                                {savingAccount ? "Saving..." : "Save Changes"}
                            </Button>
                        </div>
                    </div>

                    <div className="p-6 bg-gradient-to-br from-slate-100/70 via-card to-card rounded-lg border border-slate-200 shadow-sm">
                        <h3 className="text-lg font-semibold mb-4">Security</h3>
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
            </div>
        </div>
    );
}

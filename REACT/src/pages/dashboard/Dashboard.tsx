import { useAuth } from "@/context/AuthContext";
import SuperAdminDashboard from "./SuperAdminDashboard";
import AdminDashboard from "./AdminDashboard";

export default function Dashboard() {
    const { user } = useAuth();
    
    // Check if user has Super Admin role
    const isSuperAdmin = user?.roles?.some((r: any) => r.name === 'Super Admin');
    
    if (isSuperAdmin) {
        return <SuperAdminDashboard />;
    }
    
    // Otherwise fallback to normal Admin (HR Operations) Dashboard
    return <AdminDashboard />;
}

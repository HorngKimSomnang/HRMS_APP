import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Login from '@/pages/auth/Login';
import ForgotPassword from '@/pages/auth/ForgotPassword';
import Dashboard from '@/pages/dashboard/Dashboard';
import EmployeeList from '@/pages/employees/EmployeeList';
import CreateEmployee from '@/pages/employees/CreateEmployee';
import EditEmployee from '@/pages/employees/EditEmployee';
import ViewEmployee from '@/pages/employees/ViewEmployee';
import AdminList from '@/pages/admin/AdminList';
import CreateAdmin from '@/pages/admin/CreateAdmin';
import EditAdmin from '@/pages/admin/EditAdmin';
import AttendanceList from '@/pages/attendance/AttendanceList';

import LeaveList from '@/pages/leaves/LeaveList';
import DocumentList from '@/pages/documents/DocumentList';

import Reports from '@/pages/reports/Reports';
import TaskList from '@/pages/tasks/TaskList';
import Profile from '@/pages/profile/Profile';
import Settings from '@/pages/settings/Settings';
import HolidayList from '@/pages/holidays/HolidayList';
import Shifts from '@/pages/settings/Shifts';
import PayrollAdmin from '@/pages/payroll/PayrollAdmin';
import OvertimeList from '@/pages/overtime/OvertimeList';
import AuditLogs from '@/pages/audit/AuditLogs';
import Lifecycle from '@/pages/lifecycle/Lifecycle';
import Assets from '@/pages/assets/Assets';
import EntityList from '@/pages/entities/EntityList';
import EntityRecords from '@/pages/entities/EntityRecords';
import { useAuth } from '@/context/AuthContext';
import DashboardLayout from './components/layout/DashboardLayout';

function PrivateRoute() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return <div>Loading...</div>; // Or a proper spinner

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}

function SuperAdminRoute() {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;

  const isSuperAdmin = user?.roles?.some((r: any) => r?.name === 'Super Admin');

  return isSuperAdmin ? <Outlet /> : <Navigate to="/dashboard" replace />;
}

function AdminRoute() {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;

  const isAdminOrSuper = user?.roles?.some((r: any) => r?.name === 'Super Admin' || r?.name === 'Admin');

  return isAdminOrSuper ? <Outlet /> : <Navigate to="/dashboard" replace />;
}

function PublicRoute() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return <div>Loading...</div>;

  return !isAuthenticated ? <Outlet /> : <Navigate to="/dashboard" replace />;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
        </Route>

        <Route element={<PrivateRoute />}>
          <Route element={<DashboardLayout />}>
            {/* Employee/Standard Access */}
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/attendance" element={<AttendanceList />} />
            <Route path="/leaves" element={<LeaveList />} />
            <Route path="/tasks" element={<TaskList />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/documents" element={<DocumentList />} />
            <Route path="/holidays" element={<HolidayList />} />

            {/* Admin & Super Admin Access */}
            <Route element={<AdminRoute />}>
              <Route path="/employees" element={<EmployeeList />} />
              <Route path="/employees/create" element={<CreateEmployee />} />
              <Route path="/employees/edit/:id" element={<EditEmployee />} />
              <Route path="/employees/:id" element={<ViewEmployee />} />
              
              <Route path="/reports" element={<Reports />} />
              <Route path="/notices" element={<Navigate to="/dashboard" replace />} />
              <Route path="/payroll" element={<PayrollAdmin />} />
              <Route path="/overtime" element={<OvertimeList />} />
              <Route path="/lifecycle" element={<Lifecycle />} />
              <Route path="/assets" element={<Assets />} />
              <Route path="/entities" element={<EntityList />} />
              <Route path="/entities/:slug" element={<EntityRecords />} />
            </Route>

            {/* Super Admin Only Access */}
            <Route element={<SuperAdminRoute />}>
              <Route path="/admins" element={<AdminList />} />
              <Route path="/admins/create" element={<CreateAdmin />} />
              <Route path="/admins/edit/:id" element={<EditAdmin />} />

              <Route path="/settings" element={<Settings />} />
              <Route path="/settings/shifts" element={<Shifts />} />
              <Route path="/audit-logs" element={<AuditLogs />} />
            </Route>
          </Route>
        </Route>

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

export default App;

import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import Login from '@/pages/auth/Login';
import ForgotPassword from '@/pages/auth/ForgotPassword';
import Dashboard from '@/pages/dashboard/Dashboard';
import EmployeeList from '@/pages/employees/EmployeeList';
import CreateEmployee from '@/pages/employees/CreateEmployee';
import EditEmployee from '@/pages/employees/EditEmployee';
import ViewEmployee from '@/pages/employees/ViewEmployee';

import RolesList from './pages/admin/RolesList';
import PermissionManagement from './pages/admin/PermissionManagement';
import AccessManagement from './pages/admin/AccessManagement';
import AdminList from '@/pages/admin/AdminList';
import CreateAdmin from '@/pages/admin/CreateAdmin';
import EditAdmin from '@/pages/admin/EditAdmin';

import RoleSelection from '@/pages/auth/RoleSelection';

import AttendanceList from '@/pages/attendance/AttendanceList';
import Departments from '@/pages/departments/Departments';

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
import { useAuth } from '@/context/AuthContext';
import DashboardLayout from './components/layout/DashboardLayout';

function PrivateRoute() {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) return <div>Loading...</div>; // Or a proper spinner

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  // Enforce role selection if they have multiple roles but haven't selected one
  const location = useLocation();
  const path = location.pathname;
  if (user && !user.active_role && user.roles && user.roles.length > 1 && path !== '/select-role') {
      return <Navigate to="/select-role" replace />;
  }

  return <Outlet />;
}

function SuperAdminRoute() {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;

  const isSuperAdmin = user?.active_role?.is_super_admin || user?.active_role?.name === 'Super Admin';

  return isSuperAdmin ? <Outlet /> : <Navigate to="/dashboard" replace />;
}

function PermissionRoute({ permission }: { permission: string }) {
  const { user, loading, hasPermission } = useAuth();

  if (loading) return <div>Loading...</div>;

  const isSuperAdmin = user?.active_role?.is_super_admin || user?.active_role?.name === 'Super Admin';
  const allowed = isSuperAdmin || hasPermission(permission);

  return allowed ? <Outlet /> : <Navigate to="/dashboard" replace />;
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
          <Route path="/select-role" element={<RoleSelection />} />
          <Route element={<DashboardLayout />}>
            {/* Employee/Standard Access */}
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/attendance" element={<AttendanceList />} />
            <Route path="/leaves" element={<LeaveList />} />
            <Route path="/tasks" element={<TaskList />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/documents" element={<DocumentList />} />
            <Route path="/holidays" element={<HolidayList />} />

            {/* Permission-Based Operations */}
            <Route element={<PermissionRoute permission="employees.view" />}>
              <Route path="/employees" element={<EmployeeList />} />
              <Route path="/employees/:id" element={<ViewEmployee />} />
            </Route>
            <Route element={<PermissionRoute permission="employees.create" />}>
              <Route path="/employees/create" element={<CreateEmployee />} />
            </Route>
            <Route element={<PermissionRoute permission="employees.edit" />}>
              <Route path="/employees/edit/:id" element={<EditEmployee />} />
            </Route>
            <Route element={<PermissionRoute permission="departments.view" />}>
              <Route path="/departments" element={<Departments />} />
            </Route>
            <Route element={<PermissionRoute permission="reports.view" />}>
              <Route path="/reports" element={<Reports />} />
            </Route>
            <Route element={<PermissionRoute permission="payroll.view" />}>
              <Route path="/payroll" element={<PayrollAdmin />} />
            </Route>
            <Route element={<PermissionRoute permission="overtime.view" />}>
              <Route path="/overtime" element={<OvertimeList />} />
            </Route>
            <Route element={<PermissionRoute permission="contracts.view" />}>
              <Route path="/lifecycle" element={<Lifecycle />} />
            </Route>
            <Route element={<PermissionRoute permission="assets.view" />}>
              <Route path="/assets" element={<Assets />} />
            </Route>
            <Route path="/notices" element={<Navigate to="/dashboard" replace />} />

            {/* Super Admin Only Access */}
            <Route element={<SuperAdminRoute />}>
              <Route path="/admins" element={<AdminList />} />
              <Route path="/admins/create" element={<CreateAdmin />} />
              <Route path="/admins/edit/:id" element={<EditAdmin />} />
              <Route path="/roles" element={<RolesList />} />
              <Route path="/permissions" element={<PermissionManagement />} />
              <Route element={<PermissionRoute permission="access_management.view" />}>
                  <Route path="/access-management" element={<AccessManagement />} />
                  <Route path="/access-management/:employeeId" element={<AccessManagement />} />
              </Route>

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

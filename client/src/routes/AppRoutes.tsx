import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import Login from '@/pages/Login';
import Signup from '@/pages/Signup';
import Dashboard from '@/pages/Dashboard';
import Board from '@/pages/Board';
import AssignedToMe from '@/pages/AssignedToMe';
import CreatedByMe from '@/pages/CreatedByMe';
import Activity from '@/pages/Activity';
import Settings from '@/pages/Settings';
import DashboardLayout from '@/components/layout/DashboardLayout';
import BoardLayout from '@/components/layout/BoardLayout';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
    <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />

    {/* Wrapped Routes with Sidebar Layout */}
    <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/assigned" element={<AssignedToMe />} />
      <Route path="/created" element={<CreatedByMe />} />
      <Route path="/activity" element={<Activity />} />
      <Route path="/settings" element={<Settings />} />
    </Route>

    <Route element={<ProtectedRoute><BoardLayout /></ProtectedRoute>}>
      <Route path="/board/:boardId" element={<Board />} />
    </Route>

    <Route path="/" element={<Navigate to="/dashboard" replace />} />
    <Route path="*" element={<Navigate to="/dashboard" replace />} />
  </Routes>
);

export default AppRoutes;

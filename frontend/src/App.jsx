import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import AppLayout from './components/layout/AppLayout';

import AuthPage from './pages/auth/AuthPage';

import RiderDashboard from './pages/rider/RiderDashboard';
import RiderBooking from './pages/rider/RiderBooking';
import RiderHistory from './pages/rider/RiderHistory';
import RiderProfile from './pages/rider/RiderProfile';
import PaymentsPage from './pages/rider/PaymentsPage';

import DriverDashboard from './pages/driver/DriverDashboard';
import DriverOnboarding from './pages/driver/DriverOnboarding';
import DriverHistory from './pages/driver/DriverHistory';
import DriverProfile from './pages/driver/DriverProfile';

import AdminDashboard from './pages/admin/AdminDashboard';

function ProtectedRoute({ children, roles }) {
  const token = localStorage.getItem('accessToken');
  const role = localStorage.getItem('role');
  if (!token) return <Navigate to="/auth" replace />;
  if (roles && !roles.includes(role)) {
    // Redirect to correct role path instead of auth
    if (role === 'RIDER') return <Navigate to="/rider" replace />;
    if (role === 'DRIVER') return <Navigate to="/driver" replace />;
    if (role === 'ADMIN') return <Navigate to="/admin" replace />;
    return <Navigate to="/auth" replace />;
  }
  return children;
}

function RoleRedirect() {
  const { user } = useSelector(s => s.auth);
  const role = user?.role || localStorage.getItem('role');
  const token = localStorage.getItem('accessToken');
  if (!token) return <Navigate to="/auth" replace />;
  if (role === 'RIDER') return <Navigate to="/rider" replace />;
  if (role === 'DRIVER') return <Navigate to="/driver" replace />;
  if (role === 'ADMIN') return <Navigate to="/admin" replace />;
  return <Navigate to="/auth" replace />;
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/" element={<RoleRedirect />} />

        {/* RIDER routes */}
        <Route path="/rider" element={
          <ProtectedRoute roles={['RIDER']}>
            <AppLayout role="RIDER" />
          </ProtectedRoute>
        }>
          <Route index element={<RiderDashboard />} />
          <Route path="book" element={<RiderBooking />} />
          <Route path="history" element={<RiderHistory />} />
          <Route path="profile" element={<RiderProfile />} />
          <Route path="payments" element={<PaymentsPage />} />
        </Route>

        {/* DRIVER routes */}
        <Route path="/driver" element={
          <ProtectedRoute roles={['DRIVER']}>
            <AppLayout role="DRIVER" />
          </ProtectedRoute>
        }>
          <Route index element={<DriverDashboard />} />
          <Route path="onboarding" element={<DriverOnboarding />} />
          <Route path="history" element={<DriverHistory />} />
          <Route path="profile" element={<DriverProfile />} />
          <Route path="payments" element={<PaymentsPage />} />
        </Route>

        {/* ADMIN routes */}
        <Route path="/admin" element={
          <ProtectedRoute roles={['ADMIN']}>
            <AppLayout role="ADMIN" />
          </ProtectedRoute>
        }>
          <Route index element={<AdminDashboard />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

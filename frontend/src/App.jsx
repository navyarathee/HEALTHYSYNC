import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import PublicLayout from './layouts/PublicLayout';
import AuthenticatedLayout from './layouts/AuthenticatedLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Records from './pages/Records';
import ConsentManagement from './pages/ConsentManagement';
import AuditLog from './pages/AuditLog';
import Appointments from './pages/Appointments';
import Timeline from './pages/Timeline';
import CollaborationNotes from './pages/CollaborationNotes';
import SecuritySettings from './pages/SecuritySettings';
import AdminDashboard from './pages/AdminDashboard';
import Notifications from './pages/Notifications';
import ProviderDirectory from './pages/ProviderDirectory';
import Forbidden from './pages/Forbidden';

// Redirect authenticated users away from login/register
const PublicOnlyRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

const App = () => {
  return (
    <ErrorBoundary>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* ── Public Routes ──────────────────────── */}
          <Route
            element={
              <PublicOnlyRoute>
                <PublicLayout />
              </PublicOnlyRoute>
            }
          >
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Route>

          {/* ── Authenticated Routes ───────────────── */}
          <Route
            element={
              <ProtectedRoute>
                <AuthenticatedLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route
              path="/profile"
              element={
                <ProtectedRoute allowedRoles={['PATIENT', 'PROVIDER']}>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route path="/records" element={<Records />} />
            <Route path="/appointments" element={<Appointments />} />
            <Route
              path="/timeline"
              element={
                <ProtectedRoute allowedRoles={['PATIENT', 'PROVIDER']}>
                  <Timeline />
                </ProtectedRoute>
              }
            />
            <Route
              path="/consent"
              element={
                <ProtectedRoute allowedRoles={['PATIENT']}>
                  <ConsentManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/audit-log"
              element={
                <ProtectedRoute allowedRoles={['PATIENT']}>
                  <AuditLog />
                </ProtectedRoute>
              }
            />
            <Route
              path="/collab-notes"
              element={
                <ProtectedRoute allowedRoles={['PATIENT', 'PROVIDER']}>
                  <CollaborationNotes />
                </ProtectedRoute>
              }
            />
            <Route path="/security" element={<SecuritySettings />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route
              path="/providers"
              element={
                <ProtectedRoute allowedRoles={['PATIENT']}>
                  <ProviderDirectory />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/system-health"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* ── Forbidden ──────────────────────────── */}
          <Route path="/forbidden" element={<Forbidden />} />

          {/* ── Fallback ───────────────────────────── */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;


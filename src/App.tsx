import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { SocketProvider } from './hooks/useSocket';
import { Header } from './components/common/Header';
import { Sidebar } from './components/common/Sidebar';
import { BottomNav } from './components/common/BottomNav';
import { UrgentPingModal } from './components/common/UrgentPingModal';

// Pages
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Employees } from './pages/Employees';
import { LiveMapPage } from './pages/LiveMapPage';
import { LocationHistoryPage } from './pages/LocationHistoryPage';
import { ChatsPage } from './pages/ChatsPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { MigrationsPage } from './pages/MigrationsPage';
import { EmployeeHome } from './pages/employee/EmployeeHome';
import { EmployeeLocation } from './pages/employee/EmployeeLocation';
import { EmployeeProfile } from './pages/employee/EmployeeProfile';

const ProtectedLayout: React.FC<{ children: React.ReactNode; adminOnly?: boolean }> = ({
  children,
  adminOnly = false,
}) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-background text-foreground">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#091D3C] text-amber-400 animate-pulse border border-amber-500/40">
          <span className="text-xl font-bold">SM</span>
        </div>
        <p className="mt-3 text-xs text-muted-foreground font-medium">
          Loading Staff Monitoring Portal...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/home" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
      <BottomNav />
      <UrgentPingModal />
    </div>
  );
};

const RootRedirect: React.FC = () => {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return isAdmin ? <Navigate to="/dashboard" replace /> : <Navigate to="/home" replace />;
};

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            {/* Root Redirect */}
            <Route path="/" element={<RootRedirect />} />

            {/* Admin Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedLayout adminOnly>
                  <Dashboard />
                </ProtectedLayout>
              }
            />
            <Route
              path="/employees"
              element={
                <ProtectedLayout adminOnly>
                  <Employees />
                </ProtectedLayout>
              }
            />
            <Route
              path="/history"
              element={
                <ProtectedLayout adminOnly>
                  <LocationHistoryPage />
                </ProtectedLayout>
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedLayout adminOnly>
                  <ReportsPage />
                </ProtectedLayout>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedLayout adminOnly>
                  <SettingsPage />
                </ProtectedLayout>
              }
            />
            <Route
              path="/migrations"
              element={
                <ProtectedLayout adminOnly>
                  <MigrationsPage />
                </ProtectedLayout>
              }
            />

            {/* Shared Routes (Admin & Employee) */}
            <Route
              path="/map"
              element={
                <ProtectedLayout>
                  <LiveMapPage />
                </ProtectedLayout>
              }
            />
            <Route
              path="/chats"
              element={
                <ProtectedLayout>
                  <ChatsPage />
                </ProtectedLayout>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedLayout>
                  <EmployeeProfile />
                </ProtectedLayout>
              }
            />

            {/* Employee Specific Routes */}
            <Route
              path="/home"
              element={
                <ProtectedLayout>
                  <EmployeeHome />
                </ProtectedLayout>
              }
            />
            <Route
              path="/my-location"
              element={
                <ProtectedLayout>
                  <EmployeeLocation />
                </ProtectedLayout>
              }
            />
            <Route
              path="/my-history"
              element={
                <ProtectedLayout>
                  <LocationHistoryPage />
                </ProtectedLayout>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<RootRedirect />} />
          </Routes>
        </BrowserRouter>
      </SocketProvider>
    </AuthProvider>
  );
}

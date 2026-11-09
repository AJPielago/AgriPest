import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';

import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { LoadingSpinner } from './components/ui/LoadingSpinner';

import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { DetectPest } from './pages/DetectPest';
import { DetectionHistory } from './pages/DetectionHistory';
import { PestLibrary } from './pages/PestLibrary';
import { DiseaseLibrary } from './pages/DiseaseLibrary';
import { FarmMonitoring } from './pages/FarmMonitoring';
import { Crops } from './pages/Crops';
import { CropDetails } from './pages/CropDetails';
import { Reports } from './pages/Reports';
import { Notifications } from './pages/Notifications';
import { Settings } from './pages/Settings';

import { AdminDashboard } from './pages/admin/AdminDashboard';
import { ManageUsers } from './pages/admin/ManageUsers';
import { ManageCrops } from './pages/admin/ManageCrops';
import { ManagePests } from './pages/admin/ManagePests';
import { ManageDiseases } from './pages/admin/ManageDiseases';
import { AuditLogs } from './pages/admin/AuditLogs';

// Protected Route Guard for Farmers & Admins
const RequireAuth = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner label="Authenticating platform session..." size="lg" />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

// Protected Route Guard for Administrators Only
const RequireAdmin = ({ children }) => {
  const { user, loading, isAdmin } = useAuth();
  if (loading) return <LoadingSpinner label="Checking administrative permissions..." size="lg" />;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return children;
};

export const App = () => {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <ThemeProvider>
      <LanguageProvider>
        <div className="min-h-screen app-viewport flex font-sans antialiased bg-surface text-on-surface transition-colors duration-200">
          
          {/* Sidebar for authenticated users */}
          {user && (
            <Sidebar
              isOpen={sidebarOpen}
              onClose={() => setSidebarOpen(false)}
            />
          )}

          {/* Main Content Viewport */}
          <div className={`flex-1 flex flex-col min-w-0 transition-all duration-200 ${
            user ? 'md:ml-60' : ''
          }`}>
            {user && (
              <Header
                onOpenSidebar={() => setSidebarOpen(true)}
              />
            )}

            <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
              <Routes>
                {/* Public Auth Routes */}
                <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
                <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <Register />} />

                {/* Operations Routes */}
                <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
                <Route path="/detect" element={<RequireAuth><DetectPest /></RequireAuth>} />
                <Route path="/monitoring" element={<RequireAuth><FarmMonitoring /></RequireAuth>} />
                <Route path="/crops" element={<RequireAuth><Crops /></RequireAuth>} />
                <Route path="/crops/:id" element={<RequireAuth><CropDetails /></RequireAuth>} />
                <Route path="/reports" element={<RequireAuth><Reports /></RequireAuth>} />
                <Route path="/notifications" element={<RequireAuth><Notifications /></RequireAuth>} />
                <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />
                <Route path="/history" element={<RequireAuth><DetectionHistory /></RequireAuth>} />
                <Route path="/pests" element={<RequireAuth><PestLibrary /></RequireAuth>} />
                <Route path="/library" element={<RequireAuth><PestLibrary /></RequireAuth>} />
                <Route path="/diseases" element={<RequireAuth><DiseaseLibrary /></RequireAuth>} />
                <Route path="/disease-catalog" element={<RequireAuth><DiseaseLibrary /></RequireAuth>} />

                {/* Administration Routes */}
                <Route path="/admin" element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />
                <Route path="/admin/users" element={<RequireAdmin><ManageUsers /></RequireAdmin>} />
                <Route path="/admin/crops" element={<RequireAdmin><ManageCrops /></RequireAdmin>} />
                <Route path="/admin/pests" element={<RequireAdmin><ManagePests /></RequireAdmin>} />
                <Route path="/admin/diseases" element={<RequireAdmin><ManageDiseases /></RequireAdmin>} />
                <Route path="/admin/audit" element={<RequireAdmin><AuditLogs /></RequireAdmin>} />

                {/* Fallback Redirect */}
                <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} replace />} />
              </Routes>
            </main>
          </div>

        </div>
      </LanguageProvider>
    </ThemeProvider>
  );
};

export default App;

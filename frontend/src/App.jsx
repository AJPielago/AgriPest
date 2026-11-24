import React, { useState, Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';

import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { LoadingSpinner } from './components/ui/LoadingSpinner';

import { Login } from './pages/Login';
import { Register } from './pages/Register';

const lazyNamed = (importer, exportName) =>
  lazy(() => importer().then((m) => ({ default: m[exportName] })));

const Dashboard = lazyNamed(() => import('./pages/Dashboard'), 'Dashboard');
const DetectPest = lazyNamed(() => import('./pages/DetectPest'), 'DetectPest');
const DetectionHistory = lazyNamed(() => import('./pages/DetectionHistory'), 'DetectionHistory');
const PestLibrary = lazyNamed(() => import('./pages/PestLibrary'), 'PestLibrary');
const DiseaseLibrary = lazyNamed(() => import('./pages/DiseaseLibrary'), 'DiseaseLibrary');
const FarmMonitoring = lazyNamed(() => import('./pages/FarmMonitoring'), 'FarmMonitoring');
const Crops = lazyNamed(() => import('./pages/Crops'), 'Crops');
const CropDetails = lazyNamed(() => import('./pages/CropDetails'), 'CropDetails');
const Reports = lazyNamed(() => import('./pages/Reports'), 'Reports');
const Notifications = lazyNamed(() => import('./pages/Notifications'), 'Notifications');
const Settings = lazyNamed(() => import('./pages/Settings'), 'Settings');

const AdminDashboard = lazyNamed(() => import('./pages/admin/AdminDashboard'), 'AdminDashboard');
const ManageUsers = lazyNamed(() => import('./pages/admin/ManageUsers'), 'ManageUsers');
const ManageCrops = lazyNamed(() => import('./pages/admin/ManageCrops'), 'ManageCrops');
const ManagePests = lazyNamed(() => import('./pages/admin/ManagePests'), 'ManagePests');
const ManageDiseases = lazyNamed(() => import('./pages/admin/ManageDiseases'), 'ManageDiseases');
const AuditLogs = lazyNamed(() => import('./pages/admin/AuditLogs'), 'AuditLogs');

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
              <Suspense fallback={<LoadingSpinner label="Loading workspace view..." size="lg" />}>
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
              </Suspense>
            </main>
          </div>

        </div>
      </LanguageProvider>
    </ThemeProvider>
  );
};

export default App;

import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { ExecutiveDashboard } from './pages/ExecutiveDashboard';
import { ProjectionsDashboard } from './pages/ProjectionsDashboard';
import { SettingsPage } from './pages/SettingsPage';
import { ReportsPage } from './pages/ReportsPage';
import { SmartPrepPage } from './pages/SmartPrepPage';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { WeeklyPriceInput } from './pages/WeeklyPriceInput';
import WastePage from './pages/WastePage';
import { ForecastPage } from './pages/ForecastPage';
import { Landing } from './pages/Landing';
import { DeliveryPage } from './pages/DeliveryPage';
import { ExecutiveAnalyst } from './pages/ExecutiveAnalyst';
import { CompanySelector } from './pages/CompanySelector';
import { SaaSAdminDashboard } from './pages/SaaSAdminDashboard';
import { OwnerTerminal } from './pages/OwnerTerminal';
import { CommandCenter } from './pages/CommandCenter';
import { CompanySettings } from './pages/CompanySettings';
import { CFOReport } from './pages/CFOReport';
import { TrainingPage } from './pages/TrainingPage';

import { DashboardLayout } from './components/layouts/DashboardLayout';

// Protected Route Wrapper
const ProtectedRoute = () => {
    const { user, selectedCompany } = useAuth();
    if (!user) return <Navigate to="/login" replace />;

    // If director/admin but no company selected, go to selector (except for the selector itself and SaaS admin)
    const isOwnerRole = user.role === 'director' || user.role === 'admin';
    const path = window.location.pathname;

    if (isOwnerRole && !selectedCompany && path !== '/select-company' && path !== '/saas-admin' && path !== '/owner-terminal') {
        return <Navigate to="/select-company" replace />;
    }

    return (
        <DashboardLayout>
            <Outlet />
        </DashboardLayout>
    );
};

function AppContent() {
    useEffect(() => {
        console.log("Brasa App Initialized - Build: " + new Date().toISOString());
    }, []);

    return (
        <BrowserRouter>
            <ChangePasswordModal />
            <Routes>
                <Route path="/" element={<Login />} />
                <Route path="/landing" element={<Landing />} />
                <Route path="/login" element={<Login />} />
                <Route path="/select-company" element={<ProtectedRoute />}>
                    <Route index element={<CompanySelector />} />
                </Route>
                <Route path="/saas-admin" element={<ProtectedRoute />}>
                    <Route index element={<SaaSAdminDashboard />} />
                </Route>
                <Route path="/owner-terminal" element={<ProtectedRoute />}>
                    <Route index element={<OwnerTerminal />} />
                </Route>

                <Route element={<ProtectedRoute />}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/dashboard/:storeId" element={<Dashboard />} />
                    <Route path="/projections" element={<ProjectionsDashboard />} />
                    <Route path="/inventory" element={<PlaceholderPage title="Inventory Management" />} />
                    <Route path="/reports" element={<ReportsPage />} />
                    <Route path="/prices" element={<WeeklyPriceInput />} />
                    <Route path="/users" element={<PlaceholderPage title="User Administration" />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="/settings/company" element={<CompanySettings />} />
                    <Route path="/export" element={<PlaceholderPage title="Data Export" />} />
                    <Route path="/smart-prep" element={<SmartPrepPage />} />
                    <Route path="/delivery" element={<DeliveryPage />} />
                    <Route path="/waste" element={<WastePage />} />
                    <Route path="/forecast" element={<ForecastPage />} />
                    <Route path="/command-center" element={<CommandCenter />} />
                    <Route path="/executive" element={<ExecutiveDashboard />} />
                    <Route path="/executive-analyst" element={<ExecutiveAnalyst />} />
                    <Route path="/cfo-report" element={<CFOReport />} />
                    <Route path="/training" element={<TrainingPage />} />
                </Route>

                {/* Catch all redirect to login */}
                <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
        </BrowserRouter>
    );
}

import { LanguageProvider } from './context/LanguageContext';

function App() {
    return (
        <AuthProvider>
            <LanguageProvider>
                <AppContent />
            </LanguageProvider>
        </AuthProvider>
    );
}

export default App;

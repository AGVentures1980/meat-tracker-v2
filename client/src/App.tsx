import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { ExecutiveDashboard } from './pages/ExecutiveDashboard';
import { ProjectionsDashboard } from './pages/ProjectionsDashboard';

// Protected Route Wrapper
const ProtectedRoute = () => {
    const { user } = useAuth();
    if (!user) return <Navigate to="/login" replace />;
    return <Outlet />;
};



import { ChangePasswordModal } from './components/ChangePasswordModal';

import { WeeklyPriceInput } from './pages/WeeklyPriceInput';

function AppContent() {
    return (
        <BrowserRouter>
            <ChangePasswordModal />
            <Routes>
                <Route path="/login" element={<Login />} />

                <Route element={<ProtectedRoute />}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/dashboard/:storeId" element={<Dashboard />} />
                    <Route path="/projections" element={<ProjectionsDashboard />} />
                    <Route path="/inventory" element={<PlaceholderPage title="Inventory Management" />} />
                    <Route path="/reports" element={<PlaceholderPage title="Reporting Suite" />} />
                    <Route path="/prices" element={<WeeklyPriceInput />} />
                    <Route path="/users" element={<PlaceholderPage title="User Administration" />} />
                    <Route path="/settings" element={<PlaceholderPage title="System Settings" />} />
                    <Route path="/export" element={<PlaceholderPage title="Data Export" />} />
                    <Route path="/executive" element={<ExecutiveDashboard />} />
                    {/* Redirect root to dashboard */}
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                </Route>

                {/* Catch all redirect to login */}
                <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
        </BrowserRouter>
    );
}

function App() {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    );
}

export default App;

import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
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
import { WeeklyInventory } from './pages/WeeklyInventory';
import { IdleTimer } from './components/IdleTimer';
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
import StoreSettings from './pages/StoreSettings';
import { UsersPage } from './pages/UsersPage';
import CFOReport from './pages/CFOReport';
import { TrainingPage } from './pages/TrainingPage';
import { PerformanceDashboard } from './pages/PerformanceDashboard';
import OwnerDashboard from './pages/OwnerDashboard';
import { DataAnalyst } from './pages/DataAnalyst';
import { GovernanceGuard } from './components/GovernanceGuard';
import { SupportHub } from './pages/SupportHub';
import { AdminSupport } from './pages/AdminSupport';
import { EulaAgreement } from './pages/EulaAgreement';
import { IdeaVault } from './pages/IdeaVault';
import { CorpProcurement } from './pages/CorpProcurement';
import { ProcurementShadowDashboard } from './pages/Intelligence/ProcurementShadowDashboard';

// Partner / Reseller Components
import { PartnerLayout } from './components/layouts/PartnerLayout';
import { PartnerDashboard } from './pages/partner/PartnerDashboard';
import { ProposalWizard } from './pages/partner/ProposalWizard';
import { AcceptProposal } from './pages/partner/AcceptProposal';
import { PartnerNetwork } from './pages/admin/PartnerNetwork';
import { PartnerAgreement } from './pages/partner/PartnerAgreement';
import { PartnerTraining } from './pages/partner/PartnerTraining';
import { ContractsVault } from './pages/admin/ContractsVault';

import { DashboardLayout } from './components/layouts/DashboardLayout';

// Protected Route Wrapper
const ProtectedRoute = () => {
    const { user, selectedCompany } = useAuth();
    const location = useLocation();

    if (!user) return <Navigate to="/login" state={{ from: location }} replace />;

    // If director/admin but no company selected, go to selector (except for the selector itself and SaaS admin)
    const isOwnerRole = user.role === 'director' || user.role === 'admin';
    const path = location.pathname;

    const isMaster = user.email.toLowerCase().includes('alexandre@alexgarciaventures.co');

    // Enforce Company Lobby Selection for all global routes
    // Only these extremely low-level SaaS or Owner components bypass the lobby.
    if (isOwnerRole && !selectedCompany &&
        path !== '/select-company' &&
        path !== '/saas-admin' &&
        path !== '/owner-terminal' &&
        path !== '/owner' &&
        path !== '/agv-network' &&
        !path.startsWith('/partner')) {

        // Allow the Master to access the global Vault directly from the Lobby
        if (path === '/vault' && isMaster) {
            // allow bypass
        } else {
            console.log("Redirecting to select-company due to:", { path, isOwnerRole, selectedCompany });
            return <Navigate to="/select-company" replace />;
        }
    }

    // EULA Enforcement: If EULA is not accepted, force them to the agreement page.
    if (!user.eula_accepted && path !== '/eula-agreement') {
        return <Navigate to="/eula-agreement" replace />;
    }

    return (
        <DashboardLayout>
            <Outlet />
        </DashboardLayout>
    );
};

// Extremely light guard just for Master/Executive Routes that shouldn't load DashboardLayout
const MasterGuard = () => {
    const { user } = useAuth();
    const location = useLocation();

    if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
    
    const isMasterOrAdmin = user.email.toLowerCase().includes('alexandre@alexgarciaventures.co');
    
    if (!isMasterOrAdmin) return <Navigate to="/dashboard" replace />;
    
    return <Outlet />;
};

function AppContent() {
    useEffect(() => {
        console.log("Brasa App Initialized - Build: " + new Date().toISOString());
    }, []);

    return (
        <BrowserRouter>
            <IdleTimer />
            <ChangePasswordModal />
            <Routes>
                <Route path="/" element={<Login />} />
                <Route path="/landing" element={<Landing />} />
                <Route path="/login" element={<Login />} />
                <Route path="/eula-agreement" element={<EulaAgreement />} />
                <Route path="/proposal/sign/:id" element={<AcceptProposal />} />
                
                <Route path="/select-company" element={<ProtectedRoute />}>
                    <Route index element={<CompanySelector />} />
                </Route>

                <Route path="/owner-terminal" element={<ProtectedRoute />}>
                    <Route index element={<OwnerTerminal />} />
                </Route>

                <Route path="/saas-admin" element={<ProtectedRoute />}>
                    <Route index element={<SaaSAdminDashboard />} />
                </Route>

                {/* Exclude from normal ProtectedRoute so it skips DashboardLayout requirements */}
                <Route path="/agv-network" element={<MasterGuard />}>
                    <Route index element={
                        <div className="flex bg-[#121212] min-h-screen text-white">
                            <PartnerNetwork />
                        </div>
                    } />
                </Route>
                <Route path="/agv-vault" element={<MasterGuard />}>
                    <Route index element={
                        <div className="flex bg-[#121212] min-h-screen text-white">
                            <ContractsVault />
                        </div>
                    } />
                </Route>

                <Route element={<ProtectedRoute />}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/dashboard/:storeId" element={<Dashboard />} />
                    <Route path="/projections" element={<GovernanceGuard><ProjectionsDashboard /></GovernanceGuard>} />
                    <Route path="/inventory" element={<GovernanceGuard><WeeklyInventory /></GovernanceGuard>} />
                    <Route path="/reports" element={<GovernanceGuard><ReportsPage /></GovernanceGuard>} />
                    <Route path="/prices" element={<WeeklyPriceInput />} />
                    <Route path="/users" element={<UsersPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="/settings/company" element={<CompanySettings />} />
                    <Route path="/settings/store" element={<StoreSettings />} />
                    <Route path="/export" element={<PlaceholderPage title="Data Export" />} />
                    <Route path="/smart-prep" element={<GovernanceGuard><SmartPrepPage /></GovernanceGuard>} />
                    <Route path="/delivery" element={<DeliveryPage />} />
                    <Route path="/waste" element={<WastePage />} />
                    <Route path="/forecast" element={<GovernanceGuard><ForecastPage /></GovernanceGuard>} />
                    <Route path="/command-center" element={<CommandCenter />} />
                    <Route path="/executive" element={<ExecutiveDashboard />} />
                    <Route path="/executive-analyst" element={<ExecutiveAnalyst />} />
                    <Route path="/cfo-report" element={<CFOReport />} />
                    <Route path="/training" element={<TrainingPage />} />
                    <Route path="/audit" element={<PerformanceDashboard />} />
                    <Route path="/data-analyst" element={<DataAnalyst />} />
                    <Route path="/owner" element={<OwnerDashboard />} />
                    <Route path="/admin-support" element={<AdminSupport />} />
                    <Route path="/procurement" element={<CorpProcurement />} />
                    <Route path="/intelligence/procurement-shadow" element={<ProcurementShadowDashboard />} />
                    <Route path="/support" element={<SupportHub />} />
                    <Route path="/vault" element={<IdeaVault />} />
                </Route>

                {/* Partner / Reseller Isolated Portal */}
                <Route path="/partner" element={<PartnerLayout />}>
                    <Route index element={<PartnerDashboard />} />
                    <Route path="dashboard" element={<PartnerDashboard />} />
                    <Route path="proposal/new" element={<ProposalWizard />} />
                    <Route path="onboarding/agreement" element={<PartnerAgreement />} />
                    <Route path="onboarding/training" element={<PartnerTraining />} />
                </Route>

                {/* Catch all redirect to login */}
                <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
        </BrowserRouter>
    );
}

import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';

function App() {
    return (
        <ThemeProvider>
            <AuthProvider>
                <LanguageProvider>
                    <AppContent />
                </LanguageProvider>
            </AuthProvider>
        </ThemeProvider>
    );
}

export default App;
console.log('Force Build Wipe: VERSION 2.1.4');

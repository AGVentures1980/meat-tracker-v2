import React, { useEffect, useState } from 'react';
import { Outlet, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LogOut, Globe } from 'lucide-react';

export const PartnerLayout: React.FC = () => {
    const { user, logout, isLoading } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const API_URL = (import.meta as any).env.VITE_API_URL || '';

    const [partnerProfile, setPartnerProfile] = useState<any>(null);
    const [loadingProfile, setLoadingProfile] = useState(true);

    // Zero-Regression Guarantee: Allow 'partner', 'admin', and 'director' roles
    const isMasterOrAdmin = user?.role === 'admin' || user?.role === 'director' || user?.email?.toLowerCase() === 'alexandre@alexgarciaventures.co';
    const hasAccess = user?.role === 'partner' || isMasterOrAdmin;

    useEffect(() => {
        const fetchProfile = async () => {
            if (!user || !hasAccess) {
                setLoadingProfile(false);
                return;
            }

            try {
                const res = await fetch(`${API_URL}/api/v1/partner/profile`, {
                    headers: { 'Authorization': `Bearer ${user.token}` }
                });
                const data = await res.json();
                
                if (data.success && data.partner) {
                    setPartnerProfile(data.partner);
                }
            } catch (err) {
                console.error("Partner Onboarding Check Error:", err);
            } finally {
                setLoadingProfile(false);
            }
        };

        if (!isLoading) {
            fetchProfile();
        }
    }, [user, hasAccess, isLoading, API_URL]);

    if (isLoading || loadingProfile) {
        return <div className="min-h-screen bg-[#050505] flex items-center justify-center text-emerald-500 font-mono">Verifying Access Level...</div>;
    }

    if (!user || !hasAccess) {
        console.log("PartnerLayout Redirect - User:", user?.email, "Role:", user?.role, "HasAccess:", hasAccess);
        return <Navigate to="/dashboard" replace />;
    }

    // ONBOARDING INTERCEPTOR
    const currentPath = location.pathname;
    
    // Pass if they are already on the specific step to avoid redirect loops
    const NeedsAgreement = !partnerProfile?.agreement_signed_at;
    const NeedsTraining = partnerProfile?.agreement_signed_at && !partnerProfile?.training_completed_at;

    if (NeedsAgreement && !currentPath.includes('/onboarding/agreement')) {
        return <Navigate to="/partner/onboarding/agreement" replace />;
    }

    if (NeedsTraining && !currentPath.includes('/onboarding/training')) {
        return <Navigate to="/partner/onboarding/training" replace />;
    }

    return (
        <div className="min-h-screen bg-[#050505] text-gray-200 font-sans flex flex-col">
            {/* Minimalist Partner Header */}
            <header className="h-16 border-b border-gray-800 bg-[#0a0a0a] flex items-center justify-between px-6 shrink-0">
                <div className="flex items-center gap-4">
                    <Globe className="w-5 h-5 text-emerald-500" />
                    <h1 className="text-lg font-semibold tracking-wide text-white">AGV Partner Network</h1>
                </div>
                
                <div className="flex items-center gap-6">
                    <span className="text-sm text-gray-400">
                        {user.first_name} {user.last_name}
                    </span>
                    <button 
                        onClick={logout}
                        className="text-gray-400 hover:text-red-400 transition-colors"
                        title="Sign Out"
                    >
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto p-8">
                <div className="mx-auto max-w-6xl">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

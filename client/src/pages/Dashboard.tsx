import React from 'react';
import { useAuth } from '../context/AuthContext';
import { resolveDashboardView } from '../utils/dashboardScopeResolver';

import { ExecutiveDashboardContainer } from '../components/dashboard/containers/ExecutiveDashboardContainer';
import { RegionalDashboardContainer } from '../components/dashboard/containers/RegionalDashboardContainer';
import { StoreDashboardContainer } from '../components/dashboard/containers/StoreDashboardContainer';

export const Dashboard = () => {
    const { user, selectedCompany } = useAuth();
    const selectedStore = user?.storeId || null;

    // 1. Resolve View and Cache Policy Exception
    const { view, isolationKey, errorMessage } = resolveDashboardView({
        user,
        selectedCompany,
        selectedStore
    });

    // 2. FAIL-CLOSED Logic Mapped from Resolver
    if (view === 'AWAITING_TENANT') {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-[#121212] flex-col gap-4">
                <div className="text-[#C5A059] text-lg font-mono tracking-widest font-bold">AWAITING TENANT CONTEXT</div>
                <div className="text-gray-500 font-mono text-xs uppercase tracking-widest">Please select an organization to initialize dashboard.</div>
            </div>
        );
    }

    if (view === 'UNAUTHORIZED') {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-[#121212] flex-col gap-4">
                <div className="text-[#FF2A6D] text-lg font-mono tracking-widest font-bold">UNAUTHORIZED SCOPE RESOLUTION</div>
                <div className="text-gray-500 font-mono text-xs max-w-lg text-center uppercase tracking-widest">
                    ERR: {errorMessage || 'Identity profile mismatch. Contact SRE.'}
                </div>
            </div>
        );
    }

    // 3. ROLE-BASED RENDERING WITH CACHE/STATE ISOLATION
    // By providing the `key` prop computed by the resolver, React structurally guarantees 
    // that no DOM, state, or cache bleeds between tenants, stores, or scopes.
    if (view === 'EXECUTIVE') {
        return <ExecutiveDashboardContainer key={isolationKey} />;
    }

    if (view === 'REGIONAL') {
        return <RegionalDashboardContainer key={isolationKey} />;
    }

    if (view === 'STORE') {
        return <StoreDashboardContainer key={isolationKey} />;
    }

    return null; // Impossível de atingir pelo fail-closed do resolver
};

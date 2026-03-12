import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LogOut, Globe } from 'lucide-react';

export const PartnerLayout: React.FC = () => {
    const { user, logout } = useAuth();

    // Zero-Regression Guarantee: Only the 'partner' role can ever render this wrapper.
    if (!user || user.role !== 'partner') {
        return <Navigate to="/login" replace />;
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

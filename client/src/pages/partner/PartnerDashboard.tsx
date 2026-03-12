import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DollarSign, Building2, FileSignature, TrendingUp, AlertCircle, GraduationCap } from 'lucide-react';

export const PartnerDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [stats] = useState({
        totalClients: 0,
        activeMRR: 0,
        ytdPayouts: 0,
        pendingPayouts: 0
    });
    
    // In a real flow, this would fetch from `/api/v1/partner/dashboard`
    // const fetchStats = async () => { ... }

    return (
        <div className="space-y-8 animate-fade-in-up">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-200">
                        Performance Hub
                    </h2>
                    <p className="text-gray-400 mt-2">Manage your global client portfolio and earnings.</p>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={() => navigate('/partner/onboarding/training')}
                        className="flex items-center gap-2 bg-[#111] hover:bg-gray-800 border border-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-all"
                    >
                        <GraduationCap className="w-5 h-5 text-indigo-400" />
                        Partner Academy
                    </button>
                    <button
                        onClick={() => navigate('/partner/proposal/new')}
                        className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white px-6 py-3 rounded-lg font-medium shadow-lg shadow-emerald-900/20 transition-all hover:scale-105"
                    >
                        <Building2 className="w-5 h-5" />
                        Tenant Architect
                    </button>
                </div>
            </div>

            {/* Financial Stat Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard 
                    title="Active MRR" 
                    value={`$${stats.activeMRR.toLocaleString()}`} 
                    subtitle="Monthly Recurring Revenue"
                    icon={<TrendingUp className="w-6 h-6 text-emerald-500" />}
                />
                <StatCard 
                    title="Total Clients" 
                    value={stats.totalClients.toString()} 
                    subtitle="Active network nodes"
                    icon={<Building2 className="w-6 h-6 text-blue-500" />}
                />
                <StatCard 
                    title="YTD Payouts" 
                    value={`$${stats.ytdPayouts.toLocaleString()}`} 
                    subtitle="Cleared to PayPal"
                    icon={<DollarSign className="w-6 h-6 text-green-500" />}
                />
                <StatCard 
                    title="Pending Payouts" 
                    value={`$${stats.pendingPayouts.toLocaleString()}`} 
                    subtitle="Awaiting AGV Release"
                    icon={<AlertCircle className="w-6 h-6 text-amber-500" />}
                />
            </div>

            {/* Recent Activity Table Placeholder */}
            <div className="bg-[#111] border border-gray-800 rounded-xl p-6 shadow-2xl">
                <h3 className="text-xl font-semibold mb-6 flex items-center gap-3">
                    <Building2 className="w-5 h-5 text-indigo-400" />
                    Recent Deployments
                </h3>
                <div className="text-center py-12 text-gray-500 bg-[#0a0a0a] rounded-lg border border-dashed border-gray-800">
                    <p>No organizations provisioned yet.</p>
                    <p className="text-sm mt-2">Click "Tenant Architect" to generate a massive autonomous ecosystem.</p>
                </div>
            </div>
        </div>
    );
};

const StatCard = ({ title, value, subtitle, icon }: any) => (
    <div className="bg-[#111] p-6 rounded-xl border border-gray-800/50 relative overflow-hidden group hover:border-emerald-500/30 transition-colors">
        <div className="absolute top-0 right-0 p-4 opacity-10 blur-[2px] transform group-hover:scale-110 transition-transform">
            {icon}
        </div>
        <div className="flex flex-col relative z-10">
            <span className="text-sm text-gray-400 font-medium mb-1">{title}</span>
            <span className="text-3xl font-bold font-mono tracking-tight text-white mb-2">{value}</span>
            <span className="text-xs text-gray-500">{subtitle}</span>
        </div>
    </div>
);

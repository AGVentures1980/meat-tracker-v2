
import React, { useEffect, useState } from 'react';
import { ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown, DollarSign, Users, Activity } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ExecutiveTargetEditor } from '../ExecutiveTargetEditor';
import { NetworkHealthMatrix } from './NetworkHealthMatrix';

interface CompanyStats {
    period: string;
    summary: {
        total_guests: number;
        net_impact_ytd: number;
        avg_lbs_variance: number;
        status: 'Savings' | 'Loss';
    };
    top_savers: StoreStat[];
    top_spenders: StoreStat[];
    middle_tier: StoreStat[];
}

interface StoreStat {
    id: number;
    name: string;
    location: string;
    guests: number;
    target: number;
    lbsGuestVar: number;
    impactYTD: number;
}

export const ExecutiveSummary = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState<CompanyStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [isEditorOpen, setIsEditorOpen] = useState(false);

    const [matrixData, setMatrixData] = useState<any[]>([]); // New State

    const fetchStats = async () => {
        try {
            setLoading(true);

            // 1. Fetch Summary Stats
            const response = await fetch('/api/v1/dashboard/company-stats', {
                headers: { 'Authorization': `Bearer ${user?.token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setStats(data);
            }

            // 2. Fetch Network Health Matrix (Dashboard 2.0)
            const matrixRes = await fetch('/api/v1/smart-prep/network-health', { // Using existing logic or new controller path
                headers: { 'Authorization': `Bearer ${user?.token}` }
            });
            if (matrixRes.ok) {
                const matrix = await matrixRes.json();
                if (matrix.health_matrix) {
                    setMatrixData(matrix.health_matrix);
                }
            }

        } catch (error) {
            console.error("Failed to fetch executive stats", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            fetchStats();
        }
    }, [user]);

    if (loading && !stats) {
        return <div className="p-8 text-white">Loading Executive Intel...</div>;
    }

    if (!stats) {
        return <div className="p-8 text-white">Failed to load data.</div>;
    }

    const { summary, top_savers, top_spenders } = stats;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">Executive Summary</h2>
                    <p className="text-gray-400 text-sm">Company-wide Performance & Financial Impact</p>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setIsEditorOpen(true)}
                        className="text-sm bg-[#333] hover:bg-[#444] text-white px-3 py-2 rounded border border-[#555] transition-colors"
                    >
                        Edit Targets
                    </button>
                    <div className="flex items-center gap-2 bg-[#1a1a1a] px-4 py-2 rounded border border-[#333]">
                        <span className="text-sm text-gray-400">Period:</span>
                        <span className="text-[#C5A059] font-mono font-bold">{stats.period}</span>
                    </div>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-[#1a1a1a] p-6 rounded border border-[#333]">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-gray-400 text-sm">Net Financial Impact (YTD)</span>
                        <DollarSign className={`w-5 h-5 ${summary.net_impact_ytd >= 0 ? 'text-[#00FF94]' : 'text-[#FF2A6D]'}`} />
                    </div>
                    <div className={`text-3xl font-mono font-bold ${summary.net_impact_ytd >= 0 ? 'text-[#00FF94]' : 'text-[#FF2A6D]'}`}>
                        {summary.net_impact_ytd >= 0 ? '+' : ''}{summary.net_impact_ytd.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                        {summary.status === 'Savings' ? 'Projected Savings' : 'Projected Overspend'}
                    </div>
                </div>

                <div className="bg-[#1a1a1a] p-6 rounded border border-[#333]">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-gray-400 text-sm">Total Guests (Network)</span>
                        <Users className="w-5 h-5 text-[#C5A059]" />
                    </div>
                    <div className="text-3xl font-mono font-bold text-white">
                        {summary.total_guests.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                        Across 55 Locations
                    </div>
                </div>

                <div className="bg-[#1a1a1a] p-6 rounded border border-[#333]">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-gray-400 text-sm">Avg Variance (Lbs/Guest)</span>
                        <Activity className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className={`text-3xl font-mono font-bold ${summary.avg_lbs_variance <= 0 ? 'text-[#00FF94]' : 'text-[#FF2A6D]'}`}>
                        {summary.avg_lbs_variance > 0 ? '+' : ''}{summary.avg_lbs_variance.toFixed(3)}
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                        v.s. Target
                    </div>
                </div>

                <div className="bg-[#1a1a1a] p-6 rounded border border-[#333] flex flex-col justify-center items-center">
                    <div className="text-center">
                        <span className="block text-gray-400 text-xs uppercase tracking-widest mb-1">Company Status</span>
                        <span className={`text-2xl font-bold px-3 py-1 rounded ${summary.status === 'Savings' ? 'bg-[#00FF94]/10 text-[#00FF94]' : 'bg-[#FF2A6D]/10 text-[#FF2A6D]'}`}>
                            {summary.status.toUpperCase()}
                        </span>
                    </div>
                </div>
            </div>

            {/* Dashboard 2.0: Network Health Matrix */}
            <div className="mb-8">
                <NetworkHealthMatrix data={matrixData} loading={loading} />
            </div>

            {/* Top 10 Lists */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Savers (Green) */}
                <div className="bg-[#1a1a1a] rounded border border-[#333] overflow-hidden">
                    <div className="p-4 border-b border-[#333] flex justify-between items-center bg-[#151515]">
                        <h3 className="text-[#00FF94] font-bold flex items-center gap-2">
                            <TrendingUp className="w-4 h-4" /> Top 10 Savers (Efficiency)
                        </h3>
                        <span className="text-xs text-gray-500">Negative Variance = Good</span>
                    </div>
                    <div className="override-scroll overflow-auto max-h-[500px]">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-500 bg-[#222] uppercase font-mono sticky top-0">
                                <tr>
                                    <th className="px-4 py-3">Store</th>
                                    <th className="px-4 py-3 text-right">Target</th>
                                    <th className="px-4 py-3 text-right">Var (Lbs)</th>
                                    <th className="px-4 py-3 text-right">Impact ($)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#333]">
                                {top_savers.map((store) => (
                                    <tr key={store.id} className="hover:bg-white/5">
                                        <td className="px-4 py-3 font-medium text-white">
                                            {store.name} <span className="text-gray-500 text-xs ml-1">({store.location})</span>
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono text-gray-500">
                                            {(store.target || 1.76).toFixed(2)}
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono text-[#00FF94]">
                                            {store.lbsGuestVar.toFixed(3)}
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono text-[#00FF94]">
                                            +{Math.abs(store.impactYTD).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Top Spenders (Red) */}
                <div className="bg-[#1a1a1a] rounded border border-[#333] overflow-hidden">
                    <div className="p-4 border-b border-[#333] flex justify-between items-center bg-[#151515]">
                        <h3 className="text-[#FF2A6D] font-bold flex items-center gap-2">
                            <TrendingDown className="w-4 h-4" /> Top 10 Spenders (Opportunity)
                        </h3>
                        <span className="text-xs text-gray-500">Positive Variance = Over Portioning</span>
                    </div>
                    <div className="override-scroll overflow-auto max-h-[500px]">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-500 bg-[#222] uppercase font-mono sticky top-0">
                                <tr>
                                    <th className="px-4 py-3">Store</th>
                                    <th className="px-4 py-3 text-right">Target</th>
                                    <th className="px-4 py-3 text-right">Var (Lbs)</th>
                                    <th className="px-4 py-3 text-right">Impact ($)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#333]">
                                {top_spenders.map((store) => (
                                    <tr key={store.id} className="hover:bg-white/5">
                                        <td className="px-4 py-3 font-medium text-white">
                                            {store.name} <span className="text-gray-500 text-xs ml-1">({store.location})</span>
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono text-gray-500">
                                            {(store.target || 1.76).toFixed(2)}
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono text-[#FF2A6D]">
                                            +{store.lbsGuestVar.toFixed(3)}
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono text-[#FF2A6D]">
                                            {store.impactYTD.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <ExecutiveTargetEditor
                isOpen={isEditorOpen}
                onClose={() => setIsEditorOpen(false)}
                onSave={fetchStats}
            />
        </div>
    );
};

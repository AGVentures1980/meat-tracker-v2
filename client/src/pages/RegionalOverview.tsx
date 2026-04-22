import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AlertOctagon, TrendingUp, TrendingDown, Minus, ShieldAlert } from 'lucide-react';

interface StoreRankingItem {
    store_id: number;
    store_name: string;
    risk_score: number;
    trend_direction: "UP" | "DOWN" | "FLAT";
    confidence_score: number;
    urgent_actions_count: number;
}

interface AnomalyDistributionItem {
    anomaly_type: string;
    count: number;
    percentage: number;
}

interface RegionalOverviewPayload {
    regional_summary: {
        total_stores: number;
        stores_at_risk: number;
        stores_low_trust: number;
        total_urgent_actions: number;
    };
    store_ranking: StoreRankingItem[];
    anomaly_distribution: AnomalyDistributionItem[];
    regional_trend: {
        direction: "UP" | "DOWN" | "FLAT";
        change_pct: number;
    };
}

export const RegionalOverview = () => {
    const { user, selectedCompany } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<RegionalOverviewPayload | null>(null);

    useEffect(() => {
        const abortController = new AbortController();
        const signal = abortController.signal;

        const fetchRegionalData = async () => {
            if (!user?.token) return;
            try {
                setLoading(true);
                const headers: HeadersInit = { 'Authorization': `Bearer ${user.token}` };
                if (selectedCompany) headers['X-Company-Id'] = selectedCompany;

                const res = await fetch('/api/v1/regional/overview', { headers, signal });
                
                if (!res.ok) {
                    throw new Error(`API Error: ${res.status}`);
                }

                const result = await res.json();

                if (!signal.aborted) {
                    if (result.success && result.data && result.data.regional_summary) {
                        // We do not modify or sort, trust backend strictly.
                        setData(result.data);
                    } else {
                        throw new Error('Regional data unavailable — verify backend integrity');
                    }
                }
            } catch (err: any) {
                if (err.name !== 'AbortError') {
                    console.error('Regional Engine Error:', err);
                    setError(err.message || 'Regional data unavailable — verify backend integrity');
                }
            } finally {
                if (!signal.aborted) setLoading(false);
            }
        };

        fetchRegionalData();
        return () => abortController.abort();
    }, [user?.token, selectedCompany]);

    if (loading) {
        return <div className="p-8 text-[#C5A059] font-mono animate-pulse">Aggregating Regional Tense...</div>;
    }

    if (error || !data) {
        return (
             <div className="flex h-screen w-full items-center justify-center bg-[#121212] flex-col gap-4">
                <div className="text-[#FF2A6D] text-lg font-mono tracking-widest font-bold">MULTIPLE TRACTOR ERROR</div>
                <div className="text-gray-500 font-mono text-xs max-w-lg text-center uppercase tracking-widest p-4 border border-[#FF2A6D]/30 bg-[#FF2A6D]/10">
                    Fail-Closed Protocol Active: Regional Overview Aborted.
                    <br/><br/>
                    <span className="text-[#FF2A6D]">Reason: {error || 'Data Integrity Violation'}</span>
                </div>
            </div>
        );
    }

    const { regional_summary, regional_trend, store_ranking, anomaly_distribution } = data;

    // Filter Stores with Low Trust for separate visualization
    const lowTrustStores = store_ranking.filter(s => s.confidence_score < 65);
    const validStoreRankings = store_ranking; // Display all since UI expects clear ranking. Rule: "Zero sorting front-end". We preserve exact array.

    return (
        <div className="p-6 bg-[#121212] min-h-screen text-white isolation-boundary font-sans">
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#333]">
                <div>
                    <h1 className="text-3xl font-bold text-gray-100">Regional Oversight</h1>
                    <p className="text-xs text-gray-500 font-mono tracking-widest uppercase mt-2">
                         // AREA & COMPANY SCOPE • AGGREGATED RISK & COMPLIANCE TRENDS
                    </p>
                </div>
                <div className="text-right">
                    <div className="text-[10px] text-gray-500 font-mono uppercase">Network Trend (7D)</div>
                    <div className="flex items-center gap-2 justify-end mt-1">
                        {regional_trend.direction === 'UP' && <TrendingUp className="text-[#FF2A6D]" size={20} />}
                        {regional_trend.direction === 'DOWN' && <TrendingDown className="text-[#00FF94]" size={20} />}
                        {regional_trend.direction === 'FLAT' && <Minus className="text-gray-400" size={20} />}
                        
                        <span className={`text-xl font-bold ${
                            regional_trend.direction === 'UP' ? 'text-[#FF2A6D]' : 
                            regional_trend.direction === 'DOWN' ? 'text-[#00FF94]' : 'text-gray-400'
                        }`}>
                            {regional_trend.change_pct}%
                        </span>
                    </div>
                </div>
            </div>

            {/* Top Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-[#1a1a1a] p-5 border border-[#333] rounded flex flex-col justify-center">
                    <div className="text-[10px] text-gray-500 font-mono uppercase mb-1">Total Stores</div>
                    <div className="text-2xl font-bold text-white">{regional_summary.total_stores}</div>
                </div>
                <div className="bg-[#1a1a1a] p-5 border border-[#333] rounded flex flex-col justify-center">
                    <div className="text-[10px] text-[#FF2A6D] font-mono uppercase mb-1 flex items-center gap-2">
                        <AlertOctagon size={12} /> Stores At Risk
                    </div>
                    <div className="text-2xl font-bold text-[#FF2A6D]">{regional_summary.stores_at_risk}</div>
                </div>
                <div className="bg-[#1a1a1a] p-5 border border-[#333] rounded flex flex-col justify-center">
                    <div className="text-[10px] text-[#FF9F1C] font-mono uppercase mb-1">Total Urgent Actions</div>
                    <div className="text-2xl font-bold text-[#FF9F1C]">{regional_summary.total_urgent_actions}</div>
                </div>
                <div className="bg-[#1a1a1a] p-5 border border-[#333] rounded flex flex-col justify-center">
                    <div className="text-[10px] text-gray-500 font-mono uppercase mb-1 flex items-center gap-2">
                         <ShieldAlert size={12} className="text-gray-500" /> Low Data Trust (Suspicious)
                    </div>
                    <div className="text-2xl font-bold text-gray-400">{regional_summary.stores_low_trust}</div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Store Ranking Table */}
                <div className="lg:col-span-2 bg-[#1a1a1a] border border-[#333] rounded flex flex-col">
                    <div className="p-4 border-b border-[#333] bg-[#111]">
                        <h2 className="text-sm font-bold text-[#C5A059] font-mono uppercase tracking-widest">Network Risk Ranking</h2>
                    </div>
                    <div className="flex-1 overflow-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-[#151515] text-[10px] uppercase font-mono text-gray-500 tracking-widest">
                                <tr>
                                    <th className="p-4 py-3 font-normal">Store Name</th>
                                    <th className="p-4 py-3 font-normal">Risk Profile</th>
                                    <th className="p-4 py-3 font-normal">Trend</th>
                                    <th className="p-4 py-3 font-normal">Urgent Actions</th>
                                    <th className="p-4 py-3 font-normal">Data Trust</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#333]">
                                {validStoreRankings.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-gray-500 font-mono">No Stores Found in Area</td>
                                    </tr>
                                )}
                                {validStoreRankings.map((store, idx) => (
                                    <tr key={idx} onClick={() => navigate(`/dashboard/property/${store.store_id}`)} className="hover:bg-[#222] transition-colors cursor-pointer group">
                                        <td className="p-4 text-gray-200 group-hover:text-[#C5A059] transition-colors">
                                            <div className="font-bold">{store.store_name}</div>
                                            <div className="text-[10px] font-mono text-gray-500">ID: {store.store_id}</div>
                                        </td>
                                        <td className="p-4">
                                            <div className={`inline-flex items-center px-2 py-1 border font-mono text-xs font-bold ${
                                                store.risk_score > 50 ? 'border-[#FF2A6D]/50 bg-[#FF2A6D]/10 text-[#FF2A6D]' :
                                                store.risk_score > 20 ? 'border-[#FF9F1C]/50 bg-[#FF9F1C]/10 text-[#FF9F1C]' :
                                                'border-[#00FF94]/50 bg-[#00FF94]/10 text-[#00FF94]'
                                            }`}>
                                                {store.risk_score} PTS
                                            </div>
                                        </td>
                                        <td className="p-4 text-center">
                                            {store.trend_direction === 'UP' && <TrendingUp className="text-[#FF2A6D] inline" size={16} />}
                                            {store.trend_direction === 'DOWN' && <TrendingDown className="text-[#00FF94] inline" size={16} />}
                                            {store.trend_direction === 'FLAT' && <Minus className="text-gray-500 inline" size={16} />}
                                        </td>
                                        <td className="p-4">
                                            {store.urgent_actions_count > 0 ? (
                                                <span className="text-[#FF2A6D] font-bold">{store.urgent_actions_count} Open</span>
                                            ) : (
                                                <span className="text-gray-600">None</span>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <span className={`font-mono ${store.confidence_score < 65 ? 'text-gray-400 italic' : 'text-[#00FF94]'}`}>
                                                {store.confidence_score}%
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="flex flex-col gap-6">
                    {/* Anomaly Distribution */}
                    <div className="bg-[#1a1a1a] border border-[#333] rounded shrink-0">
                        <div className="p-4 border-b border-[#333] bg-[#111]">
                            <h2 className="text-sm font-bold text-gray-300 font-mono uppercase tracking-widest">Root Cause Distribution</h2>
                        </div>
                        <div className="p-5 flex flex-col gap-4">
                            {anomaly_distribution.length === 0 && (
                                <div className="text-gray-500 font-mono text-xs italic">No anomalies logged.</div>
                            )}
                            {anomaly_distribution.map((dist, idx) => (
                                <div key={idx}>
                                    <div className="flex justify-between text-xs mb-1 font-mono">
                                        <span className="text-gray-400 capitalize">{dist.anomaly_type.replace(/_/g, ' ').toLowerCase()}</span>
                                        <span className="text-gray-200">{dist.percentage}% ({dist.count})</span>
                                    </div>
                                    <div className="w-full bg-[#111] h-1.5 rounded overflow-hidden flex">
                                        <div 
                                            className="bg-[#C5A059] h-full" 
                                            style={{ width: `${dist.percentage}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Low Trust Warnings */}
                    {lowTrustStores.length > 0 && (
                        <div className="bg-[#1a1a1a] border border-[#333] border-l-[#FF9F1C] rounded shrink-0">
                            <div className="p-4 border-b border-[#333] bg-[#111] flex items-center justify-between">
                                <h2 className="text-sm font-bold text-[#FF9F1C] font-mono uppercase tracking-widest flex items-center gap-2">
                                     <ShieldAlert size={14} /> Low Trust Sensors
                                </h2>
                            </div>
                            <div className="p-4 space-y-3">
                                {lowTrustStores.map((ls, idx) => (
                                    <div key={idx} className="flex flex-col gap-1">
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-gray-200 font-bold">{ls.store_name}</span>
                                            <span className="text-gray-500 font-mono">Conf: {ls.confidence_score}%</span>
                                        </div>
                                        <div className="text-[10px] text-gray-500 leading-tight">
                                            Excluded from trend aggregates due to insufficient data quality or blocked sensors.
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                
            </div>
        </div>
    );
};

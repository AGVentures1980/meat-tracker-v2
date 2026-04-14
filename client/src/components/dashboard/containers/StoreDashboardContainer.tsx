import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { storeAdapters, RawDashboardPayload } from '../../../utils/dashboardAdapters';

export const StoreDashboardContainer = () => {
    const navigate = useNavigate();
    const { user, selectedCompany } = useAuth();
    const selectedStore = user?.storeId || null;
    const [loading, setLoading] = useState(true);
    const [payload, setPayload] = useState<RawDashboardPayload | null>(null);

    // Hardened Fetch Process matching AbortController Pattern
    useEffect(() => {
        const abortController = new AbortController();
        const signal = abortController.signal;

        const fetchData = async () => {
            if (!user?.token) return;
            try {
                setLoading(true);
                const headers: HeadersInit = { 'Authorization': `Bearer ${user.token}` };
                if (selectedCompany) headers['X-Company-Id'] = selectedCompany;

                const storeParam = selectedStore ? `?storeId=${selectedStore}` : '';
                const [perfRes, anomalyRes] = await Promise.all([
                    fetch(`/api/v1/dashboard/company-stats${storeParam}`, { headers, signal }),
                    fetch('/api/v1/intelligence/anomalies', { headers, signal })
                ]);

                let perfData = { performance: [], summary: null };
                let anomalyData = { anomalies: [] };

                if (perfRes.ok) perfData = await perfRes.json();
                if (anomalyRes.ok) anomalyData = await anomalyRes.json();

                if (!signal.aborted) {
                    setPayload({
                        performance: perfData.performance,
                        summary: perfData.summary,
                        anomalies: anomalyData.anomalies
                    });
                }
            } catch (err: any) {
                if (err.name !== 'AbortError') console.error(err);
            } finally {
                if (!signal.aborted) setLoading(false);
            }
        };

        fetchData();
        return () => abortController.abort();
    }, [user?.token, selectedCompany, selectedStore]);

    if (loading) {
        return <div className="p-8 text-[#FF9F1C] font-mono animate-pulse">Loading Store Operations...</div>;
    }

    if (!payload || !selectedStore) {
        return <div className="p-8 text-[#FF2A6D] font-mono">Failed to resolve tactical store context.</div>;
    }

    const snapshot = storeAdapters.toSnapshot(payload.performance || [], selectedStore);
    const needsAttention = storeAdapters.toNeedsAttention(payload.anomalies || [], selectedStore);
    const mainRisks = storeAdapters.toMainRisks(payload.anomalies || []);

    return (
        <div className="store-scope p-6 bg-[#121212] min-h-screen text-white isolation-boundary">
            <h1 className="text-3xl font-bold mb-8 text-[#FF9F1C]">Store Shift Command</h1>

            {/* BLOCO A — Today Snapshot */}
            <div className="grid grid-cols-5 gap-4 mb-8">
                {Object.entries(snapshot).map(([key, data]) => (
                    <div key={key} className="bg-[#1a1a1a] p-4 border border-[#333] rounded-sm">
                        <div className="text-[10px] text-gray-400 uppercase tracking-widest mb-2">{key.replace(/([A-Z])/g, ' $1').trim()}</div>
                        {data.isValid ? (
                            <div className="text-xl font-bold text-white">{data.formatted}</div>
                        ) : (
                            <div className="text-xs text-gray-600 font-mono bg-[#333] p-1 rounded inline-block">{data.fallback}</div>
                        )}
                    </div>
                ))}
            </div>

            {/* BLOCO B — What Needs Attention Now */}
            <div className="mb-8 border-l-4 border-[#FF2A6D] bg-[#FF2A6D]/5 p-4">
                 <h2 className="text-sm font-bold text-[#FF2A6D] mb-4 uppercase tracking-widest">Needs Immediate Attention</h2>
                 {needsAttention.length > 0 ? (
                     <ul className="list-square pl-5 text-sm text-gray-300 font-bold">
                         {needsAttention.map((item, i) => <li key={i} className="mb-2">{item}</li>)}
                     </ul>
                 ) : (
                     <div className="text-xs text-gray-600 font-mono bg-[#333] p-1 rounded inline-block">No immediate alerts</div>
                 )}
            </div>

            {/* BLOCO C — Shift Checklist */}
            <div className="mb-8 p-4 bg-[#1a1a1a] border border-[#333]">
                 <h2 className="text-sm font-bold text-white mb-4 uppercase tracking-widest">Shift Protocol Checklist</h2>
                 <div className="space-y-3">
                     <label className="flex items-center gap-3 p-2 bg-[#222] border border-[#444] cursor-pointer hover:border-[#00FF94]">
                         <input type="checkbox" className="w-4 h-4 bg-transparent border-[#555] text-[#00FF94]" />
                         <span className="text-sm">Verify Receiving QC Log (Garcia Rule)</span>
                     </label>
                     <label className="flex items-center gap-3 p-2 bg-[#222] border border-[#444] cursor-pointer hover:border-[#00FF94]">
                         <input type="checkbox" className="w-4 h-4 bg-transparent border-[#555] text-[#00FF94]" />
                         <span className="text-sm">Review Yield Logs from Butcher Station</span>
                     </label>
                     <label className="flex items-center gap-3 p-2 bg-[#222] border border-[#444] cursor-pointer hover:border-[#00FF94]">
                         <input type="checkbox" className="w-4 h-4 bg-transparent border-[#555] text-[#00FF94]" />
                         <span className="text-sm">Log Daily Waste & Trimmings</span>
                     </label>
                 </div>
            </div>

            {/* BLOCO D — Main Risks */}
            <div className="mb-8 p-4 border border-[#FF9F1C]/30 bg-[#FF9F1C]/5">
                 <h2 className="text-[10px] font-bold text-[#FF9F1C] mb-4 uppercase tracking-widest">Store Shrink Risks</h2>
                 <ul className="list-disc pl-5 text-sm text-gray-400">
                     {mainRisks.map((risk, i) => <li key={i}>{risk}</li>)}
                 </ul>
            </div>

            {/* BLOCO E — Recommended Immediate Actions */}
            <div className="mb-8">
                 <h2 className="text-sm font-bold text-white mb-4 uppercase tracking-widest">Immediate Actions</h2>
                 <div className="flex gap-4">
                     <button onClick={() => navigate('/receiving')} className="px-4 py-2 bg-[#FF2A6D] text-white text-xs font-bold uppercase tracking-widest rounded-sm hover:opacity-80">Recheck Receiving</button>
                     <button onClick={() => navigate('/yield-station')} className="px-4 py-2 bg-[#333] text-white text-xs font-bold uppercase tracking-widest rounded-sm border border-[#444] hover:border-white">Review Yield</button>
                 </div>
            </div>

            {/* BLOCO F — Store Table */}
            <div>
                 <h2 className="text-sm font-bold text-gray-500 mb-4 uppercase tracking-widest">Store Specific Data Log</h2>
                 <div className="p-4 border border-[#333] text-center text-gray-600 text-xs font-mono bg-[#1a1a1a]">
                     [LOCAL STORE RAW MATRIX]
                     <br />
                     <span className="text-[#00FF94]">Validated isolation via StoreId = {selectedStore}</span>
                 </div>
            </div>
        </div>
    );
};

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { executiveAdapters, RawDashboardPayload } from '../../../utils/dashboardAdapters';

export const ExecutiveDashboardContainer = () => {
    const { user, selectedCompany } = useAuth();
    const [loading, setLoading] = useState(true);
    const [payload, setPayload] = useState<RawDashboardPayload | null>(null);

    useEffect(() => {
        const abortController = new AbortController();
        const signal = abortController.signal;

        const fetchData = async () => {
            if (!user?.token) return;
            try {
                setLoading(true);
                const headers: HeadersInit = { 'Authorization': `Bearer ${user.token}` };
                if (selectedCompany) headers['X-Company-Id'] = selectedCompany;

                const [perfRes, anomalyRes] = await Promise.all([
                    fetch('/api/v1/dashboard/company-stats', { headers, signal }),
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
    }, [user?.token, selectedCompany]);

    if (loading) {
        return <div className="p-8 text-[#C5A059] font-mono animate-pulse">Loading Executive Matrix...</div>;
    }

    if (!payload) {
        return <div className="p-8 text-[#FF2A6D] font-mono">Failed to resolve data context.</div>;
    }

    const snapshot = executiveAdapters.toSnapshot(payload.summary, payload.performance || []);
    const marginLeakage = executiveAdapters.toMarginLeakage(payload.anomalies || [], payload.performance || []);
    const priorityStores = executiveAdapters.toPriorityStores(payload.performance || []);
    const criticalAnomalies = executiveAdapters.toCriticalAnomalies(payload.anomalies || []);
    const recommendedActions = executiveAdapters.toRecommendedActions(payload.anomalies || [], payload.performance || []);

    return (
        <div className="executive-scope p-6 bg-[#121212] min-h-screen text-white isolation-boundary">
            <h1 className="text-3xl font-bold mb-8 text-[#C5A059]">Executive Strategy Command</h1>
            
            {/* BLOCO A — Executive Snapshot Row */}
            <div className="grid grid-cols-5 gap-4 mb-8">
                {Object.entries(snapshot).map(([key, data]) => (
                    <div key={key} className="bg-[#1a1a1a] p-4 border border-[#333] rounded-sm">
                        <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">{key.replace(/([A-Z])/g, ' $1').trim()}</div>
                        {data.isValid ? (
                            <div className="text-2xl font-bold">{data.formatted}</div>
                        ) : (
                            <div className="text-xs text-gray-600 font-mono bg-[#333] p-1 rounded inline-block">{data.fallback}</div>
                        )}
                    </div>
                ))}
            </div>

            {/* BLOCO B — Why Margin Is Leaking */}
            <div className="mb-8 border border-[#FF2A6D]/30 bg-[#FF2A6D]/5 p-4">
                <h2 className="text-sm font-bold text-[#FF2A6D] mb-4 uppercase tracking-widest">Why Margin Is Leaking</h2>
                {marginLeakage.length > 0 ? (
                    <ul className="list-disc pl-5 text-sm text-gray-300">
                        {marginLeakage.map((item, i) => <li key={i}>{item}</li>)}
                    </ul>
                ) : (
                     <div className="text-xs text-gray-600 font-mono bg-[#333] p-1 rounded inline-block">No recent validated activity</div>
                )}
            </div>

            {/* BLOCO C — Priority Stores to Intervene */}
            <div className="mb-8">
                <h2 className="text-sm font-bold text-white mb-4 uppercase tracking-widest">Priority Stores to Intervene</h2>
                {priorityStores.length > 0 ? (
                    <table className="w-full text-left text-sm border-collapse">
                        <thead>
                            <tr className="bg-[#1a1a1a] text-gray-500 font-mono text-[10px] uppercase">
                                <th className="p-2 border border-[#333]">Store</th>
                                <th className="p-2 border border-[#333]">Region</th>
                                <th className="p-2 border border-[#333]">Risk Level</th>
                                <th className="p-2 border border-[#333]">Exposure</th>
                                <th className="p-2 border border-[#333]">Last Update</th>
                            </tr>
                        </thead>
                        <tbody>
                            {priorityStores.map((s, i) => (
                                <tr key={i} className="border-b border-[#333] hover:bg-[#1a1a1a]">
                                    <td className="p-2">{s.name}</td>
                                    <td className="p-2">{s.region}</td>
                                    <td className={`p-2 font-bold ${s.riskLevel === 'CRITICAL' ? 'text-[#FF2A6D]' : 'text-[#FF9F1C]'}`}>{s.riskLevel}</td>
                                    <td className="p-2 font-mono">{s.exposure}</td>
                                    <td className="p-2 text-xs text-gray-500">{s.lastUpdate}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                     <div className="text-xs text-gray-600 font-mono bg-[#333] p-1 rounded inline-block">Awaiting validated data</div>
                )}
            </div>

            {/* BLOCO D — Critical Anomalies */}
            <div className="mb-8">
                 <h2 className="text-sm font-bold text-white mb-4 uppercase tracking-widest">Critical Anomalies</h2>
                 {criticalAnomalies.length > 0 ? (
                     <div className="grid grid-cols-3 gap-4">
                         {criticalAnomalies.map((a, i) => (
                             <div key={i} className="p-3 border border-[#FF2A6D]/50 bg-[#1a1a1a]">
                                 <strong className="text-[#FF2A6D] text-xs uppercase block">{a.level}</strong>
                                 <div className="text-sm">{a.title}</div>
                                 <div className="text-[10px] text-gray-400 mt-1">{a.description}</div>
                             </div>
                         ))}
                     </div>
                 ) : (
                     <div className="text-xs text-gray-600 font-mono bg-[#333] p-1 rounded inline-block">No anomalies detected</div>
                 )}
            </div>

            {/* BLOCO E — Recommended Executive Actions */}
            <div className="mb-8 p-4 border border-[#00FF94]/30 bg-[#00FF94]/5">
                 <h2 className="text-sm font-bold text-[#00FF94] mb-4 uppercase tracking-widest">Recommended Actions</h2>
                 {recommendedActions.length > 0 ? (
                     <ul className="list-decimal pl-5 text-sm text-gray-300">
                         {recommendedActions.map((act, i) => <li key={i} className="mb-1">{act}</li>)}
                     </ul>
                 ) : (
                     <div className="text-xs text-gray-600 font-mono bg-[#333] p-1 rounded inline-block">All optimal - Maintain course</div>
                 )}
            </div>

            {/* BLOCO F — Supporting Table */}
            <div>
                 <h2 className="text-sm font-bold text-gray-500 mb-4 uppercase tracking-widest">Supporting Data Log</h2>
                 <div className="p-4 border border-[#333] text-center text-gray-600 text-xs font-mono">
                     [RESTRICTED TABLE RENDER - Executive Overview Mode]
                     <br />
                     <span className="text-[#00FF94]">No data manipulation logic exists here. Native Read-Only.</span>
                 </div>
            </div>
        </div>
    );
};

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { regionalAdapters, RawDashboardPayload } from '../../../utils/dashboardAdapters';

export const RegionalDashboardContainer = () => {
    const { user, selectedCompany } = useAuth();
    const [loading, setLoading] = useState(true);
    const [payload, setPayload] = useState<RawDashboardPayload | null>(null);
    const [dataCompromised, setDataCompromised] = useState({ locked: false, reason: '', weightLost: 0 });

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

                const [perfRes, anomalyRes] = await Promise.all([
                    fetch('/api/v1/dashboard/company-stats', { headers, signal }),
                    fetch('/api/v1/intelligence/anomalies', { headers, signal })
                ]);

                if (perfRes.status === 409) {
                    const errorData = await perfRes.json();
                    if (errorData.status === 'DATA_INTEGRITY_COMPROMISED') {
                        if (!signal.aborted) {
                            setDataCompromised({ 
                                locked: true, 
                                reason: errorData.lockReason,
                                weightLost: errorData.totalLostLbs 
                            });
                            setLoading(false);
                            return;
                        }
                    }
                }

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
        return <div className="p-8 text-[#00FF94] font-mono animate-pulse">Loading Regional Framework...</div>;
    }

    // FASE 11 - FAIL-CLOSED FINAL UI HARDLOCK
    if (dataCompromised.locked) {
        return (
            <div className="fixed inset-0 z-50 bg-[#FF0000] text-white flex flex-col items-center justify-center p-8">
                <div className="text-8xl mb-6">⚠️</div>
                <h1 className="text-5xl font-black mb-4 tracking-tighter uppercase text-center border-4 border-white p-6 bg-black">
                    Data Integrity Compromised
                </h1>
                <h2 className="text-3xl font-bold mb-8 uppercase tracking-widest bg-black px-4 py-2">
                    Score Withheld
                </h2>
                <div className="max-w-2xl text-center bg-black/50 p-8 border border-white/30 backdrop-blur-md">
                    <p className="text-xl font-mono mb-4 text-[#FFBABA]">
                        {dataCompromised.reason}
                    </p>
                    <p className="text-md text-white/80 uppercase tracking-widest mt-8 border-t border-white/20 pt-8">
                        The BRASA Supply Chain Hardlock (Zero-Trust Protocol) has blocked all operational reporting for this tenant. 
                        Reconcile missing inventory or execute an emergency cycle-count to unlock the dashboard.
                    </p>
                </div>
            </div>
        );
    }

    if (!payload) {
        return <div className="p-8 text-[#FF2A6D] font-mono">Failed to resolve regional context.</div>;
    }

    const regionId = user?.regionId || 'GLOBAL'; // Fallback logic inside adapter if user is a higher role spying regionally
    
    const snapshot = regionalAdapters.toSnapshot(payload.summary, payload.performance || [], regionId);
    const bestWorst = regionalAdapters.toBestWorst(payload.performance || [], regionId);
    const outlierBoard = regionalAdapters.toOutlierBoard(payload.anomalies || []);
    const coachingQueue = regionalAdapters.toCoachingQueue(payload.performance || []);

    return (
        <div className="regional-scope p-6 bg-[#121212] min-h-screen text-white isolation-boundary">
            <h1 className="text-3xl font-bold mb-8 text-[#00FF94]">Regional Performance Hub</h1>

            {/* BLOCO A — Regional Snapshot */}
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

            {/* BLOCO B — Best vs Worst Stores */}
            <div className="mb-8 grid grid-cols-2 gap-6">
                 <div className="p-4 bg-[#1a1a1a] border border-[#00FF94]/30">
                     <h2 className="text-[10px] font-bold text-[#00FF94] mb-4 uppercase tracking-widest">Top Performers (Lbs/Pax)</h2>
                     {bestWorst.best.length > 0 ? (
                         <table className="w-full text-sm">
                             <tbody>
                                 {bestWorst.best.map((s, i) => (
                                     <tr key={i} className="border-b border-[#333]">
                                         <td className="py-2">{s.name}</td>
                                         <td className="py-2 text-right font-mono text-[#00FF94]">{s.metric}</td>
                                     </tr>
                                 ))}
                             </tbody>
                         </table>
                     ) : (
                         <div className="text-xs text-gray-600 font-mono bg-[#333] p-1 rounded inline-block">Awaiting validated data</div>
                     )}
                 </div>
                 <div className="p-4 bg-[#1a1a1a] border border-[#FF2A6D]/30">
                     <h2 className="text-[10px] font-bold text-[#FF2A6D] mb-4 uppercase tracking-widest">Needs Intervention (Lbs/Pax)</h2>
                     {bestWorst.worst.length > 0 ? (
                         <table className="w-full text-sm">
                             <tbody>
                                 {bestWorst.worst.map((s, i) => (
                                     <tr key={i} className="border-b border-[#333]">
                                         <td className="py-2">{s.name}</td>
                                         <td className="py-2 text-right font-mono text-[#FF2A6D]">{s.metric}</td>
                                     </tr>
                                 ))}
                             </tbody>
                         </table>
                     ) : (
                         <div className="text-xs text-gray-600 font-mono bg-[#333] p-1 rounded inline-block">Awaiting validated data</div>
                     )}
                 </div>
            </div>

            {/* BLOCO C — Outlier Board */}
            <div className="mb-8">
                 <h2 className="text-sm font-bold text-white mb-4 uppercase tracking-widest">Outlier Tags</h2>
                 <div className="flex flex-wrap gap-2">
                     {outlierBoard.length > 0 ? (
                         outlierBoard.map((tag, i) => (
                             <span key={i} className="px-3 py-1 bg-[#222] border border-[#444] text-xs font-mono text-gray-300 rounded-sm">
                                 # {tag}
                             </span>
                         ))
                     ) : (
                         <div className="text-xs text-gray-600 font-mono bg-[#333] p-1 rounded inline-block">No outliers identified</div>
                     )}
                 </div>
            </div>

            {/* BLOCO D — Coaching Queue */}
            <div className="mb-8 border-l-4 border-[#FF9F1C] bg-[#FF9F1C]/5 p-4">
                 <h2 className="text-sm font-bold text-[#FF9F1C] mb-4 uppercase tracking-widest">Coaching Queue</h2>
                 {coachingQueue.length > 0 ? (
                     <ul className="list-square pl-5 text-sm text-gray-300">
                         {coachingQueue.map((item, i) => <li key={i} className="mb-2">{item}</li>)}
                     </ul>
                 ) : (
                     <div className="text-xs text-gray-600 font-mono">Queue clear</div>
                 )}
            </div>

            {/* BLOCO E — Regional Actions */}
            <div className="mb-8 p-4 border border-[#333] bg-[#1a1a1a]">
                 <h2 className="text-sm font-bold text-white mb-4 uppercase tracking-widest">Weekly Regional Directives</h2>
                 <ul className="space-y-2 text-sm text-gray-400">
                     <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#00FF94]"></span> Review Top Outliers</li>
                     <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#00FF94]"></span> Correct Inventory Variances</li>
                 </ul>
            </div>

            {/* BLOCO F — Regional Table */}
            <div>
                 <h2 className="text-sm font-bold text-gray-500 mb-4 uppercase tracking-widest">Regional Breakdown Table</h2>
                 <div className="p-4 border border-[#333] text-center text-gray-600 text-xs font-mono bg-[#1a1a1a]">
                     [COMPARATIVE REGIONAL RENDER]
                     <br />
                     <span className="text-[#00FF94]">Regional Isolation Enforced by GraphQL/Adapter Mapping</span>
                 </div>
            </div>
        </div>
    );
};

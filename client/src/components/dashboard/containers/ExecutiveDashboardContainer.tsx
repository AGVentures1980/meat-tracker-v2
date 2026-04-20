import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';

export type PrimaryDriver =
  | "YIELD_VARIANCE"
  | "SHRINK_RISK"
  | "INVOICE_DISCREPANCY"
  | "SIGNAL_CONFLICT"
  | "LOW_DATA_TRUST"
  | "STABLE";

const primaryDriverLabelMap: Record<PrimaryDriver, string> = {
  YIELD_VARIANCE: "Yield Variance",
  SHRINK_RISK: "Shrink Risk",
  INVOICE_DISCREPANCY: "Invoice Discrepancy",
  SIGNAL_CONFLICT: "Signal Conflict",
  LOW_DATA_TRUST: "Low Data Trust",
  STABLE: "Stable Baseline"
};

export interface StoreExecutiveSummary {
  store_id: number;
  store_name: string;
  risk_score: number;
  trend_direction: "UP" | "DOWN" | "FLAT";
  confidence_score: number;
  critical_flags: number;
  primary_driver: PrimaryDriver;
}

export interface ExecutiveDashboardPayload {
  top_risk_stores: StoreExecutiveSummary[];
  global_trust_score: number;
  active_critical_anomalies: number;
}

export const ExecutiveDashboardContainer = () => {
    const { user, selectedCompany } = useAuth();
    const [loading, setLoading] = useState(true);
    const [contractError, setContractError] = useState<string | null>(null);
    const [payload, setPayload] = useState<ExecutiveDashboardPayload | null>(null);

    // Contract Validation (Fail-Closed)
    const validateContract = (data: ExecutiveDashboardPayload) => {
        if (!data || !data.top_risk_stores) return "Contract Invalid: Missing Payload Data";
        if (data.top_risk_stores.length === 0) return "Contract Blocked: Demo requires at least 1 risk store (Orlando). Array is empty.";
        
        if (data.global_trust_score < 0 || data.global_trust_score > 100) {
            return "Contract Invalid: global_trust_score must be between 0 and 100.";
        }
        for (const store of data.top_risk_stores) {
            if (store.confidence_score < 0 || store.confidence_score > 100) {
                return `Contract Invalid: confidence_score (${store.confidence_score}) for store ${store.store_id} is out of bounds [0-100].`;
            }
            if (!Object.keys(primaryDriverLabelMap).includes(store.primary_driver)) {
                return `Contract Invalid: Unknown primary_driver enumerator received (${store.primary_driver}).`;
            }
            if (!['UP', 'DOWN', 'FLAT'].includes(store.trend_direction)) {
                return `Contract Invalid: Unknown trend_direction received (${store.trend_direction}).`;
            }
        }
        return null;
    };

    useEffect(() => {
        const abortController = new AbortController();
        const signal = abortController.signal;

        const fetchData = async () => {
            if (!user?.token) return;
            try {
                setLoading(true);
                const headers: HeadersInit = { 'Authorization': `Bearer ${user.token}` };
                if (selectedCompany) headers['X-Company-Id'] = selectedCompany;

                const res = await fetch('/api/v1/executive/dashboard', { headers, signal });
                
                if (!res.ok) {
                    throw new Error(`API Error: ${res.status}`);
                }

                const data = await res.json();

                if (!signal.aborted) {
                    if (data.success && data.data) {
                        const validationError = validateContract(data.data as ExecutiveDashboardPayload);
                        if (validationError) {
                            setContractError(validationError);
                        } else {
                            setPayload(data.data);
                        }
                    } else {
                        throw new Error('Invalid payload structure from API');
                    }
                }
            } catch (err: any) {
                if (err.name !== 'AbortError') {
                    console.error(err);
                    setContractError(`Transport/Network Error: ${err.message}`);
                }
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

    if (contractError || !payload) {
        if (contractError?.includes('Contract Blocked')) {
            return (
                <div className="flex bg-[#121212] min-h-screen text-white isolation-boundary p-6 flex-col relative">
                    <div className="absolute top-6 right-6 border border-[#C5A059]/30 bg-[#C5A059]/10 text-[#C5A059] px-3 py-1 text-[10px] font-mono tracking-widest uppercase rounded flex items-center gap-2"><span className="w-1.5 h-1.5 bg-[#C5A059] rounded-full animate-pulse" />Pilot Mode Active</div>
                    <h1 className="text-3xl font-bold mb-8 text-[#C5A059]">Executive Strategy Command</h1>
                    <div className="mt-12 bg-[#1a1a1a] border border-[#FF9F1C]/50 p-8 rounded-sm max-w-2xl w-full mx-auto flex flex-col gap-4 text-center">
                        <div className="text-[10px] text-[#FF9F1C] uppercase tracking-widest font-mono">STATUS: BLOCKED (SEVERITY HIGH)</div>
                        <h2 className="text-xl font-bold text-gray-200">Data Integrity Protection Active</h2>
                        <p className="text-gray-400 text-sm">Executive data withheld due to validation safeguards. Internal parameters are currently being evaluated.</p>
                    </div>
                </div>
            );
        }
        return (
             <div className="flex bg-[#121212] min-h-screen text-white isolation-boundary p-6 flex-col relative">
                <div className="text-[#FF2A6D] text-lg font-mono tracking-widest font-bold">CONTRACT BLOCKED</div>
                <div className="text-gray-500 font-mono text-xs max-w-lg text-center uppercase tracking-widest p-4 border border-[#FF2A6D]/30 bg-[#FF2A6D]/10">
                    Executive dashboard contract invalid — check backend payload integrity.
                    <br/><br/>
                    <span className="text-[#FF2A6D]">Reason: {contractError || 'Missing Payload'}</span>
                </div>
            </div>
        );
    }

    return (
        <div className="executive-scope p-6 bg-[#121212] min-h-screen text-white isolation-boundary relative">
            <div className="absolute top-6 right-6 border border-[#C5A059]/30 bg-[#C5A059]/10 text-[#C5A059] px-3 py-1 text-[10px] font-mono tracking-widest uppercase rounded flex items-center gap-2"><span className="w-1.5 h-1.5 bg-[#C5A059] rounded-full animate-pulse" />Pilot Mode Active</div>
            <h1 className="text-3xl font-bold mb-8 text-[#C5A059]">Executive Strategy Command</h1>
            <p className="text-xs text-gray-500 font-mono tracking-widest uppercase mb-8">
                // Zero-Trust Frontend • C-Level Display Only
            </p>
            
            {/* BLOCO A — C-Level Health Indicators */}
            <div className="grid grid-cols-2 gap-4 mb-8 max-w-2xl">
                <div className="bg-[#1a1a1a] p-4 border border-[#333] rounded-sm">
                    <div className="text-[10px] text-[#00FF94] uppercase tracking-widest mb-2">Global Trust Score</div>
                    <div className="text-4xl font-bold flex items-baseline gap-2">
                        {payload.global_trust_score}%
                        <span className="text-[10px] text-gray-500 font-normal">CONFIDENCE</span>
                    </div>
                </div>

                <div className={`bg-[#1a1a1a] p-4 border rounded-sm ${payload.active_critical_anomalies > 0 ? 'border-[#FF2A6D]/50' : 'border-[#333]'}`}>
                    <div className="text-[10px] text-[#FF2A6D] uppercase tracking-widest mb-2">Active Critical Anomalies</div>
                    <div className="text-4xl font-bold flex items-baseline gap-2 text-[#FF2A6D]">
                        {payload.active_critical_anomalies}
                        <span className="text-[10px] text-gray-500 font-normal">FLAGS</span>
                    </div>
                </div>
            </div>

            {/* BLOCO B — Top Risk Stores Ranking */}
            <div className="mb-8">
                <h2 className="text-sm font-bold text-white mb-4 uppercase tracking-widest flex items-center gap-2">
                    <svg className="w-4 h-4 text-[#FF9F1C]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    Top Risk Priority Array
                </h2>
                {payload.top_risk_stores && payload.top_risk_stores.length > 0 ? (
                    <table className="w-full text-left text-sm border-collapse">
                        <thead>
                            <tr className="bg-[#1a1a1a] text-gray-500 font-mono text-[10px] uppercase">
                                <th className="p-3 border border-[#333]">Store ID</th>
                                <th className="p-3 border border-[#333]">Risk Score</th>
                                <th className="p-3 border border-[#333]">Trend</th>
                                <th className="p-3 border border-[#333]">Data Confidence</th>
                                <th className="p-3 border border-[#333]">Flags</th>
                                <th className="p-3 border border-[#333]">Primary Driver</th>
                            </tr>
                        </thead>
                        <tbody>
                            {payload.top_risk_stores.map((s, i) => (
                                <tr key={i} className="border-b border-[#333] hover:bg-[#1a1a1a] transition-colors">
                                    <td className="p-3 font-mono text-[#C5A059]">{s.store_name}</td>
                                    
                                    <td className="p-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-full bg-[#333] h-1.5 rounded-full overflow-hidden max-w-[60px]">
                                                <div 
                                                    className={`h-full ${s.risk_score > 75 ? 'bg-[#FF2A6D]' : s.risk_score > 50 ? 'bg-[#FF9F1C]' : 'bg-[#00FF94]'}`} 
                                                    style={{ width: `${Math.min(100, s.risk_score)}%` }}
                                                />
                                            </div>
                                            <span className="font-mono text-xs">{Math.round(s.risk_score)}</span>
                                        </div>
                                    </td>
                                    
                                    <td className="p-3">
                                        {s.trend_direction === 'UP' && <span className="text-[#FF2A6D] flex items-center gap-1 font-bold"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg> Worsening</span>}
                                        {s.trend_direction === 'DOWN' && <span className="text-[#00FF94] flex items-center gap-1"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg> Improving</span>}
                                        {s.trend_direction === 'FLAT' && <span className="text-gray-500 font-mono">- STABLE</span>}
                                    </td>

                                    <td className="p-3 font-mono text-xs">
                                        <span className={s.confidence_score > 80 ? 'text-[#00FF94]' : 'text-[#FF9F1C]'}>
                                            {s.confidence_score}%
                                        </span>
                                    </td>

                                    <td className="p-3 font-mono text-xs text-[#FF2A6D]">{s.critical_flags}</td>
                                    
                                    <td className="p-3">
                                        <span className="text-[10px] text-gray-300 font-mono bg-[#333] px-2 py-1 rounded">
                                            {primaryDriverLabelMap[s.primary_driver] || s.primary_driver}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                     <div className="text-xs text-gray-400 font-mono border border-dashed border-[#333] p-4 text-center">
                         [0] RISK THRESHOLDS EXCEEDED — NO ACTION REQUIRED
                     </div>
                )}
            </div>

            {/* BLOCO C — Protocol Lock */}
            <div className="pt-8 mt-12 border-t border-[#333]/50">
                 <div className="text-[10px] text-gray-600 font-mono text-center flex items-center justify-center gap-2">
                     <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                     EXECUTIVE DISPLAY LAYER • READ ONLY • 0% CLIENT-SIDE INTERPRETATION
                 </div>
            </div>
        </div>
    );
};

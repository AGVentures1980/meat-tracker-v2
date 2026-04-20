import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export type ActionPriority = 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface StoreAction {
  store_id: number;
  anomaly_type: string;
  severity: string;
  root_cause: string;
  message?: string;
  recommended_action: string;
  owner_role: string;
  priority: ActionPriority;
  deadline_hours: number;
  confidence_score: number;
  created_at_iso: string;
}

export const StoreActionConsole = () => {
    const { user, selectedCompany } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actions, setActions] = useState<StoreAction[]>([]);
    const [activeStoreFilter, setActiveStoreFilter] = useState<number | null>(null);

    // Filter validation
    useEffect(() => {
        if (user?.role === 'manager' || user?.role === 'store_manager') {
            setActiveStoreFilter(user.storeId || null);
        }
    }, [user]);

    useEffect(() => {
        const abortController = new AbortController();
        const signal = abortController.signal;

        const fetchActions = async () => {
            if (!user?.token) return;
            try {
                setLoading(true);
                const headers: HeadersInit = { 'Authorization': `Bearer ${user.token}` };
                if (selectedCompany) headers['X-Company-Id'] = selectedCompany;

                const res = await fetch('/api/v1/store/actions', { headers, signal });
                
                if (!res.ok) {
                    throw new Error(`API Error: ${res.status}`);
                }

                const data = await res.json();

                if (!signal.aborted) {
                    if (data.success && Array.isArray(data.data?.actions)) {
                        const incomingActions = data.data.actions as StoreAction[];
                        
                        // ZERO-TRUST VALIDATION CONTRACT
                        const validateContract = (payload: StoreAction[]) => {
                             if (payload.length === 0) return; // Valid state (no anomalies)
                             payload.forEach(action => {
                                 if (!action.priority || !action.severity || !action.root_cause || !action.recommended_action || !action.created_at_iso) {
                                     throw new Error("CONTRACT BLOCKED");
                                 }
                                 if (!['URGENT', 'HIGH', 'MEDIUM', 'LOW'].includes(action.priority)) {
                                     throw new Error("CONTRACT BLOCKED");
                                 }
                                 if (isNaN(Date.parse(action.created_at_iso))) {
                                     throw new Error("CONTRACT BLOCKED");
                                 }
                             });
                        };
                        
                        validateContract(incomingActions);

                        // NOTE: Explicit NO-SORTING policy. The backend strictly controls the list.
                        setActions(incomingActions);
                    } else {
                        throw new Error('Invalid payload structure from API');
                    }
                }
            } catch (err: any) {
                if (err.name !== 'AbortError') {
                    console.error('Dispatch Error:', err);
                    setError(err.message);
                }
            } finally {
                if (!signal.aborted) setLoading(false);
            }
        };

        fetchActions();
        return () => abortController.abort();
    }, [user?.token, selectedCompany]);

    if (loading) {
        return <div className="p-8 text-[#C5A059] font-mono animate-pulse">Initializing Action Engine...</div>;
    }

    if (error) {
        if (error.includes('CONTRACT BLOCKED')) {
            return (
                <div className="flex bg-[#121212] min-h-screen text-white isolation-boundary p-6 flex-col relative">
                    {/* Demo Badge */}
                    <div className="absolute top-6 right-6 border border-[#C5A059]/30 bg-[#C5A059]/10 text-[#C5A059] px-3 py-1 text-[10px] font-mono tracking-widest uppercase rounded flex items-center gap-2"><span className="w-1.5 h-1.5 bg-[#C5A059] rounded-full animate-pulse" />Pilot Mode Active</div>
                    <h1 className="text-3xl font-bold mb-2 text-[#C5A059]">Store Action Console</h1>
                    <p className="text-xs text-gray-500 font-mono tracking-widest uppercase mb-8 border-b border-[#333] pb-4">
                         // TACTICAL DISPATCH LAYER • NO DISTRACTIONS
                    </p>
                    <div className="mt-12 bg-[#1a1a1a] border border-[#FF9F1C]/50 p-8 rounded-sm max-w-2xl w-full mx-auto flex flex-col gap-4 text-center">
                        <div className="text-[10px] text-[#FF9F1C] uppercase tracking-widest font-mono">STATUS: BLOCKED (SEVERITY HIGH)</div>
                        <h2 className="text-xl font-bold text-gray-200">Data Integrity Protection Active</h2>
                        <p className="text-gray-400 text-sm">Executive data withheld due to validation safeguards. Internal parameters are currently being evaluated.</p>
                    </div>
                </div>
            );
        }
        return (
             <div className="flex h-screen w-full items-center justify-center bg-[#121212] flex-col gap-4">
                <div className="text-[#FF2A6D] text-lg font-mono tracking-widest font-bold">DISPATCH ERROR</div>
                <div className="text-gray-500 font-mono text-xs max-w-lg text-center uppercase tracking-widest p-4 border border-[#FF2A6D]/30 bg-[#FF2A6D]/10">
                    Fail-Closed Protocol Active: Store Action extraction aborted.
                    <br/><br/>
                    <span className="text-[#FF2A6D]">Reason: {error}</span>
                </div>
            </div>
        );
    }

    const filteredActions = activeStoreFilter 
        ? actions.filter(a => a.store_id === activeStoreFilter) 
        // No sorting, client is just display
        : actions;

    const getPriorityColor = (priority: ActionPriority) => {
        switch (priority) {
            case 'URGENT': return 'text-[#FF2A6D] bg-[#FF2A6D]/10 border-[#FF2A6D]/50';
            case 'HIGH': return 'text-[#FF9F1C] bg-[#FF9F1C]/10 border-[#FF9F1C]/50';
            case 'MEDIUM': return 'text-[#00FF94] bg-[#00FF94]/10 border-[#00FF94]/50';
            case 'LOW': return 'text-gray-400 bg-gray-800 border-gray-700';
            default: return 'text-gray-400 bg-gray-800 border-gray-700';
        }
    };

    return (
        <div className="p-6 bg-[#121212] min-h-screen text-white isolation-boundary relative">
            {/* Demo Badge */}
            <div className="absolute top-6 right-6 border border-[#C5A059]/30 bg-[#C5A059]/10 text-[#C5A059] px-3 py-1 text-[10px] font-mono tracking-widest uppercase rounded flex items-center gap-2"><span className="w-1.5 h-1.5 bg-[#C5A059] rounded-full animate-pulse" />Pilot Mode Active</div>
            <h1 className="text-3xl font-bold mb-2 text-[#C5A059]">Store Action Console</h1>
            <p className="text-xs text-gray-500 font-mono tracking-widest uppercase mb-8 border-b border-[#333] pb-4">
                 // TACTICAL DISPATCH LAYER • NO DISTRACTIONS • IMMEDIATE RESOLUTION OVERVIEW
            </p>

            {filteredActions.length === 0 ? (
                <div className="border border-dashed border-[#333] p-12 text-center text-gray-500 font-mono">
                    NO OPERATIONAL DISSONANCE DETECTED
                    <br/><br/>
                    <span className="text-[#00FF94] text-xs">All active signals fall within acceptable operational thresholds.</span>
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    {filteredActions.map((action, idx) => (
                        <div key={idx} className="bg-[#1a1a1a] border border-[#333] p-5 rounded-sm flex flex-col md:flex-row gap-6 relative overflow-hidden">
                            
                            {/* Visual Priority Tag */}
                            <div className={`absolute top-0 left-0 w-1.5 h-full ${
                                action.priority === 'URGENT' ? 'bg-[#FF2A6D]' : 
                                action.priority === 'HIGH' ? 'bg-[#FF9F1C]' : 
                                action.priority === 'MEDIUM' ? 'bg-[#00FF94]' : 'bg-gray-600'
                            }`} />

                            <div className="flex-[2] ml-2">
                                <div className="text-[10px] text-gray-400 uppercase tracking-widest mb-1 font-mono">Problem Source ({action.anomaly_type})</div>
                                <h3 className="text-md font-bold mb-1 text-gray-200">{action.root_cause}</h3>
                                {action.message && (
                                    <div className="text-xs text-gray-500 mb-3 italic">
                                        Context: "{action.message}"
                                    </div>
                                )}
                                <div className="flex items-center gap-3 font-mono text-[10px]">
                                    <span className="bg-[#111] px-2 py-1 text-gray-500 border border-[#333]">Store #{action.store_id}</span>
                                    <span className={action.confidence_score >= 85 ? 'text-[#00FF94]' : 'text-[#FF9F1C]'}>Confidence: {action.confidence_score}%</span>
                                    {/* Display ISO derived time explicitly as display only logic */}
                                    <span className="text-gray-600 border-l border-gray-700 pl-3 ml-1">Age: {new Date(action.created_at_iso).toLocaleDateString()}</span>
                                </div>
                            </div>

                            <div className="flex-[3] bg-[#111] p-4 border border-[#333]/50 border-l-[#C5A059]/30">
                                <div className="text-[10px] text-[#C5A059] uppercase tracking-widest mb-2 font-mono flex items-center gap-2">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                    Resolution Strategy
                                </div>
                                <p className="text-sm text-gray-100 font-bold tracking-wide">{action.recommended_action}</p>
                            </div>

                            <div className="flex-[1] flex flex-col gap-3 justify-center">
                                <div>
                                    <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1 font-mono">Assignee</div>
                                    <div className="text-xs font-bold text-gray-200">{action.owner_role.replace(/_/g, ' ')}</div>
                                </div>
                                <div>
                                    <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1 font-mono">Deadline</div>
                                    <div className={`text-xs font-bold font-mono px-2 py-1 border inline-block ${getPriorityColor(action.priority)}`}>
                                        T-MINUS {action.deadline_hours}H
                                    </div>
                                </div>
                            </div>

                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

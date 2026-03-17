import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Activity, DollarSign, CheckCircle, Send, AlertTriangle } from 'lucide-react';

export const PilotTracker = () => {
    const { user, selectedCompany } = useAuth();
    const { t } = useLanguage();
    
    const [stores, setStores] = useState<any[]>([]);
    const [selectedStore, setSelectedStore] = useState<number | null>(null);
    const [data, setData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);

    const getHeaders = () => {
        const h: HeadersInit = { 'Authorization': `Bearer ${user?.token}` };
        if (selectedCompany) h['X-Company-Id'] = selectedCompany;
        return h;
    };

    // 1. Fetch Pilot Stores
    useEffect(() => {
        const fetchStores = async () => {
            try {
                const res = await fetch('/api/v1/dashboard/stores', { headers: getHeaders() });
                const json = await res.json();
                if (json.success) {
                    const pilots = json.stores.filter((s: any) => s.is_pilot);
                    setStores(pilots);
                    if (pilots.length > 0) {
                        setSelectedStore(pilots[0].id);
                    }
                }
            } catch (err) {
                console.error("Failed to fetch pilot stores", err);
            }
        };
        fetchStores();
    }, []);

    // 2. Fetch Pilot Data for Selected Store
    useEffect(() => {
        if (!selectedStore) return;
        const fetchPilotData = async () => {
            setIsLoading(true);
            try {
                const res = await fetch(`/api/v1/intelligence/pilot-dashboard?storeId=${selectedStore}`, {
                    headers: getHeaders()
                });
                const json = await res.json();
                if (json.success) {
                    setData(json);
                }
            } catch (err) {
                console.error("Failed to fetch pilot data", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchPilotData();
    }, [selectedStore]);

    const handleSendInvoice = () => {
        // Mock function for sending the invoice at the end of the pilot.
        alert(`Invoice for $${data.agv_performance_fee.toFixed(2)} generated and sent to Texas de Brazil Corporate!`);
    };

    if (!selectedStore || stores.length === 0) {
        return (
            <div className="flex items-center justify-center h-64 border border-dashed border-[#333] mt-8">
                <p className="text-gray-500 font-mono text-xs uppercase bg-[#111] px-4 py-2 border border-[#222]">No Active Pilot Stores Found</p>
            </div>
        );
    }

    return (
        <div className="mt-8 space-y-8 animate-in fade-in duration-500">
            {/* Store Selector */}
            <div className="flex gap-2">
                {stores.map(store => (
                    <button
                        key={store.id}
                        onClick={() => setSelectedStore(store.id)}
                        className={`px-6 py-2 text-xs font-bold uppercase tracking-widest border transition-all ${
                            selectedStore === store.id 
                            ? 'bg-[#C5A059] text-black border-[#C5A059]' 
                            : 'bg-[#1a1a1a] text-gray-500 border-[#333] hover:text-white hover:border-gray-500'
                        }`}
                    >
                        {store.store_name}
                    </button>
                ))}
            </div>

            {isLoading || !data ? (
                <div className="h-64 flex flex-col items-center justify-center space-y-4 border border-[#333] bg-[#111]">
                    <Activity className="text-[#C5A059] animate-spin w-8 h-8" />
                    <p className="text-[10px] uppercase font-mono text-gray-500 tracking-widest">Compiling AI Ledger...</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* TOP EXECUTIVE BRIEFING NUMBERS */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-[#111] p-6 border-l-2 border-[#C5A059]">
                            <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">Pilot Day</p>
                            <p className="text-3xl font-serif text-white">{data.current_day} <span className="text-sm font-sans text-gray-600">/ 90</span></p>
                            <p className="text-[9px] text-gray-600 mt-2 uppercase">{data.days_remaining} Days Remaining</p>
                        </div>
                        
                        <div className="bg-[#111] p-6 border-l-2 border-[#00FF94]">
                            <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">Total Yield Recovered</p>
                            <p className="text-3xl font-serif text-[#00FF94]">${data.total_savings_recovered.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                            <p className="text-[9px] text-gray-600 mt-2 uppercase">Verified by Deep Scan</p>
                        </div>

                        <div className="bg-[#1a1a1a] md:col-span-2 p-6 border border-[#333] relative overflow-hidden flex justify-between items-center group">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#C5A059]/5 pointer-events-none"></div>
                            <div>
                                <p className="text-[10px] text-[#C5A059] uppercase font-bold tracking-widest mb-1 flex items-center gap-1">
                                    <DollarSign size={12} /> AGV Master Invoice (8% Fee)
                                </p>
                                <p className="text-4xl font-serif text-white">${data.agv_performance_fee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                <p className="text-[9px] text-gray-500 mt-2 uppercase tracking-widest">
                                    {data.pilot_status === 'COMPLETED' ? 'Final Payment Processing' : 'Accruing Daily'}
                                </p>
                            </div>

                            {data.pilot_status === 'COMPLETED' ? (
                                <button 
                                    onClick={handleSendInvoice}
                                    className="bg-[#00FF94] text-black font-bold uppercase text-xs px-6 py-3 tracking-widest flex items-center gap-2 hover:bg-[#00cc7a] transition-colors shadow-[0_0_15px_rgba(0,255,148,0.3)]"
                                >
                                    <Send size={16} /> Send Invoice to Corporate
                                </button>
                            ) : (
                                <div className="text-right flex flex-col items-end">
                                    <div className="flex items-center gap-2 text-gray-500 text-xs uppercase font-bold">
                                        <AlertTriangle size={14} className="text-orange-500" /> Locked until Day 90
                                    </div>
                                    <div className="w-32 h-1 bg-[#333] mt-2 rounded-full overflow-hidden">
                                        <div className="h-full bg-[#C5A059]" style={{ width: \`\${(data.current_day / 90) * 100}%\` }}></div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* THE TIMELINE LEDGER */}
                    <div className="bg-[#111] border border-[#333] mt-8">
                        <div className="p-4 border-b border-[#333] flex justify-between items-center bg-[#1a1a1a]">
                            <h3 className="text-xs uppercase font-bold tracking-widest text-white flex items-center gap-2">
                                <Activity size={14} className="text-[#C5A059]" /> 90-Day Audit Timeline Ledger
                            </h3>
                            <span className="text-[9px] text-gray-500 font-mono bg-black px-2 py-1 border border-[#333]">STRICT CONFIDENTIAL</span>
                        </div>
                        
                        <div className="max-h-[500px] overflow-y-auto w-full">
                            <table className="w-full text-left font-mono">
                                <thead className="bg-[#121212] sticky top-0 border-b border-[#333] shadow-md z-10">
                                    <tr className="text-[9px] text-gray-500 uppercase tracking-widest">
                                        <th className="p-3 w-16 text-center border-r border-[#333]">Day</th>
                                        <th className="p-3 w-24">Date</th>
                                        <th className="p-3 flex-1">AI Daily Findings</th>
                                        <th className="p-3 w-32 border-l border-[#333] text-right text-[#00FF94]">Saved USD</th>
                                        <th className="p-3 w-32 border-l border border-[#333] bg-[#C5A059]/10 text-right text-[#C5A059] font-bold">8% Fee</th>
                                    </tr>
                                </thead>
                                <tbody className="text-xs divide-y divide-[#222]">
                                    {data.timeline.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="p-6 text-center text-gray-600 font-sans italic">No logs generated yet. Next scan runs at midnight.</td>
                                        </tr>
                                    ) : (
                                        [...data.timeline].reverse().map((log: any, i: number) => (
                                            <tr key={i} className="hover:bg-[#1a1a1a] transition-all group">
                                                <td className="p-3 text-center border-r border-[#333] font-bold text-gray-500 group-hover:text-white">#{log.day_number}</td>
                                                <td className="p-3 text-gray-400">{new Date(log.date).toLocaleDateString()}</td>
                                                <td className="p-3 py-4">
                                                    <p className="text-white font-sans text-[13px] leading-relaxed mb-1">{log.insight}</p>
                                                    <p className="text-gray-500 font-sans text-[11px] leading-relaxed italic">{log.summary}</p>
                                                </td>
                                                <td className="p-3 border-l border-[#333] text-right font-bold text-[#00FF94]">
                                                    +${log.daily_savings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </td>
                                                <td className="p-3 border-l border-[#333] bg-[#C5A059]/5 text-right font-bold text-[#C5A059]">
                                                    +${log.gain_share_8pct.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

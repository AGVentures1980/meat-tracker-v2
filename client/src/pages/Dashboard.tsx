import React, { useState, useEffect } from 'react';
import { FileText, Download, LayoutGrid, TrendingUp, Calendar, DownloadCloud, Camera } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { NetworkReportCard } from '../components/NetworkReportCard';
import { WeeklyInputForm } from '../components/WeeklyInputForm';
import { DashboardLayout } from '../components/layouts/DashboardLayout';
import { ExecutiveSummary } from '../components/dashboard/ExecutiveSummary';

// --- Types ---
interface StorePerformance {
    id: number;
    name: string;
    location: string;
    guests: number;
    usedQty: number; // lbs
    usedValue: number; // $
    costPerLb: number;
    costPerGuest: number;
    lbsPerGuest: number;
    lbsGuestVar: number; // Variance from 1.76
    target_lbs_guest?: number; // Dynamic Target
    costGuestVar: number; // Variance from Plan
    impactYTD: number;
    status: 'Optimal' | 'Warning' | 'Critical';
}

import { useAuth } from '../context/AuthContext';

// ... (keep LayoutGrid etc imports)

export const Dashboard = () => {
    const { user } = useAuth();
    const [performanceData, setPerformanceData] = useState<StorePerformance[]>([]);
    const [detailedStats, setDetailedStats] = useState<any>(null); // Phase 9
    const [loading, setLoading] = useState(true);
    const [showWeeklyInput, setShowWeeklyInput] = useState(false);
    const [selectedStoreId] = useState<number>(180); // Default to Tampa for Demo Data

    // Fetch Data
    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;

            try {
                const baseUrl = import.meta.env.PROD ? '/api/v1' : 'http://localhost:3001/api/v1';

                // Construct Token
                const token = `Bearer ${user.token}`;

                // 1. Fetch Network Bi Stats
                let url = `${baseUrl}/dashboard/bi-network?year=2026&week=10`;
                const res = await fetch(url, { headers: { 'Authorization': token } });

                if (res.ok) {
                    const json = await res.json();
                    if (Array.isArray(json)) setPerformanceData(json);
                    else if (json.data && Array.isArray(json.data)) setPerformanceData(json.data);
                }

                // 2. Fetch Detailed Stats (for Financials)
                // If Manager using specific store, or Admin viewing store 1
                const targetStore = user.role === 'manager' ? user.storeId : selectedStoreId;
                if (targetStore) {
                    const detailRes = await fetch(`${baseUrl}/dashboard/${targetStore}`, {
                        headers: { 'Authorization': token }
                    });
                    if (detailRes.ok) {
                        const detailJson = await detailRes.json();
                        setDetailedStats(detailJson);
                    }
                }

            } catch (err) {
                console.error("Failed to fetch dashboard data", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user, selectedStoreId]);


    const handleExport = () => {
        if (!performanceData || performanceData.length === 0) return;

        // 1. Define CSV Headers
        const headers = ["ID", "Store Name", "Location", "Guests", "Lbs Consumed", "Lbs/Guest", "Target", "Variance", "Financial Impact", "Status"];

        // 2. Map Data to CSV Rows
        const rows = performanceData.map(store => [
            store.id,
            `"${store.name}"`, // Quote strings to handle commas
            `"${store.location}"`,
            store.guests,
            store.usedQty.toFixed(2),
            store.lbsPerGuest.toFixed(2),
            (store.target_lbs_guest || 1.76).toFixed(2), // Use target field if available, else default
            store.lbsGuestVar.toFixed(3),
            store.impactYTD.toFixed(2),
            store.status
        ]);

        // 3. Construct CSV String
        const csvContent = [
            headers.join(","),
            ...rows.map(r => r.join(","))
        ].join("\n");

        // 4. Trigger Download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `meat_tracker_export_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <DashboardLayout>
            {/* Header / Actions */}
            <div className="flex justify-between items-end mb-8 border-b border-white/10 pb-4">
                <div>
                    <h1 className="text-3xl font-mono font-bold text-white tracking-tight">NETWORK OVERVIEW</h1>
                    <div className="flex items-center text-gray-500 font-mono text-sm mt-1 space-x-4">
                        <span>FISCAL WEEK 10 • 2026</span>
                        <span className="text-[#00FF94] flex items-center">
                            <span className="w-2 h-2 bg-[#00FF94] rounded-full mr-2 animate-pulse"></span>
                            LIVE STREAM
                        </span>
                    </div>
                </div>
                {/* ... buttons ... */}
                <div className="flex gap-4">
                    {/* ... keep existing buttons ... */}
                    <button
                        onClick={() => setShowWeeklyInput(true)}
                        className="bg-[#1a1a1a] border border-[#333] hover:border-brand-gold/50 hover:text-brand-gold text-gray-400 font-bold py-2 px-4 rounded-sm flex items-center transition-all uppercase text-sm tracking-wide font-mono"
                    >
                        <DownloadCloud className="w-4 h-4 mr-2" />
                        Sync OLO
                    </button>
                    <button
                        onClick={() => setShowWeeklyInput(true)}
                        className="bg-[#1a1a1a] border border-[#333] hover:border-brand-gold/50 hover:text-brand-gold text-gray-400 font-bold py-2 px-4 rounded-sm flex items-center transition-all uppercase text-sm tracking-wide font-mono"
                    >
                        <Camera className="w-4 h-4 mr-2" />
                        Scan Invoice
                    </button>
                    <button
                        onClick={() => setShowWeeklyInput(true)}
                        className="bg-[#00FF94] hover:bg-[#00cc76] text-black font-bold py-2 px-4 rounded-sm flex items-center shadow-[0_0_15px_rgba(0,255,148,0.3)] transition-all uppercase text-sm tracking-wide font-mono"
                    >
                        <FileText className="w-4 h-4 mr-2" />
                        Manager Close
                    </button>
                    <button
                        onClick={handleExport}
                        className="bg-[#1a1a1a] border border-[#333] hover:border-white/30 text-white font-bold py-2 px-4 rounded-sm flex items-center transition-all uppercase text-sm tracking-wide font-mono"
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Export CSV
                    </button>
                </div>
            </div>

            {/* Admin: Executive Summary */}
            {user?.role === 'admin' && (
                <div className="mb-12 border-b border-[#333] pb-8">
                    <ExecutiveSummary />
                </div>
            )}

            {/* Network Report Card (The "Brain") */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <NetworkReportCard />

                {/* Phase 9: Economic Impact Card */}
                <div className="bg-[#1a1a1a] border border-[#333] rounded-sm p-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <TrendingUp className="w-24 h-24 text-white" />
                    </div>

                    <h3 className="text-gray-400 font-mono text-xs uppercase tracking-widest mb-2">Weekly Economic Impact</h3>

                    {detailedStats?.financials ? (
                        <>
                            <div className="flex items-baseline gap-2 mb-1">
                                <span className={`text-4xl font-mono font-bold ${detailedStats.financials.total_savings >= 0 ? 'text-[#00FF94]' : 'text-[#FF2A6D]'}`}>
                                    {detailedStats.financials.total_savings >= 0 ? '+' : '-'}${Math.abs(detailedStats.financials.total_savings).toLocaleString()}
                                </span>
                                <span className="text-xs text-gray-500 font-mono">EST.</span>
                            </div>

                            <p className="text-sm text-gray-400 mb-4">
                                {detailedStats.financials.total_savings >= 0
                                    ? "Projected savings based on efficiency vs. standard."
                                    : "Projected loss due to variance above standard."}
                            </p>

                            <div className="space-y-2">
                                {detailedStats.topMeats && detailedStats.topMeats.length > 0 ? (
                                    <>
                                        {/* Find Most Savings (highest positive impactDollars) */}
                                        {[...detailedStats.topMeats].sort((a, b) => b.impactDollars - a.impactDollars).slice(0, 1).map(m => (
                                            <div key="saving" className="flex justify-between text-xs font-mono border-b border-white/5 pb-1">
                                                <span className="text-gray-500 uppercase">TOP SAVING</span>
                                                <span className="text-[#00FF94]">{m.name} (+${Math.round(m.impactDollars).toLocaleString()})</span>
                                            </div>
                                        ))}
                                        {/* Find Most Waste (lowest negative impactDollars) */}
                                        {[...detailedStats.topMeats].sort((a, b) => a.impactDollars - b.impactDollars).slice(0, 1).map(m => (
                                            <div key="waste" className="flex justify-between text-xs font-mono border-b border-white/5 pb-1">
                                                <span className="text-gray-500 uppercase">TOP WASTE</span>
                                                <span className="text-[#FF2A6D]">{m.name} (${Math.round(m.impactDollars).toLocaleString()})</span>
                                            </div>
                                        ))}
                                    </>
                                ) : (
                                    <div className="text-xs text-gray-500 italic">No itemized data available this week.</div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="animate-pulse flex flex-col gap-2">
                            <div className="h-8 w-32 bg-[#333] rounded"></div>
                            <div className="h-4 w-48 bg-[#333] rounded"></div>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Data Table (The "Grid") */}
            <div className="bg-[#1a1a1a] border border-[#333] rounded-sm overflow-hidden shadow-xl">
                <div className="p-4 border-b border-[#333] flex justify-between items-center bg-[#222]">
                    <h3 className="text-[#00FF94] font-mono text-lg font-bold flex items-center">
                        <LayoutGrid className="w-5 h-5 mr-2" />
                        STORE PERFORMANCE MATRIX
                    </h3>
                    <div className="flex gap-2 text-[10px] font-mono text-gray-500 uppercase tracking-widest">
                        <span>SORT: VARIANCE (DESC)</span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#121212] text-gray-500 text-[10px] uppercase font-mono tracking-wider border-b border-[#333]">
                                <th className="p-4 font-normal">Store Location</th>
                                <th className="p-4 font-normal text-right">Guests</th>
                                <th className="p-4 font-normal text-right">Lbs Consumed</th>
                                <th className="p-4 font-normal text-right">Lbs/Guest</th>
                                <th className="p-4 font-normal text-right">Var %</th>
                                <th className="p-4 font-normal text-right">Fin. Impact</th>
                                <th className="p-4 font-normal text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#333] font-mono text-sm">
                            {loading ? (
                                <tr><td colSpan={7} className="p-8 text-center text-gray-500 animate-pulse">Initializing Data Stream...</td></tr>
                            ) : (
                                performanceData.map((store) => (
                                    <tr key={store.id} className="hover:bg-[#252525] transition-colors group">
                                        <td className="p-4 font-bold text-white group-hover:text-[#00FF94] transition-colors">
                                            {store.name}
                                            <span className="block text-[10px] text-gray-600 font-normal uppercase">{store.location}</span>
                                        </td>
                                        <td className="p-4 text-right text-gray-300">{store.guests.toLocaleString()}</td>
                                        <td className="p-4 text-right text-gray-300">{store.usedQty.toLocaleString()}</td>
                                        <td className={`p-4 text-right font-bold ${store.lbsPerGuest > 1.76 ? 'text-[#FF9F1C]' : 'text-[#00FF94]'}`}>
                                            {store.lbsPerGuest.toFixed(2)}
                                        </td>
                                        <td className="p-4 text-right text-gray-400">
                                            {store.lbsGuestVar > 0 ? '+' : ''}{((store.lbsGuestVar / 1.76) * 100).toFixed(1)}%
                                        </td>
                                        <td className={`p-4 text-right font-bold ${store.impactYTD < 0 ? 'text-[#FF2A6D]' : 'text-[#00FF94]'}`}>
                                            {store.impactYTD < 0 ? '-' : '+'}${Math.abs(store.impactYTD).toLocaleString()}
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className={`inline-block px-2 py-1 text-[10px] rounded-none font-bold uppercase tracking-wide border ${store.status === 'Optimal' ? 'bg-[#00FF94]/10 text-[#00FF94] border-[#00FF94]/30' :
                                                store.status === 'Warning' ? 'bg-[#FF9F1C]/10 text-[#FF9F1C] border-[#FF9F1C]/30' :
                                                    'bg-[#FF2A6D]/10 text-[#FF2A6D] border-[#FF2A6D]/30 animate-pulse'
                                                }`}>
                                                {store.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Input Modal */}
            {showWeeklyInput && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <WeeklyInputForm
                        storeId={selectedStoreId}
                        onClose={() => setShowWeeklyInput(false)}
                        onSubmit={() => {
                            // Trigger refresh
                            window.location.reload();
                        }}
                    />
                </div>
            )}
        </DashboardLayout>
    );
};

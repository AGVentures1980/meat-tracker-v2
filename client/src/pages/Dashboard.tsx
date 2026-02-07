import React, { useState, useEffect } from 'react';
import { FileText, Download, LayoutGrid, TrendingUp, Calendar, DownloadCloud, Camera } from 'lucide-react';
import { NetworkReportCard } from '../components/NetworkReportCard';
import { WeeklyInputForm } from '../components/WeeklyInputForm';
import { DashboardLayout } from '../components/layouts/DashboardLayout';

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
    costGuestVar: number; // Variance from Plan
    impactYTD: number;
    status: 'Optimal' | 'Warning' | 'Critical';
}

export const Dashboard = () => {
    const [performanceData, setPerformanceData] = useState<StorePerformance[]>([]);
    const [loading, setLoading] = useState(true);
    const [showWeeklyInput, setShowWeeklyInput] = useState(false);
    const [selectedStoreId] = useState<number>(1); // Default to first store for input

    // Fetch Data
    useEffect(() => {
        const fetchData = async () => {
            try {
                const baseUrl = import.meta.env.PROD ? '/api/v1' : 'http://localhost:3001/api/v1';
                const res = await fetch(`${baseUrl}/dashboard/bi-network?year=2026&week=9`, {
                    headers: { 'Authorization': 'Bearer mock-token' }
                });

                if (res.ok) {
                    const json = await res.json();
                    // In V2, the API returns the array directly or inside a data property?
                    // Checked MeatEngine: returns results array.
                    // Checked DashboardController: return res.json(stats).
                    // So json is the array.

                    if (Array.isArray(json)) {
                        setPerformanceData(json);
                    } else if (json.data && Array.isArray(json.data)) {
                        setPerformanceData(json.data);
                    }
                } else {
                    console.error("API Error:", res.status);
                }
            } catch (err) {
                console.error("Failed to fetch dashboard data", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);


    return (
        <DashboardLayout>
            {/* Header / Actions */}
            <div className="flex justify-between items-end mb-8 border-b border-white/10 pb-4">
                <div>
                    <h1 className="text-3xl font-mono font-bold text-white tracking-tight">NETWORK OVERVIEW</h1>
                    <div className="flex items-center text-gray-500 font-mono text-sm mt-1 space-x-4">
                        <span>FISCAL WEEK 9 • 2026</span>
                        <span className="text-[#00FF94] flex items-center">
                            <span className="w-2 h-2 bg-[#00FF94] rounded-full mr-2 animate-pulse"></span>
                            LIVE STREAM
                        </span>
                    </div>
                </div>
                <div className="flex gap-4">
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
                    <button className="bg-[#1a1a1a] border border-[#333] hover:border-white/30 text-white font-bold py-2 px-4 rounded-sm flex items-center transition-all uppercase text-sm tracking-wide font-mono">
                        <Download className="w-4 h-4 mr-2" />
                        Export CSV
                    </button>
                </div>
            </div>

            {/* Network Report Card (The "Brain") */}
            <div className="mb-8">
                <NetworkReportCard />
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
                <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
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

import { useState, useEffect } from 'react';
import { LayoutGrid, TrendingUp, DownloadCloud } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { NetworkReportCard } from '../components/NetworkReportCard';
import { WeeklyInputForm } from '../components/WeeklyInputForm';
import { DashboardLayout } from '../components/layouts/DashboardLayout';
import { PerformanceChart } from '../components/dashboard/PerformanceChart';
import { useAuth } from '../context/AuthContext';

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
    target_cost_guest?: number; // Dynamic Cost Target
    costGuestVar: number; // Variance from Plan
    impactYTD: number;
    status: 'Optimal' | 'Warning' | 'Critical';
}

// ... imports

export const Dashboard = () => {
    const navigate = useNavigate();
    const [performanceData, setPerformanceData] = useState<StorePerformance[]>([]);
    const [loading, setLoading] = useState(true);
    const [showWeeklyInput, setShowWeeklyInput] = useState(false);
    const [viewMode, setViewMode] = useState<'grid' | 'charts'>('grid');

    const { user } = useAuth();

    useEffect(() => {
        const fetchData = async () => {
            if (!user?.token) return;
            try {
                setLoading(true);
                const res = await fetch('/api/v1/dashboard/company-stats', {
                    headers: {
                        'Authorization': `Bearer ${user.token}`
                    }
                });
                if (res.ok) {
                    const data = await res.json();
                    setPerformanceData(data.performance || []);
                }
            } catch (err) {
                console.error("Failed to fetch dashboard data", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user?.token]);

    const handleExport = () => {
        if (!performanceData.length) return;

        const headers = ["Location", "Guests", "Lbs/Guest Act", "Lbs/Guest Tgt", "$/Guest Act", "$/Guest Tgt", "Variance $", "Impact YTD", "Status"];
        const csvRows = performanceData.map(s => [
            s.name,
            s.guests,
            s.lbsPerGuest.toFixed(2),
            (s.target_lbs_guest || 1.76).toFixed(2),
            s.costPerGuest.toFixed(2),
            (s.target_cost_guest || 9.94).toFixed(2),
            s.costGuestVar.toFixed(2),
            s.impactYTD.toFixed(2),
            s.status
        ].join(','));

        const csvContent = [headers.join(','), ...csvRows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', `brasa_performance_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    return (
        <DashboardLayout>
            <div className="p-6">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                            Meat Intelligence
                            <span className="bg-[#FF2A6D]/10 text-[#FF2A6D] text-xs px-2 py-1 rounded-none border border-[#FF2A6D]/30 uppercase tracking-widest font-mono">Real-Time</span>
                        </h1>
                        <p className="text-gray-500 text-sm mt-1 font-mono uppercase tracking-wider">Network Performance Monitoring • 2026 Q1</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex bg-[#1a1a1a] border border-[#333] p-1 rounded-sm">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`px-3 py-1.5 text-xs font-bold rounded-xs transition-all flex items-center gap-2 ${viewMode === 'grid' ? 'text-white bg-[#333] shadow-lg' : 'text-gray-500 hover:text-white'}`}
                            >
                                <LayoutGrid size={14} /> Grid
                            </button>
                            <button
                                onClick={() => setViewMode('charts')}
                                className={`px-3 py-1.5 text-xs font-bold rounded-xs transition-all flex items-center gap-2 ${viewMode === 'charts' ? 'text-white bg-[#333] shadow-lg' : 'text-gray-500 hover:text-white'}`}
                            >
                                <TrendingUp size={14} /> Charts
                            </button>
                        </div>
                        <button
                            onClick={handleExport}
                            className="bg-[#C5A059] hover:bg-[#D5B069] text-black px-4 py-2 font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-2 rounded-sm active:scale-95 shadow-[0_0_20px_rgba(197,160,89,0.2)]"
                        >
                            <DownloadCloud size={16} /> Export Data
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
                    <NetworkReportCard />
                </div>

                {/* Performance View */}
                {viewMode === 'grid' ? (
                    <div className="bg-[#1a1a1a] border border-[#333] rounded-sm overflow-hidden shadow-2xl">
                        <div className="p-4 border-b border-[#333] flex justify-between items-center bg-[#222]">
                            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400 flex items-center gap-2">
                                Performance by Location
                            </h3>
                            <div className="flex items-center gap-4 text-[10px] text-gray-500 font-mono">
                                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-[#00FF94]"></span> Under Meta</span>
                                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-[#FF2A6D]"></span> Acima Meta</span>
                            </div>
                        </div>

                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-[#121212] text-gray-500 text-[10px] uppercase font-mono tracking-wider border-b border-[#333]">
                                    <th className="p-4 font-normal">Store Location</th>
                                    <th className="p-4 font-normal text-right">Guests</th>
                                    <th className="p-4 font-normal text-right">Lbs/Guest<br /><span className="text-[9px] opacity-70">(Act / Tgt)</span></th>
                                    <th className="p-4 font-normal text-right">$/Guest<br /><span className="text-[9px] opacity-70">(Act / Tgt)</span></th>
                                    <th className="p-4 font-normal text-right">Var $/Guest</th>
                                    <th className="p-4 font-normal text-right">Fin. Impact</th>
                                    <th className="p-4 font-normal text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#333] font-mono text-sm">
                                {loading ? (
                                    <tr><td colSpan={7} className="p-8 text-center text-gray-500 animate-pulse">Initializing Data Stream...</td></tr>
                                ) : (
                                    performanceData.map((store) => (
                                        <tr key={store.id} className="hover:bg-[#252525] transition-colors group cursor-pointer" onClick={() => navigate(`/dashboard/${store.id}`)}>
                                            <td className="p-4 font-bold text-white group-hover:text-[#C5A059] transition-colors">
                                                {store.name}
                                                <span className="block text-[10px] text-gray-600 font-normal uppercase">{store.location}</span>
                                            </td>
                                            <td className="p-4 text-right text-gray-300">{store.guests.toLocaleString()}</td>

                                            {/* Lbs/Guest */}
                                            <td className="p-4 text-right">
                                                <div className={`font-bold ${store.lbsPerGuest > (store.target_lbs_guest || 1.76) ? 'text-[#FF9F1C]' : 'text-[#00FF94]'}`}>
                                                    {store.lbsPerGuest.toFixed(2)}
                                                </div>
                                                <div className="text-[10px] text-gray-500">
                                                    / {(store.target_lbs_guest || 1.76).toFixed(2)}
                                                </div>
                                            </td>

                                            {/* $/Guest */}
                                            <td className="p-4 text-right">
                                                <div className={`font-bold ${store.costPerGuest > (store.target_cost_guest || 9.94) ? 'text-[#FF2A6D]' : 'text-[#00FF94]'}`}>
                                                    ${store.costPerGuest.toFixed(2)}
                                                </div>
                                                <div className="text-[10px] text-gray-500">
                                                    / ${(store.target_cost_guest || 9.94).toFixed(2)}
                                                </div>
                                            </td>

                                            {/* Cost Variance */}
                                            <td className={`p-4 text-right ${store.costGuestVar > 0 ? 'text-[#FF2A6D]' : 'text-[#00FF94]'}`}>
                                                {store.costGuestVar > 0 ? '+' : ''}${store.costGuestVar.toFixed(2)}
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
                ) : (
                    <PerformanceChart data={performanceData} />
                )}
            </div>

            {/* Input Modal */}
            {showWeeklyInput && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <WeeklyInputForm
                        storeId={1} // Defaulting to 1 for network view, or user storeId
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

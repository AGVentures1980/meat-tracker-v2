import { useState, useEffect } from 'react';
import { LayoutGrid, TrendingUp, DownloadCloud, Brain, AlertTriangle, ShoppingBag, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { NetworkReportCard } from '../components/NetworkReportCard';
import { WeeklyInputForm } from '../components/WeeklyInputForm';
import { PerformanceChart } from '../components/dashboard/PerformanceChart';
import { MobileActionCenter } from '../components/MobileActionCenter';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

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

export const Dashboard = () => {
    const navigate = useNavigate();
    const [performanceData, setPerformanceData] = useState<StorePerformance[]>([]);
    const [anomalies, setAnomalies] = useState<any[]>([]);
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showWeeklyInput, setShowWeeklyInput] = useState(false);
    const [viewMode, setViewMode] = useState<'grid' | 'charts'>('grid');
    const [showMobileView, setShowMobileView] = useState(window.innerWidth < 768);

    const { user } = useAuth();
    const { t } = useLanguage();

    useEffect(() => {
        const fetchData = async () => {
            if (!user?.token) return;
            try {
                setLoading(true);
                // Parallel fetch
                const [perfRes, anomalyRes, suggestRes] = await Promise.all([
                    fetch('/api/v1/dashboard/company-stats', { headers: { 'Authorization': `Bearer ${user.token}` } }),
                    fetch('/api/v1/intelligence/anomalies', { headers: { 'Authorization': `Bearer ${user.token}` } }),
                    fetch('/api/v1/intelligence/supply-suggestions', { headers: { 'Authorization': `Bearer ${user.token}` } })
                ]);

                if (perfRes.ok) {
                    const data = await perfRes.json();
                    setPerformanceData(data.performance || []);
                }
                if (anomalyRes.ok) {
                    const data = await anomalyRes.json();
                    setAnomalies(data.anomalies || []);
                }
                if (suggestRes.ok) {
                    const data = await suggestRes.json();
                    setSuggestions(data.suggestions || []);
                }
            } catch (err) {
                console.error("Failed to fetch dashboard intelligence", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user?.token]);

    useEffect(() => {
        const handleResize = () => setShowMobileView(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    if (showMobileView) {
        return <MobileActionCenter onSwitchToDesktop={() => setShowMobileView(false)} />;
    }

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
        <>
            <div className="p-6">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                            <Brain className="text-[#C5A059] w-8 h-8" />
                            {t('analyst_title')}
                            <span className="bg-[#FF2A6D]/10 text-[#FF2A6D] text-xs px-2 py-1 rounded-none border border-[#FF2A6D]/30 uppercase tracking-widest font-mono">{t('system_version')} Predictive</span>
                        </h1>
                        <p className="text-gray-500 text-sm mt-1 font-mono uppercase tracking-wider">{t('analyst_subtitle')}</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex bg-[#1a1a1a] border border-[#333] p-1 rounded-sm items-center">
                            <span className="px-2 text-[9px] text-gray-600 font-mono uppercase tracking-tighter">View:</span>
                            <button
                                onClick={() => { console.log("Switching to Grid"); setViewMode('grid'); }}
                                className={`px-4 py-2 text-xs font-bold rounded-xs transition-all flex items-center gap-2 cursor-pointer ${viewMode === 'grid' ? 'text-white bg-[#333] shadow-lg border border-[#444]' : 'text-gray-500 hover:text-white'}`}
                            >
                                <LayoutGrid size={14} /> {t('appearance')}
                            </button>
                            <button
                                onClick={() => { console.log("Switching to Charts"); setViewMode('charts'); }}
                                className={`px-4 py-2 text-xs font-bold rounded-xs transition-all flex items-center gap-2 cursor-pointer ${viewMode === 'charts' ? 'text-white bg-[#333] shadow-lg border border-[#444]' : 'text-gray-500 hover:text-white'}`}
                            >
                                <TrendingUp size={14} /> {t('charts')}
                            </button>
                        </div>
                        <button
                            onClick={handleExport}
                            className="bg-[#C5A059] hover:bg-[#D5B069] text-black px-4 py-2 font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-2 rounded-sm active:scale-95 shadow-[0_0_20px_rgba(197,160,89,0.2)]"
                        >
                            <DownloadCloud size={16} /> {t('report_export_csv')}
                        </button>
                    </div>
                </div>

                {/* High Density Intelligence Hub */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8 animate-in slide-in-from-bottom-4">
                    {/* Column 1: Network Intel */}
                    <div className="lg:col-span-1">
                        <NetworkReportCard />
                    </div>

                    {/* Column 2: Anomalies Card */}
                    <div className="lg:col-span-1">
                        <div className="bg-[#1a1a1a] border border-[#333] border-l-4 border-l-[#FF2A6D] p-5 rounded-sm shadow-xl relative overflow-hidden h-full">
                            <div className="absolute top-0 right-0 p-4 opacity-5">
                                <AlertTriangle className="w-16 h-16" />
                            </div>
                            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                                <AlertTriangle className="text-[#FF2A6D] w-4 h-4" />
                                {t('analyst_critical_anomalies')}
                            </h3>
                            {anomalies.length > 0 ? (
                                <div className="space-y-3">
                                    {anomalies.slice(0, 3).map((a, i) => (
                                        <div key={i} className="flex justify-between items-center bg-[#121212] p-2 border border-[#333] group hover:border-[#FF2A6D]/50 transition-all cursor-pointer" onClick={() => navigate(`/dashboard/${a.storeId}`)}>
                                            <div className="truncate mr-2">
                                                <p className="text-white font-bold text-[11px] truncate tracking-tight">{a.name}</p>
                                                <p className="text-[9px] text-gray-500 uppercase font-mono">VAR: +{a.variance.toFixed(1)}%</p>
                                            </div>
                                            <div className="text-right flex-shrink-0">
                                                <p className="text-[#FF2A6D] font-mono font-bold text-[10px]">ALERT</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="h-24 flex items-center justify-center border border-dashed border-[#333] bg-[#121212]">
                                    <p className="text-[9px] text-gray-600 font-mono uppercase text-center px-2">Equilíbrio Ativo: Nenhum desvio.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Column 3-4: Supply Suggestion Card */}
                    <div className="lg:col-span-2">
                        <div className="bg-[#1a1a1a] border border-[#333] border-l-4 border-l-[#00FF94] p-5 rounded-sm shadow-xl relative overflow-hidden h-full">
                            <div className="absolute top-0 right-0 p-4 opacity-5">
                                <ShoppingBag className="w-16 h-16" />
                            </div>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                    <ShoppingBag className="text-[#00FF94] w-4 h-4" />
                                    {t('price_ocr_title')} (Supply Chain)
                                </h3>
                                <button
                                    onClick={(e) => { e.stopPropagation(); navigate('/projections'); }}
                                    className="text-[9px] text-[#C5A059] hover:underline uppercase font-bold tracking-widest"
                                >
                                    {t('procurement_intel_btn')} →
                                </button>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                {suggestions.slice(0, 4).map((s, i) => (
                                    <div key={i} className="bg-[#121212] p-2 border border-[#333] flex justify-between items-center">
                                        <div>
                                            <p className="text-[9px] text-gray-400 uppercase font-bold">{s.protein}</p>
                                            <p className="text-sm font-bold text-white">+{s.suggestedOrder} <span className="text-[9px] text-gray-500 font-normal uppercase">{s.unit}</span></p>
                                        </div>
                                        <div className={`w-1.5 h-1.5 rounded-full ${s.priority === 'High' ? 'bg-red-500 animate-pulse' : 'bg-gray-700'}`}></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Performance View */}
                {viewMode === 'grid' ? (
                    <div className="bg-[#1a1a1a] border border-[#333] rounded-sm overflow-hidden shadow-2xl">
                        <div className="p-4 border-b border-[#333] flex justify-between items-center bg-[#222]">
                            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400 flex items-center gap-2">
                                {t('executive_overview')}
                            </h3>
                            <div className="flex items-center gap-4 text-[10px] text-gray-500 font-mono">
                                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-[#00FF94]"></span> {t('analyst_verified_logic')}</span>
                                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-[#FF2A6D]"></span> {t('analyst_requires_action')}</span>
                            </div>
                        </div>

                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-[#121212] text-gray-500 text-[10px] uppercase font-mono tracking-wider border-b border-[#333]">
                                    <th className="p-4 font-normal">{t('proj_col_store')}</th>
                                    <th className="p-4 font-normal text-right">{t('projected_guests')}</th>
                                    <th className="p-4 font-normal text-right">Lbs/Guest<br /><span className="text-[9px] opacity-70">(Act / Tgt)</span></th>
                                    <th className="p-4 font-normal text-right">$/Guest<br /><span className="text-[9px] opacity-70">(Act / Tgt)</span></th>
                                    <th className="p-4 font-normal text-right">{t('price_weekly_drift')} $/Guest</th>
                                    <th className="p-4 font-normal text-right">{t('price_cost_impact')}</th>
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

                {/* Footnote Versioning */}
                <div className="mt-12 pt-8 border-t border-[#333] flex justify-between items-center opacity-30 group hover:opacity-100 transition-opacity">
                    <div>
                        <p className="text-[10px] font-mono uppercase tracking-widest text-gray-500">
                            Brasa Intelligent Systems • Engine v2.8.1-SKEWER-MASTER
                        </p>
                        <p className="text-[9px] text-gray-600 mt-1">
                            Status: {loading ? 'FETCHING' : 'READY'} • Objects: {performanceData.length} • Mode: {viewMode.toUpperCase()}
                        </p>
                    </div>
                    <p className="text-[10px] font-mono text-gray-600">
                        {new Date().toISOString()} • STABLE
                    </p>
                </div>
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
        </>
    );
};

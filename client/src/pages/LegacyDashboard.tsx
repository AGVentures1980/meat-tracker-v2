import { useState, useEffect } from 'react';
import { LayoutGrid, TrendingUp, DownloadCloud, Brain, AlertTriangle, ShoppingBag, Zap, Target } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { NetworkReportCard } from '../components/NetworkReportCard';
import { WeeklyInputForm } from '../components/WeeklyInputForm';
import { StorePerformanceTable } from '../components/StorePerformanceTable';
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
    theoreticalRevenue?: number;
    foodCostPercentage?: number;
    status: 'Optimal' | 'Warning' | 'Critical';
    
    // Alacarte fields
    actualYieldPct?: number;
    targetYieldPct?: number;
    portionVariancePct?: number;
    priceDriftPerLb?: number;
    executionImpact?: number;
}

export const LegacyDashboard = ({ scope, tenantId, role, storeId, regionId }: any) => {
    const navigate = useNavigate();
    const { storeId: routeStoreId } = useParams();
    const [performanceData, setPerformanceData] = useState<StorePerformance[]>([]);
    const [summary, setSummary] = useState<any>(null);
    const [anomalies, setAnomalies] = useState<any[]>([]);
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showWeeklyInput, setShowWeeklyInput] = useState(false);
    const [viewMode, setViewMode] = useState<'grid' | 'charts'>('grid');
    const [showMobileView, setShowMobileView] = useState(window.innerWidth < 768);

    const { user, selectedCompany } = useAuth();
    const { t } = useLanguage();

    const getMonday = (d: Date) => {
        d = new Date(d);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(d.setDate(diff));
    };

    useEffect(() => {
        const abortController = new AbortController();
        const signal = abortController.signal;

        const fetchData = async () => {
            if (!user?.token) return;
            try {
                setLoading(true);
                const mondayDate = getMonday(new Date()).toISOString().split('T')[0];
                const storeParam = storeId ? `?storeId=${storeId}&date=${mondayDate}` : `?date=${mondayDate}`;

                const headers: HeadersInit = {
                    'Authorization': `Bearer ${user.token}`
                };
                if (selectedCompany) headers['X-Company-Id'] = selectedCompany;

                // Parallel fetch
                const [perfRes, anomalyRes, suggestRes] = await Promise.all([
                    fetch(`/api/v1/dashboard/company-stats${storeId ? `?storeId=${storeId}` : ''}`, { headers, signal }),
                    fetch('/api/v1/intelligence/anomalies', { headers, signal }),
                    fetch(`/api/v1/intelligence/supply-suggestions${storeParam}`, { headers, signal })
                ]);

                if (perfRes.ok) {
                    const data = await perfRes.json();
                    if (!signal.aborted) {
                        setPerformanceData(data.performance || []);
                        setSummary(data.summary || null);
                    }
                }
                if (anomalyRes.ok) {
                    const data = await anomalyRes.json();
                    if (!signal.aborted) setAnomalies(data.anomalies || []);
                }
                if (suggestRes.ok) {
                    const data = await suggestRes.json();
                    if (!signal.aborted) setSuggestions(data.suggestions || []);
                }
            } catch (err: any) {
                if (err.name === 'AbortError') {
                    console.log('Fetch aborted - Scope changed or component unmounted');
                    return;
                }
                console.error("Failed to fetch dashboard intelligence", err);
            } finally {
                if (!signal.aborted) setLoading(false);
            }
        };

        fetchData();

        return () => {
            abortController.abort();
        };
    }, [user?.token, storeId, selectedCompany]);

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

        const headers = ["Location", "Guests", "Food Cost %", "Lbs/Guest Act", "Lbs/Guest Tgt", "$/Guest Act", "$/Guest Tgt", "Variance $", "Impact YTD", "Status"];
        const csvRows = performanceData.map(s => [
            s.name,
            s.guests,
            (s.foodCostPercentage || 0).toFixed(2) + '%',
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
                    {/* Column 1: Network Intel / Pareto Impact */}
                    <div className="lg:col-span-1">
                        {summary?.villain_impact > 0 ? (
                            <div className="bg-[#1a1a1a] border border-[#333] border-l-4 border-l-[#C5A059] p-5 rounded-sm shadow-xl relative overflow-hidden h-full">
                                <div className="absolute top-0 right-0 p-4 opacity-5">
                                    <Target className="w-16 h-16" />
                                </div>
                                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                                    <Zap className="text-[#C5A059] w-4 h-4" />
                                    Pareto Villain Impact
                                </h3>
                                <div className="mt-2">
                                    <span className="text-3xl font-black text-[#FF2A6D] tracking-tighter">
                                        ${summary.villain_impact.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                    </span>
                                    <p className="text-[9px] text-gray-500 uppercase font-mono mt-1 leading-tight">
                                        Opportunity leakage within <span className="text-white">Class A Proteins</span>. Focus on Picanha/Ribs waste.
                                    </p>
                                </div>
                                <div className="mt-4 pt-4 border-t border-white/5">
                                    <div className="flex justify-between items-center text-[10px] text-gray-500 font-mono uppercase">
                                        <span>Governance Score</span>
                                        <span className="text-[#00FF94]">84%</span>
                                    </div>
                                    <div className="w-full bg-[#333] h-1 mt-1">
                                        <div className="bg-[#00FF94] h-full" style={{ width: '84%' }}></div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <NetworkReportCard />
                        )}
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
                                        <div key={i} className={`flex justify-between items-center bg-[#121212] p-2 border ${a.type === 'QC_ALERT' ? 'border-[#FF2A6D] animate-pulse border-2' : 'border-[#333]'} group hover:border-[#FF2A6D]/50 transition-all cursor-pointer`} onClick={() => navigate(`/dashboard/${a.storeId}`)}>
                                            <div className="truncate mr-2">
                                                <p className="text-white font-bold text-[11px] truncate tracking-tight">{a.name}</p>
                                                <p className={`text-[9px] uppercase font-mono ${a.type === 'QC_ALERT' ? 'text-[#FF2A6D] font-black tracking-widest' : 'text-gray-500'}`}>
                                                    {a.type === 'QC_ALERT' ? 'GARCIA RULE TRIGGERED' : `VAR: +${a.variance.toFixed(1)}%`}
                                                </p>
                                            </div>
                                            <div className="text-right flex-shrink-0">
                                                {a.type === 'QC_ALERT' ? (
                                                    <p className="text-white bg-[#FF2A6D] px-2 py-0.5 rounded font-mono font-bold text-[10px] animate-pulse">QC ALERT</p>
                                                ) : (
                                                    <p className="text-[#FF2A6D] font-mono font-bold text-[10px]">ALERT</p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="h-24 flex items-center justify-center border border-dashed border-[#333] bg-[#121212]">
                                    <p className="text-[9px] text-gray-600 font-mono uppercase text-center px-2">ACTIVE EQUILIBRIUM: NO DEVIATION.</p>
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
                    <StorePerformanceTable data={performanceData} loading={loading} summary={summary} />
                ) : (
                    <PerformanceChart data={performanceData} />
                )}

                {/* Footnote Versioning */}
                <div className="mt-12 pt-8 border-t border-[#333] flex justify-between items-center opacity-30 group hover:opacity-100 transition-opacity">
                    <div>
                        <p className="text-[10px] font-mono uppercase tracking-widest text-gray-500">
                            Brasa Intelligent Systems • Engine v2.8.6-GARLIC-FORCE
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

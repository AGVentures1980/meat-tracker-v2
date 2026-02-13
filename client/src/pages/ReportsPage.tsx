import { useState, useEffect } from 'react';
import { FileText, Calendar, Download, Filter, Printer, Activity, Loader2, DollarSign } from 'lucide-react';

import { useLanguage } from '../context/LanguageContext';

export const ReportsPage = () => {
    const { t } = useLanguage();
    const [selectedReport, setSelectedReport] = useState('full-summary');
    const [dateRange, setDateRange] = useState('this-month');
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const reports = [
        { id: 'full-summary', name: t('report_exec_summary'), description: t('report_exec_summary_desc'), icon: FileText, color: 'text-brand-gold', endpoint: '/api/v1/reports/executive-summary' },
        { id: 'flash', name: t('report_flash'), description: t('report_flash_desc'), icon: Activity, color: 'text-[#00FF94]', endpoint: '/api/v1/reports/flash' },
        { id: 'variance', name: t('report_variance'), description: t('report_variance_desc'), icon: Filter, color: 'text-[#FF2A6D]', endpoint: '/api/v1/reports/variance' },
        { id: 'inventory', name: t('report_inventory'), description: t('report_inventory_desc'), icon: Calendar, color: 'text-blue-400', endpoint: '/api/v1/reports/variance' },
    ];

    useEffect(() => {
        const fetchReport = async () => {
            setLoading(true);
            setData(null); // Clear previous data
            try {
                const report = reports.find(r => r.id === selectedReport);
                if (!report) return;

                const token = localStorage.getItem('token');
                const response = await fetch(`${(import.meta as any).env?.VITE_API_URL || ''}${report.endpoint}?range=${dateRange}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.error || 'Failed to fetch report');
                }

                setData(result);
            } catch (error) {
                console.error('Failed to fetch report:', error);
                setData(null); // Ensure data is null so error UI triggers
            } finally {
                setLoading(false);
            }
        };

        fetchReport();
    }, [selectedReport, dateRange]);

    const handleExport = () => {
        if (!data) return;

        let csvContent = "\ufeff"; // UTF-8 BOM for Excel

        if (selectedReport === 'full-summary' && data.performance) {
            csvContent += "Location,City,Guests,Consumption,LbsPerGuest,Target,Variance,Impact,Status\n";
            data.performance.forEach((s: any) => {
                csvContent += `${s.name},${s.location},${s.guests},${s.usedQty.toFixed(2)},${s.lbsPerGuest.toFixed(2)},${s.target_lbs_guest.toFixed(2)},${s.lbsGuestVar.toFixed(2)},${s.impactYTD.toFixed(2)},${s.status}\n`;
            });
        } else if (selectedReport === 'flash' && Array.isArray(data)) {
            csvContent += "Location,City,Today Lbs,Status\n";
            data.forEach((s: any) => {
                csvContent += `${s.name},${s.location},${(s.todayLbs || 0).toFixed(2)},${s.status}\n`;
            });
        } else if (selectedReport === 'variance' && data.variance) {
            csvContent += "Protein,Actual,Ideal,Variance\n";
            data.variance.forEach((v: any) => {
                csvContent += `${v.protein},${v.actual.toFixed(2)},${v.ideal.toFixed(2)},${v.variance.toFixed(2)}\n`;
            });
        }

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `brasa_report_${selectedReport}_${dateRange}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="p-6 h-[calc(100vh-6rem)]">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                        <FileText className="w-8 h-8 text-brand-gold" />
                        {t('nav_reports_hub')}
                    </h1>
                    <p className="text-gray-500 text-sm mt-1 font-mono uppercase tracking-wider">{t('reports_subtitle')}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Report Selector */}
                <div className="bg-[#1a1a1a] border border-[#333] rounded-sm p-4 h-fit">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">{t('reports_available')}</h3>
                    <div className="space-y-2">
                        {reports.map((report) => (
                            <button
                                key={report.id}
                                onClick={() => setSelectedReport(report.id)}
                                className={`w-full text-left p-4 rounded-sm border transition-all flex items-start gap-4 group ${selectedReport === report.id
                                    ? 'bg-[#252525] border-brand-gold shadow-[0_0_15px_rgba(197,160,89,0.1)]'
                                    : 'bg-transparent border-[#333] hover:bg-[#222] hover:border-[#555]'
                                    }`}
                            >
                                <report.icon className={`w-5 h-5 mt-1 ${report.color}`} />
                                <div>
                                    <div className={`font-bold font-mono text-sm ${selectedReport === report.id ? 'text-white' : 'text-gray-300'}`}>
                                        {report.name}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1 leading-relaxed">
                                        {report.description}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Right: Report Preview & Actions */}
                <div className="lg:col-span-2 bg-[#1a1a1a] border border-[#333] rounded-sm p-8 min-h-[500px] flex flex-col">
                    <div className="flex justify-between items-start mb-6 border-b border-[#333] pb-6">
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-2">
                                {reports.find(r => r.id === selectedReport)?.name}
                            </h2>
                            <div className="flex items-center gap-4">
                                <select
                                    value={dateRange}
                                    onChange={(e) => setDateRange(e.target.value)}
                                    className="bg-[#222] border border-[#444] text-gray-300 text-xs p-2 rounded-sm focus:border-brand-gold outline-none"
                                >
                                    <option value="today">{t('report_range_today')}</option>
                                    <option value="this-week">{t('report_range_week')}</option>
                                    <option value="this-month">{t('report_range_month')}</option>
                                    <option value="last-month">{t('report_range_last_month')}</option>
                                    <option value="ytd">{t('report_range_ytd')}</option>
                                </select>
                                <span className="text-xs text-gray-500 font-mono">
                                    {t('report_generated_at')}: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
                                </span>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => window.print()} className="p-2 border border-[#444] text-gray-400 hover:text-white hover:bg-[#333] rounded-sm transition-colors" title="Print">
                                <Printer className="w-4 h-4" />
                            </button>
                            <button
                                onClick={handleExport}
                                disabled={loading || !data}
                                className="bg-brand-gold hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed text-black px-4 py-2 rounded-sm font-bold text-xs uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95"
                            >
                                <Download className="w-4 h-4" /> {t('report_export_csv')}
                            </button>
                        </div>
                    </div>

                    {/* report preview placeholder */}
                    <div className="flex-1 bg-[#121212] border border-[#333] rounded-sm p-8 flex items-center justify-center relative overflow-hidden group">
                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                        <div className="text-center relative z-10 w-full h-full flex flex-col">
                            {loading ? (
                                <div className="m-auto flex flex-col items-center gap-4">
                                    <Loader2 className="w-12 h-12 text-brand-gold animate-spin" />
                                    <p className="text-gray-500 font-mono text-xs uppercase tracking-widest">{t('analyst_scanning')}</p>
                                </div>
                            ) : data ? (
                                <div className="text-left w-full h-full flex flex-col">
                                    <div className="bg-[#1a1a1a] p-6 border border-[#333] rounded-sm flex-1 flex flex-col">
                                        <div className="flex items-center gap-3 mb-4">
                                            <FileText className="w-6 h-6 text-brand-gold" />
                                            <h4 className="text-white font-bold font-mono uppercase tracking-tighter">{t('report_data_ready')}</h4>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                            {selectedReport === 'full-summary' && data.summary && (
                                                <>
                                                    <div className="p-5 bg-[#222] border border-[#333] rounded-sm relative overflow-hidden group/card hover:border-brand-gold/50 transition-all">
                                                        <div className="absolute top-0 right-0 p-2 opacity-10 group-hover/card:opacity-20 transition-opacity">
                                                            <DollarSign className="w-12 h-12" />
                                                        </div>
                                                        <div className="text-[10px] text-gray-400 uppercase tracking-widest mb-2 font-bold">Total Estimated Spend</div>
                                                        <div className="text-2xl font-bold font-mono text-white">
                                                            ${(data.summary.total_spend || 0).toLocaleString()}
                                                        </div>
                                                    </div>
                                                    <div className="p-5 bg-[#222] border border-[#333] rounded-sm relative overflow-hidden group/card hover:border-brand-gold/50 transition-all">
                                                        <div className="text-[10px] text-gray-400 uppercase tracking-widest mb-2 font-bold">Net Variance Impact</div>
                                                        <div className={`text-2xl font-bold font-mono ${data.summary.net_impact_ytd <= 0 ? 'text-[#00FF94]' : 'text-[#FF2A6D]'}`}>
                                                            {data.summary.net_impact_ytd <= 0 ? '+' : ''}${(Math.abs(data.summary.net_impact_ytd) || 0).toLocaleString()}
                                                        </div>
                                                        <div className="text-[9px] text-gray-500 mt-1 uppercase">Below/Above Target</div>
                                                    </div>
                                                    <div className="p-5 bg-[#222] border border-[#333] rounded-sm relative overflow-hidden group/card hover:border-brand-gold/50 transition-all">
                                                        <div className="text-[10px] text-gray-400 uppercase tracking-widest mb-2 font-bold">Network Guests</div>
                                                        <div className="text-2xl font-bold font-mono text-white">
                                                            {(data.summary.total_guests || 0).toLocaleString()}
                                                        </div>
                                                    </div>
                                                </>
                                            )}

                                            {selectedReport === 'flash' && Array.isArray(data) && (
                                                <div className="col-span-3">
                                                    <div className="text-sm text-gray-400 font-mono mb-2">
                                                        {data.length} locations reporting.
                                                    </div>
                                                    <div className="h-40 bg-[#222] rounded border border-[#333] flex items-center justify-center text-gray-600 text-xs">
                                                        Flash Report Visualization Placeholder
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="mt-auto pt-6 border-t border-[#333]">
                                            <p className="text-gray-400 text-sm mb-4 max-w-lg leading-relaxed">
                                                {t('report_preview_desc')}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="m-auto text-center">
                                    <FileText className="w-16 h-16 text-gray-700 mx-auto mb-4" />
                                    <h3 className="text-gray-500 font-mono mb-2">{t('report_preview_mode')}</h3>
                                    <p className="text-gray-600 text-xs max-w-md mx-auto mb-6">
                                        Unable to load report data. Please check connection.
                                    </p>
                                    <button
                                        onClick={() => window.location.reload()}
                                        className="text-brand-gold hover:underline text-xs"
                                    >
                                        Retry Connection
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

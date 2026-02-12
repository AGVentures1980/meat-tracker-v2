import { useState } from 'react';
import { FileText, Calendar, Download, Filter, Printer, Activity } from 'lucide-react';

import { useLanguage } from '../context/LanguageContext';

export const ReportsPage = () => {
    const { t } = useLanguage();
    const [selectedReport, setSelectedReport] = useState('full-summary');
    const [dateRange, setDateRange] = useState('this-month');

    // Mock Report Data (In real app, fetch from API)
    const reports = [
        { id: 'full-summary', name: t('report_exec_summary'), description: t('report_exec_summary_desc'), icon: FileText, color: 'text-brand-gold' },
        { id: 'flash', name: t('report_flash'), description: t('report_flash_desc'), icon: Activity, color: 'text-[#00FF94]' },
        { id: 'variance', name: t('report_variance'), description: t('report_variance_desc'), icon: Filter, color: 'text-[#FF2A6D]' },
        { id: 'inventory', name: t('report_inventory'), description: t('report_inventory_desc'), icon: Calendar, color: 'text-blue-400' },
    ];

    const handleExport = () => {
        let csvContent = "data:text/csv;charset=utf-8,";

        if (selectedReport === 'full-summary') {
            csvContent += "Metric,Value,Status\n";
            csvContent += "Total Revenue,$842k,Target met\n";
            csvContent += "Avg Lbs/Guest,1.82,Warning\n";
            csvContent += "Waste Impact,-$12.4k,Action Required\n";
        } else {
            csvContent += "Date,Location,Value,Unit\n";
            csvContent += `${new Date().toLocaleDateString()},Miami,450,LBS\n`;
            csvContent += `${new Date().toLocaleDateString()},Orlando,380,LBS\n`;
        }

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
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
                            <button className="p-2 border border-[#444] text-gray-400 hover:text-white hover:bg-[#333] rounded-sm transition-colors" title="Print">
                                <Printer className="w-4 h-4" />
                            </button>
                            <button
                                onClick={handleExport}
                                className="bg-brand-gold hover:bg-yellow-500 text-black px-4 py-2 rounded-sm font-bold text-xs uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95"
                            >
                                <Download className="w-4 h-4" /> {t('report_export_csv')}
                            </button>
                        </div>
                    </div>

                    {/* report preview placeholder */}
                    <div className="flex-1 bg-[#121212] border border-[#333] rounded-sm p-8 flex items-center justify-center relative overflow-hidden group">
                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                        <div className="text-center relative z-10">
                            <FileText className="w-16 h-16 text-gray-700 mx-auto mb-4" />
                            <h3 className="text-gray-500 font-mono mb-2">{t('report_preview_mode')}</h3>
                            <p className="text-gray-600 text-xs max-w-md mx-auto">
                                {t('report_preview_desc')}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

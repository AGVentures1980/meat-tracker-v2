import { useState } from 'react';
import { FileText, Calendar, Download, Filter, Printer, Activity } from 'lucide-react';

export const ReportsPage = () => {
    const [selectedReport, setSelectedReport] = useState('full-summary');
    const [dateRange, setDateRange] = useState('this-month');

    // Mock Report Data (In real app, fetch from API)
    const reports = [
        { id: 'full-summary', name: 'Executive Summary', description: 'Complete network overview including financial impact and variance analysis.', icon: FileText, color: 'text-brand-gold' },
        { id: 'flash', name: 'Daily Flash Report', description: 'Operational metrics for the last 24 hours per location.', icon: Activity, color: 'text-[#00FF94]' },
        { id: 'variance', name: 'Variance Analysis', description: 'Deep dive into protein usage vs ideal standards.', icon: Filter, color: 'text-[#FF2A6D]' },
        { id: 'inventory', name: 'Inventory Logs', description: 'Raw inventory counts and audit trails.', icon: Calendar, color: 'text-blue-400' },
    ];

    return (
        <div className="p-6 h-[calc(100vh-6rem)]">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                        <FileText className="w-8 h-8 text-brand-gold" />
                        Reports Hub
                    </h1>
                    <p className="text-gray-500 text-sm mt-1 font-mono uppercase tracking-wider">Generate & Export Operational Intelligence</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Report Selector */}
                <div className="bg-[#1a1a1a] border border-[#333] rounded-sm p-4 h-fit">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Available Reports</h3>
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
                                    <option value="today">Today</option>
                                    <option value="this-week">This Week</option>
                                    <option value="this-month">This Month</option>
                                    <option value="last-month">Last Month</option>
                                    <option value="ytd">Year to Date</option>
                                </select>
                                <span className="text-xs text-gray-500 font-mono">
                                    Generated: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
                                </span>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button className="p-2 border border-[#444] text-gray-400 hover:text-white hover:bg-[#333] rounded-sm transition-colors" title="Print">
                                <Printer className="w-4 h-4" />
                            </button>
                            <button className="bg-brand-gold hover:bg-yellow-500 text-black px-4 py-2 rounded-sm font-bold text-xs uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95">
                                <Download className="w-4 h-4" /> Export CSV
                            </button>
                        </div>
                    </div>

                    {/* report preview placeholder */}
                    <div className="flex-1 bg-[#121212] border border-[#333] rounded-sm p-8 flex items-center justify-center relative overflow-hidden group">
                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                        <div className="text-center relative z-10">
                            <FileText className="w-16 h-16 text-gray-700 mx-auto mb-4" />
                            <h3 className="text-gray-500 font-mono mb-2">PREVIEW MODE</h3>
                            <p className="text-gray-600 text-xs max-w-md mx-auto">
                                Select a date range and click "Export CSV" to download the full detailed report.
                                Select a date range and click "Export CSV" to download the full detailed report.
                                Live data preview is disabled for this report type to preserve bandwidth.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

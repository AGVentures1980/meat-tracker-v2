import React, { useState } from 'react';
import { DashboardLayout } from '../components/layouts/DashboardLayout';
import { FileText, Calendar, Clock, TrendingUp, Download, Filter, Search, ChevronRight, BarChart3, PieChart } from 'lucide-react';

type ReportTab = 'daily' | 'weekly' | 'monthly' | 'annual';

export const ReportsPage = () => {
    const [activeTab, setActiveTab] = useState<ReportTab>('monthly');

    const tabs = [
        { id: 'daily', label: 'Daily (Flash)', icon: Clock, desc: 'Real-time usage vs sales' },
        { id: 'weekly', label: 'Weekly Variance', icon: Calendar, desc: 'Meat consumption mapping' },
        { id: 'monthly', label: 'Monthly P&L', icon: FileText, desc: 'Inventory reconciliations' },
        { id: 'annual', label: 'Annual Analytics', icon: TrendingUp, desc: 'BI & Negotiation Power' },
    ];

    const fmt = (val: number) => val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex justify-between items-end border-b border-[#333] pb-6">
                    <div>
                        <h1 className="text-3xl font-mono font-bold text-white flex items-center">
                            <FileText className="w-8 h-8 mr-4 text-brand-gold" />
                            REPORTS HUB
                        </h1>
                        <p className="text-gray-500 font-mono text-sm mt-2 uppercase tracking-widest">Multi-level Data Analysis & Export</p>
                    </div>
                    <div className="flex gap-4">
                        <button className="flex items-center gap-2 bg-[#252525] border border-[#333] px-4 py-2 text-xs font-mono text-gray-400 hover:text-white hover:border-gray-500 transition-colors">
                            <Filter className="w-4 h-4" />
                            FILTERS
                        </button>
                        <button className="flex items-center gap-2 bg-brand-gold hover:bg-yellow-500 text-black font-bold px-6 py-2 font-mono text-xs shadow-[0_0_15px_rgba(197,160,89,0.3)] transition-all">
                            <Download className="w-4 h-4" />
                            EXPORT PDF
                        </button>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="grid grid-cols-4 gap-4">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as ReportTab)}
                            className={`p-4 border transition-all text-left relative group ${activeTab === tab.id
                                ? 'bg-brand-gold/10 border-brand-gold border-b-4'
                                : 'bg-[#1a1a1a] border-[#333] hover:border-gray-600'}`}
                        >
                            <tab.icon className={`w-5 h-5 mb-3 ${activeTab === tab.id ? 'text-brand-gold' : 'text-gray-500 group-hover:text-white'}`} />
                            <h3 className={`text-sm font-bold font-mono uppercase tracking-tight ${activeTab === tab.id ? 'text-white' : 'text-gray-400 group-hover:text-white'}`}>
                                {tab.label}
                            </h3>
                            <p className="text-[10px] text-gray-600 font-mono mt-1">{tab.desc}</p>
                        </button>
                    ))}
                </div>

                {/* Active Tab Content */}
                <div className="bg-[#1a1a1a] border border-[#333] min-h-[500px] relative overflow-hidden">
                    {/* Fake Background Patterns */}
                    <div className="absolute inset-0 opacity-[0.02] pointer-events-none">
                        <div className="grid grid-cols-12 h-full">
                            {Array.from({ length: 12 }).map((_, i) => <div key={i} className="border-r border-white h-full"></div>)}
                        </div>
                    </div>

                    <div className="p-8 relative z-10">
                        {activeTab === 'monthly' && (
                            <div className="space-y-8 animate-in fade-in duration-500">
                                <div className="flex justify-between items-center">
                                    <h2 className="text-xl font-mono font-bold text-white uppercase italic">Monthly P&L Consistency Report</h2>
                                    <div className="text-xs font-mono text-gray-500">PERIOD: FEB 2026</div>
                                </div>

                                <div className="grid grid-cols-3 gap-6">
                                    <div className="bg-black/40 border-l-2 border-brand-gold p-6">
                                        <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Meat Yield %</p>
                                        <p className="text-3xl font-bold text-white font-mono">98.4%</p>
                                        <div className="mt-2 text-[10px] text-[#00FF94] flex items-center gap-1 font-mono">
                                            +0.2% VS LY <ChevronRight className="w-3 h-3" />
                                        </div>
                                    </div>
                                    <div className="bg-black/40 border-l-2 border-[#FF2A6D] p-6">
                                        <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Unaccounted Waste</p>
                                        <p className="text-3xl font-bold text-[#FF2A6D] font-mono">-$12.4K</p>
                                        <div className="mt-2 text-[10px] text-gray-600 flex items-center gap-1 font-mono uppercase">
                                            High Variance Area
                                        </div>
                                    </div>
                                    <div className="bg-black/40 border-l-2 border-blue-500 p-6">
                                        <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Process Compliance</p>
                                        <p className="text-3xl font-bold text-white font-mono">92/100</p>
                                        <div className="mt-2 text-[10px] text-blue-400 flex items-center gap-1 font-mono">
                                            OPTIMIZED OVER LAST MO.
                                        </div>
                                    </div>
                                </div>

                                <div className="border border-[#333] overflow-hidden">
                                    <table className="w-full text-left font-mono text-xs">
                                        <thead className="bg-[#252525] text-gray-400 uppercase tracking-wider">
                                            <tr>
                                                <th className="p-4 border-b border-[#333]">Store Name</th>
                                                <th className="p-4 border-b border-[#333] text-right">Lbs Used</th>
                                                <th className="p-4 border-b border-[#333] text-right">Ideal Used</th>
                                                <th className="p-4 border-b border-[#333] text-right">Efficiency</th>
                                                <th className="p-4 border-b border-[#333] text-right">Cost Imp.</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#333]">
                                            {[
                                                { name: 'Dallas (Main)', used: 12500, ideal: 12450, eff: '99.6%', imp: '-$325' },
                                                { name: 'Fort Worth', used: 9800, ideal: 9600, eff: '97.9%', imp: '-$1,300' },
                                                { name: 'Austin North', used: 11200, ideal: 11210, eff: '100.1%', imp: '+$65' },
                                                { name: 'Houston West', used: 14000, ideal: 13800, eff: '98.5%', imp: '-$2,100' },
                                            ].map((row, i) => (
                                                <tr key={i} className="hover:bg-white/5 transition-colors">
                                                    <td className="p-4 text-white font-bold">{row.name.toUpperCase()}</td>
                                                    <td className="p-4 text-right text-gray-400">{row.used.toLocaleString()}</td>
                                                    <td className="p-4 text-right text-gray-400">{row.ideal.toLocaleString()}</td>
                                                    <td className={`p-4 text-right font-bold ${parseFloat(row.eff) > 99 ? 'text-[#00FF94]' : 'text-[#FF9F1C]'}`}>
                                                        {row.eff}
                                                    </td>
                                                    <td className={`p-4 text-right font-bold ${row.imp.startsWith('-') ? 'text-[#FF2A6D]' : 'text-[#00FF94]'}`}>
                                                        {row.imp}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {activeTab !== 'monthly' && (
                            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                                <BarChart3 className="w-16 h-16 text-[#333]" />
                                <h3 className="text-xl font-mono font-bold text-gray-400 uppercase">Generating {activeTab} Intelligence...</h3>
                                <p className="text-xs text-gray-600 font-mono max-w-sm">
                                    Compiling store data and external market indexes for the {activeTab} view. This usually takes sub-seconds on the production instance.
                                </p>
                                <button className="bg-[#252525] border border-[#333] px-6 py-2 text-xs font-mono text-white hover:bg-[#333] transition-colors">
                                    FORCE REFRESH CACHE
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Activity Feed for Reports */}
                <div className="bg-[#1a1a1a] border border-[#333] p-6">
                    <h4 className="text-[10px] text-gray-500 uppercase tracking-widest mb-4 font-mono flex items-center gap-2">
                        <Clock className="w-3 h-3" />
                        Recent Report Exports
                    </h4>
                    <div className="space-y-3">
                        {[
                            { user: 'Director D.', report: 'Texas_Consolidated_Feb_2026.pdf', time: '12m ago' },
                            { user: 'Manager R.', report: 'Austin_Weekly_Flash_W9.xlsx', time: '1h ago' },
                        ].map((log, i) => (
                            <div key={i} className="flex justify-between items-center text-xs font-mono border-b border-[#2a2a2a] pb-2">
                                <div className="text-gray-300">
                                    <span className="text-brand-gold font-bold">{log.user}</span> downloaded <span className="text-white underline">{log.report}</span>
                                </div>
                                <div className="text-gray-600 italic">{log.time}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default ReportsPage;

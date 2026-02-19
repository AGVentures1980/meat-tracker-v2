import React, { useState } from 'react';
import { DashboardLayout } from '../components/layouts/DashboardLayout';
import {
    Activity,
    AlertTriangle,
    DollarSign,
    Users,
    TrendingUp
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// --- Types ---
interface NetworkMetric {
    label: string;
    value: string;
    trend: 'up' | 'down' | 'neutral';
    trendValue: string;
    icon: React.ElementType;
    color: string;
}

interface AlertItem {
    id: string;
    store: string;
    message: string;
    severity: 'critical' | 'warning';
    time: string;
}

const OwnerDashboard: React.FC = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'financials' | 'operations' | 'people'>('financials');

    // --- Mock Data (Morning Briefing) ---
    const metrics: NetworkMetric[] = [
        {
            label: 'Network Health Score',
            value: '84/100',
            trend: 'up',
            trendValue: '+2.4 vs last week',
            icon: Activity,
            color: 'text-emerald-400'
        },
        {
            label: 'Wkly Financial Leakage',
            value: '$42,500',
            trend: 'down',
            trendValue: '-15% (Improvement)',
            icon: DollarSign,
            color: 'text-rose-400'
        },
        {
            label: 'Active Critical Alerts',
            value: '3 Stores',
            trend: 'neutral',
            trendValue: 'Needs Attention',
            icon: AlertTriangle,
            color: 'text-amber-400'
        }
    ];

    // --- Mock Data (Watchlist) ---
    const watchlist: AlertItem[] = [
        { id: '1', store: 'Miami (South Beach)', message: 'Waste > 3.5% (High Variance)', severity: 'critical', time: '2h ago' },
        { id: '2', store: 'Dallas (Uptown)', message: 'No Red Book Upload', severity: 'critical', time: '4h ago' },
        { id: '3', store: 'Orlando (Intl Dr)', message: 'Labor +12% vs Projection', severity: 'warning', time: '1d ago' },
    ];

    return (
        <DashboardLayout>
            <div className="space-y-6">

                {/* --- 1. MORNING BRIEFING (Above the Fold) --- */}
                <div>
                    <h1 className="text-2xl font-bold text-white mb-2">Network Command Center</h1>
                    <p className="text-slate-400 mb-6">Tuesday, February 17, 2026 • Morning Briefing</p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {metrics.map((m, idx) => (
                            <div key={idx} className="bg-slate-800/50 border border-slate-700 p-6 rounded-xl hover:bg-slate-800/80 transition-all">
                                <div className="flex justify-between items-start mb-4">
                                    <div className={`p-3 rounded-lg bg-opacity-20 ${m.color.replace('text-', 'bg-')}`}>
                                        <m.icon className={`w-6 h-6 ${m.color}`} />
                                    </div>
                                    <span className={`flex items-center text-xs font-medium px-2 py-1 rounded-full 
                                        ${m.trend === 'up' ? 'bg-emerald-500/20 text-emerald-400' :
                                            m.trend === 'down' ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-600/20 text-slate-300'}`}>
                                        {m.trendValue}
                                    </span>
                                </div>
                                <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider">{m.label}</h3>
                                <p className="text-3xl font-bold text-white mt-1">{m.value}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* --- 2. MAIN CONTENT AREA --- */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

                    {/* LEFT COLUMN: TABS & DATA (3/4 Width) */}
                    <div className="lg:col-span-3 space-y-6">
                        {/* Tab Navigation */}
                        <div className="flex space-x-1 bg-slate-800/50 p-1 rounded-lg w-max border border-slate-700">
                            {[
                                { id: 'financials', label: 'Financials & ROI', icon: DollarSign },
                                { id: 'operations', label: 'Operations & Waste', icon: TrendingUp },
                                { id: 'people', label: 'People & Training', icon: Users },
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all
                                        ${activeTab === tab.id
                                            ? 'bg-emerald-600 text-white shadow-lg'
                                            : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
                                >
                                    <tab.icon className="w-4 h-4" />
                                    <span>{tab.label}</span>
                                </button>
                            ))}
                        </div>

                        {/* Tab Content Area */}
                        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 min-h-[400px]">
                            {activeTab === 'financials' && (
                                <div>
                                    <h3 className="text-lg font-semibold text-white mb-4">Profit Protection & ROI</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-slate-900/50 p-5 rounded-lg border border-slate-700/50">
                                            <p className="text-slate-400 text-sm">Projected Annual Savings</p>
                                            <p className="text-2xl font-bold text-emerald-400">$1.2M</p>
                                            <p className="text-xs text-slate-500 mt-1">Based on current waste reduction trend</p>
                                        </div>
                                        <div className="bg-slate-900/50 p-5 rounded-lg border border-slate-700/50">
                                            <p className="text-slate-400 text-sm">Lost Opportunity (Last 30 Days)</p>
                                            <p className="text-2xl font-bold text-rose-400">$18,400</p>
                                            <p className="text-xs text-slate-500 mt-1">Primarily Top Sirloin & Lamb Chops</p>
                                        </div>
                                    </div>

                                    <div className="mt-6 p-4 border border-dashed border-slate-700 rounded-lg text-center text-slate-500">
                                        [Chart Placeholder: Wireless Savings Trend vs Baseline]
                                    </div>
                                </div>
                            )}

                            {activeTab === 'operations' && (
                                <div>
                                    <h3 className="text-lg font-semibold text-white mb-4">Operational Excellence</h3>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead className="text-xs text-slate-400 uppercase bg-slate-900/50">
                                                <tr>
                                                    <th className="px-4 py-3">Store</th>
                                                    <th className="px-4 py-3">Waste %</th>
                                                    <th className="px-4 py-3">LBS Var.</th>
                                                    <th className="px-4 py-3">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="text-sm">
                                                <tr className="border-b border-slate-700/50">
                                                    <td className="px-4 py-3 font-medium text-white">Miami (South Beach)</td>
                                                    <td className="px-4 py-3 text-rose-400">3.8%</td>
                                                    <td className="px-4 py-3 text-slate-300">-420 lbs</td>
                                                    <td className="px-4 py-3"><span className="px-2 py-1 bg-rose-500/20 text-rose-400 text-xs rounded-full">Critical</span></td>
                                                </tr>
                                                <tr className="border-b border-slate-700/50">
                                                    <td className="px-4 py-3 font-medium text-white">Dallas (Uptown)</td>
                                                    <td className="px-4 py-3 text-amber-400">2.1%</td>
                                                    <td className="px-4 py-3 text-slate-300">-112 lbs</td>
                                                    <td className="px-4 py-3"><span className="px-2 py-1 bg-amber-500/20 text-amber-400 text-xs rounded-full">Warning</span></td>
                                                </tr>
                                                <tr>
                                                    <td className="px-4 py-3 font-medium text-white">Orlando (Intl Dr)</td>
                                                    <td className="px-4 py-3 text-emerald-400">0.8%</td>
                                                    <td className="px-4 py-3 text-slate-300">+15 lbs</td>
                                                    <td className="px-4 py-3"><span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded-full">Healthy</span></td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'people' && (
                                <div>
                                    <h3 className="text-lg font-semibold text-white mb-4">Workforce Readiness</h3>
                                    <div className="grid grid-cols-3 gap-4 mb-6">
                                        <div className="text-center p-4 bg-slate-900/30 rounded-lg">
                                            <div className="text-2xl font-bold text-white">82%</div>
                                            <div className="text-xs text-slate-400">Network Certified</div>
                                        </div>
                                        <div className="text-center p-4 bg-slate-900/30 rounded-lg">
                                            <div className="text-2xl font-bold text-white">12</div>
                                            <div className="text-xs text-slate-400">GMs Uncertified</div>
                                        </div>
                                        <div className="text-center p-4 bg-slate-900/30 rounded-lg">
                                            <div className="text-2xl font-bold text-emerald-400">94%</div>
                                            <div className="text-xs text-slate-400">Avg Exam Score</div>
                                        </div>
                                    </div>
                                    <p className="text-slate-400 text-sm">
                                        Detailed breakdown of uncertified staff by location available in the Director View.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RIGHT COLUMN: WATCHLIST (1/4 Width) */}
                    <div className="lg:col-span-1">
                        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 h-full">
                            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                                <AlertTriangle className="w-5 h-5 text-amber-400 mr-2" />
                                Watchlist
                            </h3>
                            <div className="space-y-4">
                                {watchlist.map((alert) => (
                                    <div key={alert.id} className="p-3 bg-slate-900/50 rounded-lg border border-slate-700/50 hover:border-slate-600 transition-colors cursor-pointer">
                                        <div className="flex justify-between items-start">
                                            <h4 className="text-sm font-medium text-slate-200">{alert.store}</h4>
                                            <span className={`w-2 h-2 rounded-full mt-1.5 ${alert.severity === 'critical' ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]' : 'bg-amber-500'}`}></span>
                                        </div>
                                        <p className="text-xs text-slate-400 mt-1">{alert.message}</p>
                                        <p className="text-[10px] text-slate-600 mt-2 text-right">{alert.time}</p>
                                    </div>
                                ))}
                            </div>

                            <button className="w-full mt-6 py-2 px-4 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm transition-colors border border-slate-600">
                                View All 12 Alerts
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </DashboardLayout>
    );
};

export default OwnerDashboard;

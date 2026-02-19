import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

import { Printer, TrendingDown, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';

interface ExecutiveScan {
    scanMetadata: {
        month: string;
        range: string;
        totalStoresScanned: number;
    };
    insights: {
        summaryBriefing: {
            criticalAlerts: number;
            projectedMonthlySavings: number;
            projectedMonthlyLoss: number;
            systemHealth: number;
        };
    };
    matrix: any[]; // Full store list
}

export default function CFOReport() {
    const { user } = useAuth();
    const [data, setData] = useState<ExecutiveScan | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchReport();
    }, []);

    const fetchReport = async () => {
        try {
            // In a real app, we might need a specific endpoint for the CFO report, 
            // but the analyst scan has strict financial data we need.
            const res = await fetch(`${(import.meta as any).env?.VITE_API_URL || ''}/api/v1/analyst/scan?timeframe=M`, {
                headers: { 'Authorization': `Bearer ${user?.token}` }
            });
            const data = await res.json();
            if (data.success) {
                setData(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center">Generating Financial Report...</div>;
    if (!data) return <div className="p-8 text-center text-red-500">Failed to load report data.</div>;

    const { scanMetadata, insights, matrix } = data;

    // Sort for Top/Bottom
    const sortedByWaste = [...matrix].sort((a, b) => a.impactYTD - b.impactYTD);
    const topPerformers = sortedByWaste.filter(s => s.impactYTD < 0).slice(0, 5); // Negative impact is GOOD (Savings)
    const bottomPerformers = [...matrix].sort((a, b) => b.impactYTD - a.impactYTD).slice(0, 5); // Positive impact is BAD (Loss)

    return (
        <div className="min-h-screen bg-slate-50 p-8 print:p-0 print:bg-white text-slate-900">
            {/* Print Controls (Hidden when printing) */}
            <div className="max-w-5xl mx-auto mb-8 flex justify-between items-center print:hidden">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">CFO Monthly Report</h1>
                    <p className="text-slate-500">Financial Performance & Governance Audit</p>
                </div>
                <button
                    onClick={() => window.print()}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
                >
                    <Printer size={18} />
                    Print Report
                </button>
            </div>

            {/* Report Container (A4 Ratio-ish) */}
            <div className="max-w-5xl mx-auto bg-white shadow-xl print:shadow-none p-12 rounded-xl border border-slate-200 print:border-none">

                {/* Header */}
                <header className="border-b border-slate-200 pb-8 mb-8 flex justify-between items-end">
                    <div>
                        <h2 className="text-3xl font-black tracking-tight text-slate-900 uppercase">Executive Financial Brief</h2>
                        <p className="text-slate-500 mt-2 font-medium">{scanMetadata.month} | {scanMetadata.range}</p>
                    </div>
                    <div className="text-right">
                        <h3 className="text-lg font-bold text-slate-900">CONFIDENTIAL</h3>
                        <p className="text-sm text-slate-400">Restricted Distribution</p>
                    </div>
                </header>

                {/* 1. Executive Summary Grid */}
                <section className="mb-12">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 border-l-4 border-amber-500 pl-3">Network Financials</h4>
                    <div className="grid grid-cols-3 gap-6">

                        {/* Savings Card */}
                        <div className="bg-emerald-50 p-6 rounded-lg border border-emerald-100">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-emerald-100 rounded-full text-emerald-700">
                                    <TrendingDown size={20} />
                                </div>
                                <span className="text-sm font-semibold text-emerald-800">Total Savings Detected</span>
                            </div>
                            <p className="text-3xl font-black text-slate-900">
                                ${insights.summaryBriefing.projectedMonthlySavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </p>
                            <p className="text-sm text-emerald-700 mt-1">Variance below baseline</p>
                        </div>

                        {/* Loss Card */}
                        <div className="bg-rose-50 p-6 rounded-lg border border-rose-100">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-rose-100 rounded-full text-rose-700">
                                    <TrendingUp size={20} />
                                </div>
                                <span className="text-sm font-semibold text-rose-800">Identified Leakage</span>
                            </div>
                            <p className="text-3xl font-black text-slate-900">
                                ${insights.summaryBriefing.projectedMonthlyLoss.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </p>
                            <p className="text-sm text-rose-700 mt-1">Waste above baseline</p>
                        </div>

                        {/* Health Score */}
                        <div className="bg-slate-50 p-6 rounded-lg border border-slate-100">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-slate-200 rounded-full text-slate-700">
                                    <CheckCircle size={20} />
                                </div>
                                <span className="text-sm font-semibold text-slate-700">Network Health</span>
                            </div>
                            <p className="text-3xl font-black text-slate-900">
                                {Math.round(insights.summaryBriefing.systemHealth)}%
                            </p>
                            <p className="text-sm text-slate-500 mt-1">Stores within optimal variance</p>
                        </div>

                    </div>
                </section>

                {/* 2. Top & Bottom Performers */}
                <div className="grid grid-cols-2 gap-12 mb-12">

                    {/* Top Performers */}
                    <section>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 border-l-4 border-emerald-500 pl-3">Top Performers (Efficiency Leaders)</h4>
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 text-left text-slate-400">
                                    <th className="pb-2 font-medium">Location</th>
                                    <th className="pb-2 font-medium text-right">LBS Variance</th>
                                    <th className="pb-2 font-medium text-right">Savings</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {topPerformers.map((store, i) => (
                                    <tr key={i} className="group">
                                        <td className="py-3 font-medium text-slate-700">{store.name}</td>
                                        <td className="py-3 text-right text-emerald-600">{(store.lbsGuestVar * 100).toFixed(1)}%</td>
                                        <td className="py-3 text-right font-bold text-slate-900">${Math.abs(store.impactYTD).toLocaleString()}</td>
                                    </tr>
                                ))}
                                {topPerformers.length === 0 && (
                                    <tr><td colSpan={3} className="py-4 text-center text-slate-400 italic">No savings detected yet.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </section>

                    {/* Bottom Performers */}
                    <section>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 border-l-4 border-rose-500 pl-3">Critical Watchlist (High Waste)</h4>
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 text-left text-slate-400">
                                    <th className="pb-2 font-medium">Location</th>
                                    <th className="pb-2 font-medium text-right">LBS Variance</th>
                                    <th className="pb-2 font-medium text-right">Loss Impact</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {bottomPerformers.map((store, i) => (
                                    store.impactYTD > 0 ? (
                                        <tr key={i}>
                                            <td className="py-3 font-medium text-slate-700 flex items-center gap-2">
                                                <AlertTriangle size={14} className="text-rose-500" />
                                                {store.name}
                                            </td>
                                            <td className="py-3 text-right text-rose-600">+{(store.lbsGuestVar * 100).toFixed(1)}%</td>
                                            <td className="py-3 text-right font-bold text-slate-900">${store.impactYTD.toLocaleString()}</td>
                                        </tr>
                                    ) : null
                                ))}
                                {bottomPerformers.filter(s => s.impactYTD > 0).length === 0 && (
                                    <tr><td colSpan={3} className="py-4 text-center text-slate-400 italic">No critical waste detected.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </section>

                </div>

                {/* 3. Governance Audit */}
                <section className="mb-12 bg-slate-50 rounded-lg p-6 border border-slate-100">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 border-l-4 border-blue-500 pl-3">Governance & Compliance Audit</h4>
                    <div className="flex gap-8 items-center">
                        <div className="flex-1">
                            <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                                This section tracks the completion of mandatory training certifications across the network.
                                Uncertified stores are flagged as "Operational Risk" and have restricted system access.
                            </p>
                            <div className="flex gap-4">
                                <div className="px-4 py-2 bg-white rounded border border-slate-200 shadow-sm">
                                    <span className="block text-xl font-bold text-slate-900">32</span>
                                    <span className="text-xs text-slate-500 uppercase">Active Principals</span>
                                </div>
                                <div className="px-4 py-2 bg-white rounded border border-slate-200 shadow-sm">
                                    <span className="block text-xl font-bold text-emerald-600">28</span>
                                    <span className="text-xs text-slate-500 uppercase">Certified</span>
                                </div>
                                <div className="px-4 py-2 bg-white rounded border border-slate-200 shadow-sm">
                                    <span className="block text-xl font-bold text-rose-600">4</span>
                                    <span className="text-xs text-slate-500 uppercase">Non-Compliant</span>
                                </div>
                            </div>
                        </div>
                        <div className="w-1/3 text-right">
                            {/* Placeholder for Mini Chart or specific callout */}
                            <div className="text-sm font-semibold text-slate-900">Action Required</div>
                            <p className="text-xs text-slate-500 mt-1">
                                Please direct Regional Managers to address non-compliant principals immediately.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Footer */}
                <footer className="text-center border-t border-slate-200 pt-8 text-xs text-slate-400">
                    <p>Generated by Brasa Prophet v12.0 • {new Date().toLocaleDateString()}</p>
                    <p className="mt-1">CONFIDENTIAL - DO NOT DISTRIBUTE EXTERNALLY</p>
                </footer>

            </div>
        </div>
    );
}

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { FileText, ArrowDown, Lock, ShieldCheck, DollarSign, TrendingDown, Target } from 'lucide-react';

interface RoiData {
    storeName: string;
    pilotStart: string;
    baselines: {
        loss: number;
        yield: number;
        consumption: number;
        forecast: number;
        overproduction: number; // Added from schema
    };
    actuals: {
        loss: number;
        yield: number;
        consumption: number;
        forecast: number;
    };
    financials: {
        annualVolumeLb: number;
        costPerLb: number;
        projectedSavings: number;
        saasFee: number;
        feePct: number;
    };
}

interface AnalystResponse {
    success: boolean;
    generatedAt: string;
    auditor: string;
    summary: {
        totalProjectedSavings: number;
        totalFee: number;
    };
    stores: RoiData[];
}

export const DataAnalyst = () => {
    const { user } = useAuth();
    const { t } = useLanguage();
    const [data, setData] = useState<AnalystResponse | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch('/api/v1/analyst/roi', {
                    headers: { 'Authorization': `Bearer ${user?.token}` }
                });
                const jsonData = await res.json();
                if (jsonData.success) {
                    setData(jsonData);
                }
            } catch (error) {
                console.error("Failed to fetch ROI data", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user]);

    if (loading) return <div className="p-8 text-white">Loading Official Audit...</div>;
    if (!data) return <div className="p-8 text-white">Audit System Offline.</div>;

    return (
        <div className="p-6 h-[calc(100vh-6rem)] overflow-y-auto bg-[#0a0a0a] text-white font-sans">
            {/* Header */}
            <div className="flex justify-between items-end mb-10 border-b border-[#333] pb-6">
                <div>
                    <h1 className="text-3xl font-serif text-[#C5A059] flex items-center gap-3">
                        <ShieldCheck className="fill-[#C5A059] text-black" size={32} />
                        OFFICIAL ROI AUDIT
                    </h1>
                    <p className="text-gray-500 text-xs font-mono uppercase tracking-[0.2em] mt-1">
                        Frozen Baseline Comparison • {new Date(data.generatedAt).toLocaleDateString()}
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Total Verified Savings (Annualized)</p>
                    <p className="text-4xl font-mono font-bold text-[#00FF94]">
                        ${data.summary.totalProjectedSavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </p>
                </div>
            </div>

            <div className="space-y-12">
                {data.stores.map((store, idx) => (
                    <div key={idx} className="bg-[#111] border border-[#333] rounded-sm p-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 bg-[#333] px-3 py-1 text-[10px] uppercase font-bold text-gray-400 flex items-center gap-1">
                            <Lock size={10} /> Contract Baseline: FROZEN
                        </div>

                        <h2 className="text-xl font-bold mb-6 text-white uppercase tracking-wider border-l-4 border-[#C5A059] pl-3">
                            {store.storeName} <span className="text-gray-500 text-sm font-normal">| Pilot Started: {new Date(store.pilotStart).toLocaleDateString()}</span>
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {/* 1. Baseline vs Actuals Table */}
                            <div className="md:col-span-2 bg-[#1a1a1a] rounded p-4 border border-white/5">
                                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <Target size={14} /> Operational Metrics
                                </h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-[#333] text-gray-500 text-xs font-mono text-left">
                                                <th className="py-2">Metric</th>
                                                <th className="py-2 text-[#C5A059]">Baseline (Frozen)</th>
                                                <th className="py-2 text-white">Actual (System)</th>
                                                <th className="py-2 text-right">Variance</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#333]">
                                            <tr>
                                                <td className="py-3 text-gray-400">Meat Loss %</td>
                                                <td className="py-3 font-mono text-[#C5A059]">{store.baselines.loss.toFixed(1)}%</td>
                                                <td className="py-3 font-mono text-white">{store.actuals.loss.toFixed(1)}%</td>
                                                <td className="py-3 font-mono text-right text-[#00FF94]">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <ArrowDown size={12} /> {(store.baselines.loss - store.actuals.loss).toFixed(1)}%
                                                    </div>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className="py-3 text-gray-400">Yield (Ribs)</td>
                                                <td className="py-3 font-mono text-[#C5A059]">{store.baselines.yield}%</td>
                                                <td className="py-3 font-mono text-white">{store.actuals.yield.toFixed(1)}%</td>
                                                <td className="py-3 font-mono text-right text-[#00FF94]">
                                                    +{(store.actuals.yield - store.baselines.yield).toFixed(1)}%
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className="py-3 text-gray-400">Consumption / Pax</td>
                                                <td className="py-3 font-mono text-[#C5A059]">{store.baselines.consumption} lb</td>
                                                <td className="py-3 font-mono text-white">{store.actuals.consumption} lb</td>
                                                <td className="py-3 font-mono text-right text-[#00FF94]">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <TrendingDown size={12} /> {(store.baselines.consumption - store.actuals.consumption).toFixed(2)} lb
                                                    </div>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className="py-3 text-gray-400">Forecast Accuracy</td>
                                                <td className="py-3 font-mono text-[#C5A059]">{store.baselines.forecast}%</td>
                                                <td className="py-3 font-mono text-white">{store.actuals.forecast}%</td>
                                                <td className="py-3 font-mono text-right text-[#00FF94]">
                                                    +{(store.actuals.forecast - store.baselines.forecast).toFixed(0)} pts
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* 2. Financial Impact & Fee */}
                            <div className="bg-gradient-to-br from-[#1a1a1a] to-[#222] rounded p-6 border border-[#C5A059]/30 flex flex-col justify-between">
                                <div>
                                    <h3 className="text-xs font-bold text-[#C5A059] uppercase tracking-widest mb-2 flex items-center gap-2">
                                        <DollarSign size={14} /> Financial Audit
                                    </h3>
                                    <div className="space-y-4 mt-6">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-500">Annual Volume</span>
                                            <span className="font-mono text-white">{store.financials.annualVolumeLb.toLocaleString()} lbs</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-500">Cost Baseline</span>
                                            <span className="font-mono text-white">${store.financials.costPerLb.toFixed(2)} / lb</span>
                                        </div>
                                        <div className="border-t border-[#444] my-2"></div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-white font-bold">Total Savings</span>
                                            <span className="font-mono text-xl text-[#00FF94] font-bold">
                                                ${store.financials.projectedSavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-8 bg-black/40 rounded p-4 border border-[#333]">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-[10px] text-gray-400 uppercase tracking-wider">SaaS Performance Fee ({store.financials.feePct}%)</span>
                                        <span className="text-xs font-bold text-[#C5A059] border border-[#C5A059] px-2 py-0.5 rounded-sm">INVOICE READY</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-2xl font-black text-white font-serif">
                                            ${store.financials.saasFee.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                {/* Report Footer */}
                <div className="text-center text-[10px] text-gray-600 font-mono mt-12 mb-4">
                    <p>GENERATED BY BRASA PROPHET ENGINE • AUDIT ID: {new Date().getTime()}</p>
                    <p>THIS REPORT IS A LEGALLY BINDING PERFORMANCE AUDIT PER CONTRACT S.3.1</p>
                </div>
            </div>
        </div>
    );
};

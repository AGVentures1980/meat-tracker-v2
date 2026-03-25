import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
// import { useLanguage } from '../context/LanguageContext';
import { ArrowDown, Lock, ShieldCheck, DollarSign, TrendingDown, Target } from 'lucide-react';
import { PilotTracker } from './PilotTracker';

interface RoiData {
    storeId: number;
    storeName: string;
    pilotStart: string;
    baselines: {
        loss: number;
        yield: number;
        consumption: number;
        yoyPax: number;
        trailingPax: number;
        forecast: number;
        overproduction: number;
        costPerLb: number;
    };
    actuals: {
        loss: number;
        yield: number;
        consumption: number;
        forecast: number;
        overproduction: number;
    };
    financials: {
        annualVolumeLb: number;
        costPerLb: number;
        projectedSavings: number;
        saasFee: number;
        feePct: number;
    };
    rationale?: string;
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
    const { user, selectedCompany } = useAuth();
    // const { t } = useLanguage();
    const [data, setData] = useState<AnalystResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'roi' | 'pilot'>('roi');
    const [editingStoreId, setEditingStoreId] = useState<number | null>(null);
    const [editValues, setEditValues] = useState({
        loss: 0,
        yield: 0,
        consumption: 0,
        yoyPax: 0,
        trailingPax: 0,
        forecast: 0,
        overproduction: 0,
        costPerLb: 9.50,
        annualVolume: 180000,
        pilotStart: ''
    });

    useEffect(() => {
        fetchReport();
    }, []);

    const fetchReport = async () => {
        try {
            const API_URL = (import.meta as any).env?.VITE_API_URL || '';
            const headers: any = { 'Authorization': `Bearer ${user?.token}` };
            if (selectedCompany) headers['x-company-id'] = selectedCompany;
            const res = await fetch(`${API_URL}/api/v1/analyst/roi`, {
                headers
            });
            const jsonData = await res.json();
            if (jsonData.success) setData(jsonData);
        } catch (error) {
            console.error("Failed to load ROI report", error);
        } finally {
            setLoading(false);
        }
    };

    const handleEditClick = (store: RoiData) => {
        setEditingStoreId(store.storeId);
        setEditValues({
            loss: store.baselines.loss,
            yield: store.baselines.yield,
            consumption: store.baselines.consumption,
            yoyPax: store.baselines.yoyPax,
            trailingPax: store.baselines.trailingPax,
            forecast: store.baselines.forecast,
            overproduction: store.baselines.overproduction,
            costPerLb: store.baselines.costPerLb || store.financials.costPerLb,
            annualVolume: store.financials.annualVolumeLb,
            pilotStart: store.pilotStart ? new Date(store.pilotStart).toISOString().split('T')[0] : ''
        });
    };

    const handleSave = async (storeId: number) => {
        try {
            const API_URL = (import.meta as any).env?.VITE_API_URL || '';
            const headers: any = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${user?.token}`
            };
            if (selectedCompany) headers['x-company-id'] = selectedCompany;
            await fetch(`${API_URL}/api/v1/analyst/roi/${storeId}/baselines`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({
                    baseline_loss_rate: editValues.loss,
                    baseline_yield_ribs: editValues.yield,
                    baseline_yoy_pax: editValues.yoyPax,
                    baseline_trailing_pax: editValues.trailingPax,
                    baseline_forecast_accuracy: editValues.forecast,
                    baseline_overproduction: editValues.overproduction,
                    baseline_cost_per_lb: editValues.costPerLb,
                    annual_volume_lbs: editValues.annualVolume,
                    pilot_start_date: editValues.pilotStart
                })
            });
            setEditingStoreId(null);
            // Reload data
            const headers2: any = { 'Authorization': `Bearer ${user?.token}` };
            if (selectedCompany) headers2['x-company-id'] = selectedCompany;
            const res = await fetch(`${API_URL}/api/v1/analyst/roi`, {
                headers: headers2
            });
            const jsonData = await res.json();
            if (jsonData.success) setData(jsonData);
        } catch (error) {
            console.error("Failed to save baselines", error);
            alert("Failed to save changes. Check console.");
        }
    };

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
                        BASELINE: HIGHER OF (YOY 90-DAY) OR (6-MO TRAILING LBS/GUEST) • {new Date(data.generatedAt).toLocaleDateString()}
                    </p>

                    {/* VIEW TOGGLE TABS */}
                    <div className="flex gap-6 mt-6">
                        <button 
                            onClick={() => setActiveTab('roi')} 
                            className={`text-[10px] font-bold uppercase tracking-widest pb-1 border-b-2 transition-all ${activeTab === 'roi' ? 'text-[#C5A059] border-[#C5A059]' : 'text-gray-500 border-transparent hover:text-white'}`}
                        >
                            Executive Summary
                        </button>
                        <button 
                            onClick={() => setActiveTab('pilot')} 
                            className={`text-[10px] font-bold uppercase tracking-widest pb-1 border-b-2 transition-all flex items-center gap-1 ${activeTab === 'pilot' ? 'text-[#00FF94] border-[#00FF94]' : 'text-gray-500 border-transparent hover:text-white'}`}
                        >
                            90-Day Command Center
                        </button>
                    </div>
                </div>
                {activeTab === 'roi' && (
                    <div className="text-right">
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Total Verified Savings (Annualized)</p>
                        <p className="text-4xl font-mono font-bold text-[#00FF94]">
                            ${data.summary.totalProjectedSavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </p>
                    </div>
                )}
            </div>

            {activeTab === 'pilot' ? (
                <PilotTracker />
            ) : (
                <div className="space-y-12 animate-in fade-in duration-500">
                    {data.stores.map((store, idx) => (
                    <div key={idx} className="bg-[#111] border border-[#333] rounded-sm p-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 flex">
                            {editingStoreId === store.storeId ? (
                                <div className="flex">
                                    <button
                                        onClick={() => handleSave(store.storeId)}
                                        className="bg-[#00FF94] text-black px-4 py-1 text-[10px] uppercase font-bold hover:bg-[#00cc76]"
                                    >
                                        SAVE CHANGES
                                    </button>
                                    <button
                                        onClick={() => setEditingStoreId(null)}
                                        className="bg-[#333] text-white px-4 py-1 text-[10px] uppercase font-bold hover:bg-[#444]"
                                    >
                                        CANCEL
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => handleEditClick(store)}
                                    className="bg-[#222] border border-[#00FF94]/30 px-3 py-1 text-[10px] uppercase font-bold text-[#00FF94] flex items-center gap-2 hover:bg-[#00FF94]/10 transition-colors shadow-glow"
                                >
                                    <Lock size={12} className="text-[#00FF94]" /> UNLOCK BASELINE
                                </button>
                            )}
                        </div>

                        <h2 className="text-xl font-bold mb-1 text-white uppercase tracking-wider border-l-4 border-[#C5A059] pl-3 flex items-center gap-2">
                            {store.storeName}
                            <span className="text-gray-500 text-sm font-normal">| Pilot Started:</span>
                            {editingStoreId === store.storeId ? (
                                <input
                                    type="date"
                                    className="bg-[#333] text-white text-xs px-2 py-1 rounded border border-[#555] focus:border-[#C5A059] outline-none"
                                    value={editValues.pilotStart}
                                    onChange={(e) => setEditValues({ ...editValues, pilotStart: e.target.value })}
                                />
                            ) : (
                                <span className="text-gray-500 text-sm font-normal">{new Date(store.pilotStart).toLocaleDateString()}</span>
                            )}
                        </h2>
                        {store.rationale && (
                            <p className="text-[10px] text-gray-500 ml-4 mb-6 uppercase tracking-wider">{store.rationale}</p>
                        )}

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
                                            {/* Loss Rate */}
                                            <tr>
                                                <td className="py-3 text-gray-400">Meat Loss %</td>
                                                <td className="py-3 font-mono text-[#C5A059]">
                                                    {editingStoreId === store.storeId ? (
                                                        <input
                                                            type="number"
                                                            className="bg-[#333] text-white w-20 px-1 py-0.5 rounded border border-[#555] focus:border-[#C5A059] outline-none"
                                                            value={editValues.loss}
                                                            onChange={(e) => setEditValues({ ...editValues, loss: parseFloat(e.target.value) })}
                                                        />
                                                    ) : (
                                                        `${store.baselines.loss.toFixed(1)}%`
                                                    )}
                                                </td>
                                                <td className="py-3 font-mono text-white">{store.actuals.loss.toFixed(1)}%</td>
                                                <td className="py-3 font-mono text-right text-[#00FF94]">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <ArrowDown size={12} /> {(store.baselines.loss - store.actuals.loss).toFixed(1)}%
                                                    </div>
                                                </td>
                                            </tr>

                                            {/* Yield */}
                                            <tr>
                                                <td className="py-3 text-gray-400">Yield (Thickness & Trim)</td>
                                                <td className="py-3 font-mono text-[#C5A059]">
                                                    {editingStoreId === store.storeId ? (
                                                        <input
                                                            type="number"
                                                            className="bg-[#333] text-white w-20 px-1 py-0.5 rounded border border-[#555] focus:border-[#C5A059] outline-none"
                                                            value={editValues.yield}
                                                            onChange={(e) => setEditValues({ ...editValues, yield: parseFloat(e.target.value) })}
                                                        />
                                                    ) : (
                                                        `${store.baselines.yield}%`
                                                    )}
                                                </td>
                                                <td className="py-3 font-mono text-white">{store.actuals.yield.toFixed(1)}%</td>
                                                <td className="py-3 font-mono text-right text-[#00FF94]">
                                                    +{(store.actuals.yield - store.baselines.yield).toFixed(1)}%
                                                </td>
                                            </tr>

                                            {/* Consumption */}
                                            <tr>
                                                <td className="py-3 text-gray-400">
                                                    <div>Consumption (Active Baseline)</div>
                                                    <div className="text-[10px] text-gray-600 mt-1 pl-2">↳ YoY 90-Day (lbs/cx)</div>
                                                    <div className="text-[10px] text-gray-600 pl-2">↳ 6-Mo Trailing (lbs/cx)</div>
                                                </td>
                                                <td className="py-3 font-mono text-[#C5A059]">
                                                    <div className="mb-2">{store.baselines.consumption} lb</div>
                                                    {editingStoreId === store.storeId ? (
                                                        <>
                                                            <input
                                                                type="number"
                                                                step="0.01"
                                                                className="bg-[#333] mb-1 text-white w-20 px-1 py-0.5 rounded border border-[#555] focus:border-[#C5A059] outline-none text-[10px]"
                                                                value={editValues.yoyPax}
                                                                onChange={(e) => setEditValues({ ...editValues, yoyPax: parseFloat(e.target.value) })}
                                                            /><br />
                                                            <input
                                                                type="number"
                                                                step="0.01"
                                                                className="bg-[#333] text-white w-20 px-1 py-0.5 rounded border border-[#555] focus:border-[#C5A059] outline-none text-[10px]"
                                                                value={editValues.trailingPax}
                                                                onChange={(e) => setEditValues({ ...editValues, trailingPax: parseFloat(e.target.value) })}
                                                            />
                                                        </>
                                                    ) : (
                                                        <>
                                                            <div className="text-[10px] text-gray-500 mb-1">{store.baselines.yoyPax} lb</div>
                                                            <div className="text-[10px] text-gray-500">{store.baselines.trailingPax} lb</div>
                                                        </>
                                                    )}
                                                </td>
                                                <td className="py-3 font-mono text-white align-top">{store.actuals.consumption} lb</td>
                                                <td className="py-3 font-mono text-right text-[#00FF94] align-top">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <TrendingDown size={12} /> {(store.baselines.consumption - store.actuals.consumption).toFixed(2)} lb
                                                    </div>
                                                </td>
                                            </tr>

                                            {/* Forecast */}
                                            <tr>
                                                <td className="py-3 text-gray-400">Forecast Accuracy</td>
                                                <td className="py-3 font-mono text-[#C5A059]">
                                                    {editingStoreId === store.storeId ? (
                                                        <input
                                                            type="number"
                                                            className="bg-[#333] text-white w-20 px-1 py-0.5 rounded border border-[#555] focus:border-[#C5A059] outline-none"
                                                            value={editValues.forecast}
                                                            onChange={(e) => setEditValues({ ...editValues, forecast: parseFloat(e.target.value) })}
                                                        />
                                                    ) : (
                                                        `${store.baselines.forecast}%`
                                                    )}
                                                </td>
                                                <td className="py-3 font-mono text-white">{store.actuals.forecast}%</td>
                                                <td className="py-3 font-mono text-right text-[#00FF94]">
                                                    +{(store.actuals.forecast - store.baselines.forecast).toFixed(0)} pts
                                                </td>
                                            </tr>

                                            {/* Overproduction */}
                                            <tr>
                                                <td className="py-3 text-gray-400">Overproduction %</td>
                                                <td className="py-3 font-mono text-[#C5A059]">
                                                    {editingStoreId === store.storeId ? (
                                                        <input
                                                            type="number"
                                                            className="bg-[#333] text-white w-20 px-1 py-0.5 rounded border border-[#555] focus:border-[#C5A059] outline-none"
                                                            value={editValues.overproduction}
                                                            onChange={(e) => setEditValues({ ...editValues, overproduction: parseFloat(e.target.value) })}
                                                        />
                                                    ) : (
                                                        `${store.baselines.overproduction}%`
                                                    )}
                                                </td>
                                                <td className="py-3 font-mono text-white">{store.actuals.overproduction ? store.actuals.overproduction.toFixed(1) : 0}%</td>
                                                <td className="py-3 font-mono text-right text-[#00FF94]">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <ArrowDown size={12} /> {(store.baselines.overproduction - (store.actuals.overproduction || 0)).toFixed(1)}%
                                                    </div>
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
                                            {editingStoreId === store.storeId ? (
                                                <div className="flex items-center">
                                                    <input
                                                        type="number"
                                                        className="bg-[#333] text-white w-24 px-1 py-0.5 font-mono rounded border border-[#555] focus:border-[#C5A059] outline-none text-right"
                                                        value={editValues.annualVolume}
                                                        onChange={(e) => setEditValues({ ...editValues, annualVolume: parseInt(e.target.value) })}
                                                    />
                                                    <span className="text-gray-500 text-xs ml-1">lbs</span>
                                                </div>
                                            ) : (
                                                <span className="font-mono text-white">{store.financials.annualVolumeLb.toLocaleString()} lbs</span>
                                            )}
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-500">Cost Baseline</span>
                                            {editingStoreId === store.storeId ? (
                                                <div className="flex items-center">
                                                    <span className="text-[#C5A059] mr-1">$</span>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        className="bg-[#333] text-white w-20 px-1 py-0.5 font-mono rounded border border-[#555] focus:border-[#C5A059] outline-none"
                                                        value={editValues.costPerLb}
                                                        onChange={(e) => setEditValues({ ...editValues, costPerLb: parseFloat(e.target.value) })}
                                                    />
                                                    <span className="text-gray-500 text-xs ml-1">/ lb</span>
                                                </div>
                                            ) : (
                                                <span className="font-mono text-white">${store.financials.costPerLb.toFixed(2)} / lb</span>
                                            )}
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
            )}
        </div>
    );
};

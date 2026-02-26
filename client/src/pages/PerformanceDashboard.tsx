import { useState, useEffect } from 'react';
import { TrendingUp, Users, AlertTriangle, CheckCircle, Download, DollarSign, Target, ArrowDown, Lock, TrendingDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

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

export const PerformanceDashboard = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [auditData, setAuditData] = useState<any>(null);
    const [roiData, setRoiData] = useState<any>(null);
    const [stores, setStores] = useState<any[]>([]);
    const [filter, setFilter] = useState('ALL'); // ALL, HEALTHY, RISK, CRITICAL

    // State for Unlock Baseline / Editing
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

    const fetchData = async () => {
        try {
            setLoading(true);
            const [perfRes, roiRes] = await Promise.all([
                fetch(`${(import.meta as any).env?.VITE_API_URL || ''}/api/v1/dashboard/performance-audit`, {
                    headers: { 'Authorization': `Bearer ${user?.token}` }
                }),
                fetch(`${(import.meta as any).env?.VITE_API_URL || ''}/api/v1/analyst/roi`, {
                    headers: { 'Authorization': `Bearer ${user?.token}` }
                })
            ]);

            const perfData = await perfRes.json();
            const roiJson = await roiRes.json();

            if (perfData.network) {
                setAuditData(perfData);
                setStores(perfData.network.stores);
            }
            if (roiJson.success) {
                setRoiData(roiJson);
            }
        } catch (err) {
            console.error("Failed to fetch performance or ROI data", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [user?.token]);

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
            await fetch(`${(import.meta as any).env?.VITE_API_URL || ''}/api/v1/analyst/roi/${storeId}/baselines`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user?.token}`
                },
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
            // Refresh data to reflect changes
            await fetchData();
        } catch (error) {
            console.error("Failed to save baselines", error);
            alert("Failed to save changes. Check console.");
        }
    };

    const filteredStores = stores.filter(s => {
        if (filter === 'ALL') return true;
        return s.status === filter;
    });

    // Calculate Aggregates
    const totalStores = stores.length;
    const healthyCount = stores.filter(s => s.status === 'HEALTHY').length;
    const riskCount = stores.filter(s => s.status === 'RISK').length;
    const criticalCount = stores.filter(s => s.status === 'CRITICAL').length;

    // Calculate global ROI
    const totalSavings = auditData?.network?.totalLikelySavings || 0;

    if (loading) return <div className="p-10 text-white text-center animate-pulse">Loading Corporate Performance Data...</div>;

    return (
        <div className="p-6 md:p-10 min-h-screen bg-[#121212] text-white">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
                <div>
                    <h1 className="text-3xl font-black text-white uppercase tracking-tight">Performance Audit</h1>
                    <p className="text-gray-400 mt-1">ROI & Operational Excellence Scorecard</p>
                </div>
                <div className="flex gap-2">
                    <button className="px-4 py-2 bg-[#C5A059] text-black font-bold uppercase tracking-widest text-xs rounded hover:bg-[#d4b06a] flex items-center gap-2">
                        <Download className="w-4 h-4" /> Export Report
                    </button>
                </div>
            </div>

            {/* HIGH LEVEL KPI: ROI */}
            <div className="bg-gradient-to-r from-[#1a1a1a] to-[#252525] border border-[#C5A059]/30 p-8 rounded-xl mb-10 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-10 opacity-5">
                    <DollarSign className="w-64 h-64 text-[#C5A059]" />
                </div>
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="bg-[#C5A059]/20 text-[#C5A059] px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest">Projected Annual Savings</span>
                        </div>
                        <div className="text-5xl md:text-6xl font-black text-white tracking-tighter">
                            ${totalSavings.toLocaleString()}
                        </div>
                        <p className="text-sm text-gray-400 mt-2">
                            Potential savings identified by closing the gap between
                            <span className="text-white font-bold ml-1">Baseline Loss ({auditData?.baseline?.loss}%)</span> and
                            <span className="text-[#C5A059] font-bold ml-1">Current Execution</span>.
                        </p>
                    </div>

                    <div className="flex gap-8">
                        <div className="text-center">
                            <div className="text-3xl font-bold text-green-500">{healthyCount}</div>
                            <div className="text-[10px] text-gray-500 uppercase tracking-widest">Healthy Stores</div>
                        </div>
                        <div className="text-center">
                            <div className="text-3xl font-bold text-yellow-500">{riskCount}</div>
                            <div className="text-[10px] text-gray-500 uppercase tracking-widest">At Risk</div>
                        </div>
                        <div className="text-center">
                            <div className="text-3xl font-bold text-red-500">{criticalCount}</div>
                            <div className="text-[10px] text-gray-500 uppercase tracking-widest">Critical</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Audit Table */}
            <div className="bg-[#1a1a1a] border border-[#333] rounded-xl overflow-hidden mb-12">
                <div className="p-6 border-b border-[#333] flex flex-col md:flex-row justify-between items-center gap-4">
                    <h3 className="font-bold text-white flex items-center gap-2">
                        <Target className="w-5 h-5 text-[#C5A059]" /> Network Performance
                    </h3>
                    <div className="flex gap-2">
                        {['ALL', 'HEALTHY', 'RISK', 'CRITICAL'].map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-colors ${filter === f ? 'bg-white text-black' : 'bg-[#222] text-gray-500 hover:text-white'}`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#222] text-xs font-mono text-gray-500 uppercase tracking-wider">
                                <th className="p-4 border-b border-[#333]">Store Name</th>
                                <th className="p-4 border-b border-[#333] text-center">Certification</th>
                                <th className="p-4 border-b border-[#333] text-center">Waste %</th>
                                <th className="p-4 border-b border-[#333] text-center">Status</th>
                                <th className="p-4 border-b border-[#333] text-right">Proj. Savings</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#333]">
                            {filteredStores.map((store) => (
                                <tr key={store.id} className="hover:bg-white/5 transition-colors">
                                    <td className="p-4">
                                        <div className="font-bold text-white text-sm">{store.name}</div>
                                        <div className="text-[10px] text-gray-500">Avg Score: {store.avgScore}%</div>
                                    </td>
                                    <td className="p-4 text-center">
                                        <div className="inline-flex flex-col items-center gap-1">
                                            <div className="w-24 h-1.5 bg-[#333] rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full ${store.certifiedPct >= 80 ? 'bg-green-500' : 'bg-red-500'}`}
                                                    style={{ width: `${store.certifiedPct}%` }}
                                                />
                                            </div>
                                            <span className="text-[10px] font-mono text-gray-400">{store.certifiedPct}% Staff</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className={`text-sm font-black font-mono ${store.wastePct > 5.0 ? 'text-red-500' : 'text-green-500'}`}>
                                            {store.wastePct}%
                                        </span>
                                        <div className="text-[9px] text-gray-600">Target: 5.0%</div>
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className={`
                                            px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest
                                            ${store.status === 'HEALTHY' ? 'bg-green-500/10 text-green-500 border border-green-500/30' : ''}
                                            ${store.status === 'RISK' ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/30' : ''}
                                            ${store.status === 'CRITICAL' ? 'bg-red-500/10 text-red-500 border border-red-500/30' : ''}
                                        `}>
                                            {store.status}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right">
                                        <span className="text-sm font-mono text-[#C5A059]">
                                            ${store.savings.toLocaleString()}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Detailed ROI Baseline Editor */}
            {roiData && roiData.stores && roiData.stores.length > 0 && (
                <div>
                    <h2 className="text-2xl font-bold mb-6 text-white uppercase tracking-tight flex items-center gap-2">
                        <DollarSign className="w-6 h-6 text-[#C5A059]" /> Store Actuals & Baselines
                    </h2>
                    <div className="space-y-12">
                        {roiData.stores.map((store: RoiData, idx: number) => (
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
                                                                `${store.baselines.loss?.toFixed(1) || 0}%`
                                                            )}
                                                        </td>
                                                        <td className="py-3 font-mono text-white">{store.actuals.loss?.toFixed(1) || 0}%</td>
                                                        <td className="py-3 font-mono text-right text-[#00FF94]">
                                                            <div className="flex items-center justify-end gap-1">
                                                                <ArrowDown size={12} /> {((store.baselines.loss || 0) - (store.actuals.loss || 0)).toFixed(1)}%
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
                                                                `${store.baselines.yield || 0}%`
                                                            )}
                                                        </td>
                                                        <td className="py-3 font-mono text-white">{store.actuals.yield?.toFixed(1) || 0}%</td>
                                                        <td className="py-3 font-mono text-right text-[#00FF94]">
                                                            +{((store.actuals.yield || 0) - (store.baselines.yield || 0)).toFixed(1)}%
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
                                                            <div className="mb-2">{store.baselines.consumption || 0} lb</div>
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
                                                                    <div className="text-[10px] text-gray-500 mb-1">{store.baselines.yoyPax || 0} lb</div>
                                                                    <div className="text-[10px] text-gray-500">{store.baselines.trailingPax || 0} lb</div>
                                                                </>
                                                            )}
                                                        </td>
                                                        <td className="py-3 font-mono text-white align-top">{store.actuals.consumption || 0} lb</td>
                                                        <td className="py-3 font-mono text-right text-[#00FF94] align-top">
                                                            <div className="flex items-center justify-end gap-1">
                                                                <TrendingDown size={12} /> {((store.baselines.consumption || 0) - (store.actuals.consumption || 0)).toFixed(2)} lb
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
                                                                `${store.baselines.forecast || 0}%`
                                                            )}
                                                        </td>
                                                        <td className="py-3 font-mono text-white">{store.actuals.forecast || 0}%</td>
                                                        <td className="py-3 font-mono text-right text-[#00FF94]">
                                                            +{((store.actuals.forecast || 0) - (store.baselines.forecast || 0)).toFixed(0)} pts
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
                                                                `${store.baselines.overproduction || 0}%`
                                                            )}
                                                        </td>
                                                        <td className="py-3 font-mono text-white">{store.actuals.overproduction ? store.actuals.overproduction.toFixed(1) : 0}%</td>
                                                        <td className="py-3 font-mono text-right text-[#00FF94]">
                                                            <div className="flex items-center justify-end gap-1">
                                                                <ArrowDown size={12} /> {((store.baselines.overproduction || 0) - (store.actuals.overproduction || 0)).toFixed(1)}%
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
                                                        <span className="font-mono text-white">{(store.financials.annualVolumeLb || 0).toLocaleString()} lbs</span>
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
                                                        <span className="font-mono text-white">${(store.financials.costPerLb || 0).toFixed(2)} / lb</span>
                                                    )}
                                                </div>
                                                <div className="border-t border-[#444] my-2"></div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-white font-bold">Total Savings</span>
                                                    <span className="font-mono text-xl text-[#00FF94] font-bold">
                                                        ${(store.financials.projectedSavings || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-8 bg-black/40 rounded p-4 border border-[#333]">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-[10px] text-gray-400 uppercase tracking-wider">SaaS Performance Fee ({store.financials.feePct || 0}%)</span>
                                                <span className="text-xs font-bold text-[#C5A059] border border-[#C5A059] px-2 py-0.5 rounded-sm">INVOICE READY</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-2xl font-black text-white font-serif">
                                                    ${(store.financials.saasFee || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};


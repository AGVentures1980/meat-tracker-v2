import { useState, useEffect } from 'react';
import { TrendingUp, Users, AlertTriangle, CheckCircle, Download, DollarSign, Target } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const PerformanceDashboard = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [auditData, setAuditData] = useState<any>(null);
    const [stores, setStores] = useState<any[]>([]);
    const [filter, setFilter] = useState('ALL'); // ALL, HEALTHY, RISK, CRITICAL

    useEffect(() => {
        const fetchAudit = async () => {
            try {
                const res = await fetch(`${(import.meta as any).env?.VITE_API_URL || ''}/api/v1/dashboard/performance-audit`, {
                    headers: { 'Authorization': `Bearer ${user?.token}` }
                });
                const data = await res.json();
                if (data.network) {
                    setAuditData(data);
                    setStores(data.network.stores);
                }
            } catch (err) {
                console.error("Failed to fetch performance audit", err);
            } finally {
                setLoading(false);
            }
        };
        fetchAudit();
    }, [user?.token]);

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
            <div className="bg-[#1a1a1a] border border-[#333] rounded-xl overflow-hidden">
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
        </div>
    );
};

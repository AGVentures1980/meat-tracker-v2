import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export interface StorePerformance {
    id: number;
    name: string;
    location: string;
    guests: number;
    usedQty: number; // lbs
    usedValue: number; // $
    costPerLb: number;
    costPerGuest: number;
    lbsPerGuest: number;
    lbsGuestVar: number; // Variance from 1.76
    target_lbs_guest?: number; // Dynamic Target
    target_cost_guest?: number; // Dynamic Cost Target
    costGuestVar: number; // Variance from Plan
    impactYTD: number;
    theoreticalRevenue?: number;
    foodCostPercentage?: number;
    status: 'Optimal' | 'Warning' | 'Critical';
    
    // Alacarte fields
    actualYieldPct?: number;
    targetYieldPct?: number;
    portionVariancePct?: number;
    priceDriftPerLb?: number;
    executionImpact?: number;
}

interface StorePerformanceTableProps {
    data: StorePerformance[];
    loading?: boolean;
    summary?: any;
}

export const StorePerformanceTable = ({ data, loading, summary }: StorePerformanceTableProps) => {
    const navigate = useNavigate();

    // Helper for Summing Up Totals
    const totalGuests = data.reduce((acc, s) => acc + s.guests, 0);
    const totalMeat = data.reduce((acc, s) => acc + s.usedQty, 0);
    const totalImpact = data.reduce((acc, s) => acc + s.impactYTD, 0); // Positive impact = loss/shrinkage
    const avgLbsGuest = totalGuests > 0 ? totalMeat / totalGuests : 0;

    const totalNetworkSavings = -totalImpact; // Invert so positive is savings

    // Helper to calculate a proxy Daily Score out of 100 based on variance
    const getDailyScore = (store: StorePerformance) => {
        let score = 100;
        if (store.lbsGuestVar > 0) {
            // Penalize score for over-portioning
            const penalty = (store.lbsGuestVar / 1.76) * 100; // 1.76 is a proxy baseline
            score -= penalty * 1.5; 
        } else if (store.lbsGuestVar < 0) {
            // Slight boost for saving
            score += 2;
        }
        // if (store.hasQCAlert) score -= 15;
        return Math.max(0, Math.min(100, score));
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading Executive Command Center...</div>;

    return (
        <div className="bg-[#1E1E1E] rounded-xl border border-white/5 overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-black/80 to-[#111]">
                <div>
                    <h3 className="text-2xl font-serif font-bold text-white tracking-wide">Profitability Command Center</h3>
                    <p className="text-gray-400 text-sm mt-1">Real-Time Yield Savings vs. Operational Shrinkage</p>
                </div>
                <div className="flex space-x-2">
                    <div className={`px-4 py-2 rounded border uppercase tracking-wider font-bold text-sm shadow-inner flex items-center gap-2 ${totalNetworkSavings < 0 ? 'bg-red-900/40 text-red-400 border-red-900/50' : 'bg-green-900/20 text-green-400 border-green-900/40'}`}>
                        {totalNetworkSavings < 0 ? <ArrowDownRight size={18} /> : <ArrowUpRight size={18} />}
                        Net Network {totalNetworkSavings < 0 ? 'Shrinkage' : 'Yield Savings'}: 
                        {totalNetworkSavings < 0 ? '-$' : '+$'}{Math.abs(totalNetworkSavings).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto text-[11px] uppercase tracking-wide">
                <table className="w-full text-left border-collapse">
                    <thead>
                        {/* Top Header Row */}
                        <tr className="bg-[#0a0a0a] text-gray-500 border-b border-white/10">
                            <th colSpan={3} className="px-4 py-2 border-r border-white/10 text-center font-bold">Store Execution</th>
                            <th colSpan={4} className="px-4 py-2 border-r border-white/10 text-center font-bold bg-blue-900/10 text-blue-300">Consumption Metrics</th>
                            <th colSpan={1} className="px-4 py-2 text-center font-bold bg-brand-gold/10 text-brand-gold">Executive Financials</th>
                        </tr>
                        {/* Sub Header Row */}
                        <tr className="bg-[#111] text-gray-400 font-bold border-b border-white/10">
                            <th className="px-4 py-4 w-12">ID</th>
                            <th className="px-4 py-4 w-48 border-r border-white/10">Restaurant</th>
                            <th className="px-4 py-4 text-center border-r border-white/10">Daily Score</th>

                            <th className="px-4 py-4 text-right">Lbs / Guest</th>
                            <th className="px-4 py-4 text-right">Cost / Guest</th>
                            <th className="px-4 py-4 text-right border-r border-white/10">Variance (Lbs)</th>

                            <th className="px-4 py-4 text-right text-brand-gold bg-black/20 text-sm">Yield Savings / (Shrinkage)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-mono text-sm shadow-inner">
                        {data.map((store) => {
                            const score = getDailyScore(store);
                            const isShrinkage = store.impactYTD > 0;
                            const financialAmount = Math.abs(store.impactYTD);

                            return (
                                <tr key={store.id} className="hover:bg-white/5 transition-colors group">
                                    <td className="px-4 py-4 text-gray-500">{store.id}</td>
                                    <td className="px-4 py-4 text-white font-bold border-r border-white/10 truncate">
                                        <div className="flex items-center justify-between">
                                            <span>{store.name}</span>
                                            {store.hasQCAlert && (
                                                <span className="flex h-3 w-3 relative" title="QC Alert / Inventory Anomaly">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-[#FF2A6D]"></span>
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    
                                    <td className="px-4 py-4 text-center border-r border-white/10">
                                        <div className={`inline-flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                                            score >= 90 ? 'border-green-500 text-green-400 bg-green-900/20' :
                                            score >= 75 ? 'border-yellow-500 text-yellow-400 bg-yellow-900/20' :
                                            'border-red-500 text-red-400 bg-red-900/20'
                                        }`}>
                                            <span className="font-bold text-sm">{score.toFixed(0)}</span>
                                        </div>
                                    </td>

                                    <td className={`px-4 py-4 text-right font-bold ${store.lbsPerGuest > 1.8 ? 'text-red-400' : 'text-green-400'}`}>
                                        {store.lbsPerGuest.toFixed(2)}
                                    </td>
                                    <td className="px-4 py-4 text-right text-gray-300">${store.costPerGuest.toFixed(2)}</td>
                                    
                                    <td className="px-4 py-4 text-right border-r border-white/10">
                                        <span className={`px-2 py-1 rounded ${store.lbsGuestVar > 0 ? 'bg-red-900/30 text-red-400' : store.lbsGuestVar < 0 ? 'bg-green-900/20 text-green-400' : 'text-gray-500'}`}>
                                            {store.lbsGuestVar > 0 ? '+' : ''}{store.lbsGuestVar.toFixed(2)} lbs
                                        </span>
                                    </td>

                                    <td className={`px-4 py-4 text-right font-bold bg-black/20 ${isShrinkage ? 'text-red-500' : 'text-green-400'}`}>
                                        <div className="flex items-center justify-end gap-2">
                                            {isShrinkage ? (
                                                <>
                                                    <span className="text-[10px] tracking-widest uppercase border border-red-500/30 bg-red-900/20 px-1 py-0.5 rounded">Shrinkage</span>
                                                    <span>-${financialAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                                </>
                                            ) : (
                                                <>
                                                    <span className="text-[10px] tracking-widest uppercase border border-green-500/30 bg-green-900/20 px-1 py-0.5 rounded text-green-500">Yield Savings</span>
                                                    <span>+${financialAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {/* Grand Total Row */}
                        <tr className="bg-[#080808] font-bold border-t border-white/20 text-white text-sm">
                            <td colSpan={3} className="px-4 py-5 text-right uppercase tracking-widest border-r border-white/10 text-gray-400">Network Grand Total</td>
                            <td className="px-4 py-5 text-right">{avgLbsGuest.toFixed(2)}</td>
                            <td className="px-4 py-5 text-right text-gray-500">-</td>
                            <td className="px-4 py-5 text-right border-r border-white/10 text-gray-500">-</td>
                            <td className={`px-4 py-5 text-right text-lg ${totalNetworkSavings < 0 ? 'text-red-500 bg-red-900/10' : 'text-green-500 bg-green-900/10'}`}>
                                {totalNetworkSavings < 0 ? 'SHRINKAGE: -$' : 'SAVINGS: +$'}{Math.abs(totalNetworkSavings).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
};

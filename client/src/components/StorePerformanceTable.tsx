import React, { useEffect, useState } from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

interface StoreData {
    id: number;
    name: string;
    location: string;
    // Week Actual
    guests: number;
    usedQty: number; // Lbs
    usedValue: number; // $
    costPerLb: number; // $ / Lbs
    costPerGuest: number; // $ / Guest
    lbsPerGuest: number; // Lbs / Guest
    // Var to Plan
    lbsGuestVar: number;
    costGuestVar: number;
    // Impact
    impactYTD: number;
    status: 'Optimal' | 'Warning' | 'Critical';
}

export const StorePerformanceTable = () => {
    const [data, setData] = useState<StoreData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Check if running in Vite dev mode or Production
                const baseUrl = '/api/v1';
                const res = await fetch(`${baseUrl}/dashboard/bi-network`);

                if (res.ok) {
                    const realData = await res.json();
                    setData(realData);
                } else {
                    console.error('Failed to fetch BI data');
                }
            } catch (err) {
                console.error('Error loading BI data:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // Helper for Summing Up Totals
    const totalGuests = data.reduce((acc, s) => acc + s.guests, 0);
    const totalMeat = data.reduce((acc, s) => acc + s.usedQty, 0);
    const totalValue = data.reduce((acc, s) => acc + s.usedValue, 0);
    const totalImpact = data.reduce((acc, s) => acc + s.impactYTD, 0);
    const avgLbsGuest = totalGuests > 0 ? totalMeat / totalGuests : 0;

    if (loading) return <div className="p-8 text-center text-gray-500">Loading Network Intelligence...</div>;

    return (
        <div className="bg-[#1E1E1E] rounded-xl border border-white/5 overflow-hidden">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-black/40">
                <div>
                    <h3 className="text-xl font-serif font-bold text-white tracking-wide">Network Performance Report</h3>
                    <p className="text-gray-400 text-sm">Weekly Actuals vs Plan • Cost Impact Analysis</p>
                </div>
                <div className="flex space-x-2">
                    <div className={`px-3 py-1 rounded text-xs border uppercase tracking-wider font-bold ${totalImpact > 0 ? 'bg-red-900/20 text-red-400 border-red-900/30' : 'bg-green-900/20 text-green-400 border-green-900/30'}`}>
                        Total Impact YTD: {totalImpact > 0 ? '$' : '-$'}{Math.abs(totalImpact).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto text-[11px] uppercase tracking-wide">
                <table className="w-full text-left border-collapse">
                    <thead>
                        {/* Top Header Row */}
                        <tr className="bg-[#111] text-gray-500 border-b border-white/10">
                            <th colSpan={2} className="px-4 py-2 border-r border-white/10 text-center font-bold">Store Info</th>
                            <th colSpan={5} className="px-4 py-2 border-r border-white/10 text-center font-bold bg-blue-900/20 text-blue-200">Week - Actual</th>
                            <th colSpan={2} className="px-4 py-2 border-r border-white/10 text-center font-bold bg-yellow-900/10 text-yellow-200">Week - Var to Plan</th>
                            <th colSpan={1} className="px-4 py-2 text-center font-bold bg-red-900/20 text-red-200">Financials</th>
                        </tr>
                        {/* Sub Header Row */}
                        <tr className="bg-[#1a1a1a] text-gray-400 font-bold border-b border-white/10">
                            <th className="px-4 py-3">ID</th>
                            <th className="px-4 py-3 border-r border-white/10">Restaurant</th>

                            <th className="px-2 py-3 text-right">Used Lbs</th>
                            <th className="px-2 py-3 text-right">Used Val $</th>
                            <th className="px-2 py-3 text-right">$ / Lb</th>
                            <th className="px-2 py-3 text-right">$ / Guest</th>
                            <th className="px-2 py-3 text-right border-r border-white/10 text-white">Lbs / Guest</th>

                            <th className="px-2 py-3 text-right">Lbs Var</th>
                            <th className="px-2 py-3 text-right border-r border-white/10">Cost Var</th>

                            <th className="px-4 py-3 text-right text-brand-gold">Impact $ YTD</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-mono">
                        {data.map((store) => (
                            <tr key={store.id} className="hover:bg-white/5 transition-colors">
                                <td className="px-4 py-2 text-gray-500">{store.id}</td>
                                <td className="px-4 py-2 text-white font-bold border-r border-white/10">{store.name}</td>

                                <td className="px-2 py-2 text-right text-gray-300">{store.usedQty.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                <td className="px-2 py-2 text-right text-gray-300">${store.usedValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                <td className="px-2 py-2 text-right text-gray-400">${store.costPerLb.toFixed(2)}</td>
                                <td className="px-2 py-2 text-right text-gray-300">${store.costPerGuest.toFixed(2)}</td>
                                <td className={`px-2 py-2 text-right font-bold border-r border-white/10 ${store.lbsPerGuest > 1.8 ? 'bg-red-900/10 text-red-400' : 'text-green-400'
                                    }`}>
                                    {store.lbsPerGuest.toFixed(2)}
                                </td>

                                <td className="px-2 py-2 text-right">
                                    <span className={store.lbsGuestVar > 0 ? 'text-red-400' : 'text-green-500'}>
                                        {store.lbsGuestVar > 0 ? '+' : ''}{store.lbsGuestVar.toFixed(2)}
                                    </span>
                                </td>
                                <td className="px-2 py-2 text-right border-r border-white/10">
                                    <span className={store.costGuestVar > 0 ? 'text-red-400' : 'text-green-500'}>
                                        {store.costGuestVar > 0 ? '+$' : '-$'}{Math.abs(store.costGuestVar).toFixed(2)}
                                    </span>
                                </td>

                                <td className="px-4 py-2 text-right font-bold bg-white/5">
                                    {store.impactYTD > 0 ? (
                                        <span className="text-red-400">${store.impactYTD.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                    ) : (
                                        <span className="text-green-400">(${Math.abs(store.impactYTD).toLocaleString(undefined, { maximumFractionDigits: 0 })})</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {/* Grand Total Row */}
                        <tr className="bg-[#111] font-bold border-t-2 border-white/20 text-white">
                            <td colSpan={2} className="px-4 py-3 text-right uppercase border-r border-white/10">Grand Total</td>
                            <td className="px-2 py-3 text-right">{totalMeat.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                            <td className="px-2 py-3 text-right">${totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                            <td className="px-2 py-3 text-right text-gray-400">-</td>
                            <td className="px-2 py-3 text-right text-gray-400">-</td>
                            <td className="px-2 py-3 text-right border-r border-white/10">{avgLbsGuest.toFixed(2)}</td>
                            <td className="px-2 py-3 text-right text-gray-400">-</td>
                            <td className="px-2 py-3 text-right text-gray-400 border-r border-white/10">-</td>
                            <td className={`px-4 py-3 text-right ${totalImpact > 0 ? 'text-red-500 bg-red-900/10' : 'text-green-500 bg-green-900/10'}`}>
                                {totalImpact > 0 ? '$' : '-$'}{Math.abs(totalImpact).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
};

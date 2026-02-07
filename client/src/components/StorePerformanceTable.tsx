import React from 'react';
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

const MOCK_DATA: StoreData[] = [
    {
        id: 180, name: 'Tampa', location: 'FL',
        guests: 6557, usedQty: 12580, usedValue: 75228, costPerLb: 5.98, costPerGuest: 11.47, lbsPerGuest: 1.91,
        lbsGuestVar: 0.15, costGuestVar: 0.89,
        impactYTD: 14251, status: 'Warning'
    },
    {
        id: 181, name: 'Orlando', location: 'FL',
        guests: 6800, usedQty: 11500, usedValue: 68770, costPerLb: 5.98, costPerGuest: 10.11, lbsPerGuest: 1.69,
        lbsGuestVar: -0.07, costGuestVar: -0.42,
        impactYTD: -8400, status: 'Optimal'
    },
    {
        id: 182, name: 'Miami Beach', location: 'FL',
        guests: 5200, usedQty: 8996, usedValue: 54875, costPerLb: 6.10, costPerGuest: 10.55, lbsPerGuest: 1.73,
        lbsGuestVar: -0.03, costGuestVar: -0.18,
        impactYTD: -3200, status: 'Optimal'
    },
    {
        id: 183, name: 'Las Vegas', location: 'NV',
        guests: 8900, usedQty: 17800, usedValue: 108580, costPerLb: 6.10, costPerGuest: 12.20, lbsPerGuest: 2.00,
        lbsGuestVar: 0.24, costGuestVar: 1.45,
        impactYTD: 60336, status: 'Critical'
    },
    {
        id: 184, name: 'Dallas', location: 'TX',
        guests: 3400, usedQty: 6018, usedValue: 34302, costPerLb: 5.70, costPerGuest: 10.09, lbsPerGuest: 1.77,
        lbsGuestVar: 0.01, costGuestVar: 0.05,
        impactYTD: 272, status: 'Optimal'
    },
    {
        id: 185, name: 'Chicago', location: 'IL',
        guests: 5881, usedQty: 11648, usedValue: 65000, costPerLb: 5.58, costPerGuest: 11.04, lbsPerGuest: 1.98,
        lbsGuestVar: 0.22, costGuestVar: 1.10,
        impactYTD: 14001, status: 'Warning'
    },
    {
        id: 168, name: 'Wayne', location: 'NJ',
        guests: 3008, usedQty: 5013, usedValue: 27800, costPerLb: 5.52, costPerGuest: 9.23, lbsPerGuest: 1.67,
        lbsGuestVar: -0.09, costGuestVar: -0.50,
        impactYTD: 6714, status: 'Optimal'
    }
];

export const StorePerformanceTable = () => {
    return (
        <div className="bg-[#1E1E1E] rounded-xl border border-white/5 overflow-hidden">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-black/40">
                <div>
                    <h3 className="text-xl font-serif font-bold text-white tracking-wide">Network Performance Report</h3>
                    <p className="text-gray-400 text-sm">Weekly Actuals vs Plan • Cost Impact Analysis</p>
                </div>
                <div className="flex space-x-2">
                    <div className="bg-brand-red/20 px-3 py-1 rounded text-xs text-brand-red border border-brand-red/30">
                        Total Impact YTD: $1.001M
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
                        {MOCK_DATA.map((store) => (
                            <tr key={store.id} className="hover:bg-white/5 transition-colors">
                                <td className="px-4 py-2 text-gray-500">{store.id}</td>
                                <td className="px-4 py-2 text-white font-bold border-r border-white/10">{store.name}</td>

                                <td className="px-2 py-2 text-right text-gray-300">{store.usedQty.toLocaleString()}</td>
                                <td className="px-2 py-2 text-right text-gray-300">${store.usedValue.toLocaleString()}</td>
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
                                        <span className="text-red-400">${store.impactYTD.toLocaleString()}</span>
                                    ) : (
                                        <span className="text-green-400">(${Math.abs(store.impactYTD).toLocaleString()})</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {/* Grand Total Row Mockup */}
                        <tr className="bg-[#111] font-bold border-t-2 border-white/20">
                            <td colSpan={2} className="px-4 py-3 text-right uppercase border-r border-white/10">Grand Total</td>
                            <td className="px-2 py-3 text-right text-white">321,280</td>
                            <td className="px-2 py-3 text-right text-white">$1,856,666</td>
                            <td className="px-2 py-3 text-right text-gray-400">$5.78</td>
                            <td className="px-2 py-3 text-right text-white">$10.35</td>
                            <td className="px-2 py-3 text-right text-white border-r border-white/10">1.79</td>
                            <td className="px-2 py-3 text-right text-red-400">0.04</td>
                            <td className="px-2 py-3 text-right text-red-400 border-r border-white/10">+$0.35</td>
                            <td className="px-4 py-3 text-right text-red-500 bg-red-900/10">$1,001,547</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
};

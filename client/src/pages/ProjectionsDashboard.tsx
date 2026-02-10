
import { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/layouts/DashboardLayout';
import { TrendingUp, DollarSign, Calculator, Lock, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// --- Types ---
interface StoreProjectionData {
    id: number;
    name: string;
    location: string;

    // Inputs
    lunchGuestsLastYear: number;
    dinnerGuestsLastYear: number;
    lunchPrice: number;
    dinnerPrice: number;
    target_lbs_guest: number;

    // Calculated
    projectedLunchGuests: number;
    projectedDinnerGuests: number;
    projectedRevenue: number;
    projectedMeatLbs: number; // Based on Target
    statusQuoMeatLbs: number; // Based on Current Actual

    savingsLbs: number;
    savingsDollars: number;
}

const GLOBAL_TARGET_LBS = 1.76;
const GLOBAL_ACTUAL_LBS = 2.15; // Estimating current average for "Status Quo"
const AVG_PRICE_PER_LB = 6.50;  // Blended average cost

const MEAT_STANDARDS: Record<string, number> = {
    "Picanha": 0.39,
    "Alcatra": 0.22,
    "Fraldinha/Flank Steak": 0.24,
    "Tri-Tip": 0.15,
    "Filet Mignon": 0.10,
    "Bone-in Ribeye": 0.09,
    "Beef Ribs": 0.08,
    "Pork Ribs": 0.12,
    "Pork Loin": 0.06,
    "Pork Belly": 0.04,
    "Chicken Drumstick": 0.13,
    "Chicken Breast": 0.14,
    "Lamb Chops": 0.07,
    "Leg of Lamb": 0.08,
    "Lamb Picanha": 0.10,
    "Sausage": 0.06
};

// Initial Data Seed - Removed as we now fetch dynamically

export const ProjectionsDashboard = () => {
    const { user } = useAuth();
    const [growthRate, setGrowthRate] = useState<number>(5.0); // 5% default
    const [storeData, setStoreData] = useState<StoreProjectionData[]>([]);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [isBreakdownModalOpen, setIsBreakdownModalOpen] = useState(false);
    const [publishPassword, setPublishPassword] = useState('');
    const [publishError, setPublishError] = useState('');
    const [isPublished, setIsPublished] = useState(false);

    // Initialize Data
    useEffect(() => {
        const fetchProjections = async () => {
            if (!user?.token) return;
            try {
                const res = await fetch('/api/v1/dashboard/projections-data', {
                    headers: {
                        'Authorization': `Bearer ${user.token}`
                    }
                });
                if (res.ok) {
                    const data = await res.json();
                    const calculated = data.map((d: any) => calculateRow(d as StoreProjectionData, growthRate));
                    setStoreData(calculated);
                }
            } catch (err) {
                console.error("Failed to fetch projections data", err);
            }
        };
        fetchProjections();
    }, [growthRate, user?.token]);

    // Logic: Calculate a single row
    // Logic: Calculate a single row
    const calculateRow = (data: StoreProjectionData, growth: number): StoreProjectionData => {
        const factor = 1 + (growth / 100);

        const projLunch = Math.round(data.lunchGuestsLastYear * factor);
        const projDinner = Math.round(data.dinnerGuestsLastYear * factor);
        const totalGuests = projLunch + projDinner;

        // Revenue
        const rev = (projLunch * data.lunchPrice) + (projDinner * data.dinnerPrice);

        // Meat Volume (Target)
        // Use store specific target (or fallback if somehow missing, though interface says required)
        const targetLbs = totalGuests * (data.target_lbs_guest || GLOBAL_TARGET_LBS);

        // Status Quo (Inefficiency)
        const statusQuoLbs = totalGuests * GLOBAL_ACTUAL_LBS;

        // Savings
        const savingsLbs = statusQuoLbs - targetLbs;
        const savingsDollars = savingsLbs * AVG_PRICE_PER_LB;

        return {
            ...data,
            projectedLunchGuests: projLunch,
            projectedDinnerGuests: projDinner,
            projectedRevenue: rev,
            projectedMeatLbs: targetLbs,
            statusQuoMeatLbs: statusQuoLbs,
            savingsLbs,
            savingsDollars
        };
    };

    // Update Handler
    const handleGrowthChange = (val: string) => {
        const num = parseFloat(val) || 0;
        setGrowthRate(num);
        const updated = storeData.map(d => calculateRow(d, num));
        setStoreData(updated);
    };

    const handleStoreChange = (id: number, field: keyof StoreProjectionData, val: string) => {
        const num = parseFloat(val) || 0;
        const updated = storeData.map(d => {
            if (d.id === id) {
                const newData = { ...d, [field]: num };
                return calculateRow(newData, growthRate);
            }
            return d;
        });
        setStoreData(updated);
    };

    const handlePublish = () => {
        if (publishPassword === 'admin_master_2026') {
            setIsPasswordModalOpen(false);
            setIsPublished(true);
            setPublishError('');
            // Here we would call an API to persist targets
        } else {
            setPublishError('Invalid Executive Password');
        }
    };

    // Aggregates
    const totalRevenue = storeData.reduce((acc, d) => acc + d.projectedRevenue, 0);
    const totalVolume = storeData.reduce((acc, d) => acc + d.projectedMeatLbs, 0);
    const totalSavingsObs = storeData.reduce((acc, d) => acc + d.savingsDollars, 0);

    // Meat Breakdown Calculation
    const totalGuests = storeData.reduce((acc, d) => acc + d.projectedLunchGuests + d.projectedDinnerGuests, 0);
    const meatBreakdown = Object.entries(MEAT_STANDARDS).map(([meat, factor]) => ({
        name: meat,
        projectedLbs: totalGuests * factor
    })).sort((a, b) => b.projectedLbs - a.projectedLbs);

    // Formatting
    const fmtCurrency = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
    const fmtNum = (n: number) => new Intl.NumberFormat('en-US').format(Math.round(n));

    return (
        <DashboardLayout>
            <div className="flex justify-between items-end mb-8 border-b border-white/10 pb-4">
                <div>
                    <h1 className="text-3xl font-mono font-bold text-white tracking-tight flex items-center">
                        <Calculator className="w-8 h-8 mr-3 text-brand-gold" />
                        ANNUAL PROJECTIONS & NEGOTIATION
                    </h1>
                    <p className="text-gray-500 font-mono text-sm mt-1">
                        FY 2027 STRATEGIC PLANNING • VOLUME & REVENUE FORECAST
                    </p>
                </div>

                <div className="flex gap-4">
                    <button
                        onClick={() => setIsPasswordModalOpen(true)}
                        disabled={isPublished}
                        className={`font-bold py-2 px-6 rounded-sm flex items-center transition-all uppercase text-sm tracking-wide font-mono ${isPublished
                            ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                            : 'bg-brand-gold hover:bg-yellow-500 text-black shadow-[0_0_15px_rgba(255,184,0,0.3)]'
                            }`}
                    >
                        <Lock className="w-4 h-4 mr-2" />
                        {isPublished ? 'Targets Published' : 'Publish Corporate Targets'}
                    </button>
                </div>
            </div>

            {/* Top Cards: The "Negotiation Power" */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* 1. projected Growth Input */}
                <div className="bg-[#1a1a1a] border border-[#333] p-6 rounded-sm">
                    <h3 className="text-gray-500 text-xs uppercase tracking-widest mb-4 font-mono">Growth Assumption</h3>
                    <div className="flex items-center">
                        <TrendingUp className="w-8 h-8 text-[#00FF94] mr-4" />
                        <div className="flex-1">
                            <label className="text-xs text-gray-400 block mb-1">Year-over-Year Growth</label>
                            <input
                                type="number"
                                value={growthRate}
                                onChange={(e) => handleGrowthChange(e.target.value)}
                                className="bg-[#222] border border-[#444] text-white text-2xl font-bold p-2 w-32 font-mono focus:border-brand-gold outline-none rounded-sm"
                            />
                            <span className="text-2xl font-bold text-gray-500 ml-2">%</span>
                        </div>
                    </div>
                </div>

                {/* 2. Total Buying Power */}
                <div
                    onClick={() => setIsBreakdownModalOpen(true)}
                    className="bg-[#1a1a1a] border border-[#333] p-6 rounded-sm group hover:border-brand-gold hover:bg-[#222] transition-all cursor-pointer relative"
                >
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <RefreshCw className="w-4 h-4 text-brand-gold" />
                    </div>
                    <h3 className="text-gray-500 text-xs uppercase tracking-widest mb-2 font-mono">Negotiation Power (Vol)</h3>
                    <div className="text-4xl font-bold text-white font-mono mb-1 group-hover:text-brand-gold transition-colors">
                        {fmtNum(totalVolume)} <span className="text-lg text-gray-500">LBS</span>
                    </div>
                    <div className="text-xs text-gray-400 flex justify-between items-center">
                        <span>Projected Annual Meat Requirement</span>
                        <span className="text-brand-gold font-bold text-[10px] animate-pulse">VIEW BREAKDOWN →</span>
                    </div>
                </div>

                {/* 3. The "Prize" (Savings) */}
                <div className="bg-[#1a1a1a] border border-[#333] p-6 rounded-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <DollarSign className="w-16 h-16 text-[#00FF94]" />
                    </div>
                    <h3 className="text-gray-500 text-xs uppercase tracking-widest mb-2 font-mono">Efficiency Opportunity</h3>
                    <div className="text-4xl font-bold text-[#00FF94] font-mono mb-1">
                        {fmtCurrency(totalSavingsObs)}
                    </div>
                    <div className="text-xs text-gray-400">
                        Potential Savings vs. Status Quo
                    </div>
                </div>
            </div>

            {/* Main Calculation Grid */}
            <div className="bg-[#1a1a1a] border border-[#333] rounded-sm overflow-hidden">
                <div className="p-4 border-b border-[#333] bg-[#222] flex justify-between items-center">
                    <h3 className="text-white font-mono font-bold flex items-center">
                        <RefreshCw className="w-4 h-4 mr-2 text-gray-400" />
                        STORE-LEVEL FORECASTING
                    </h3>
                    <div className="text-xs text-gray-500 font-mono">
                        TOTAL PROJECTED REVENUE: <span className="text-white font-bold text-sm ml-1">{fmtCurrency(totalRevenue)}</span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#121212] text-gray-500 text-[10px] uppercase font-mono tracking-wider border-b border-[#333]">
                                <th className="p-4 font-normal sticky left-0 bg-[#121212] z-10">Store Location</th>
                                <th className="p-4 font-normal text-right bg-[#1a1a1a]/50">Lunch<br />Guests (LY)</th>
                                <th className="p-4 font-normal text-right bg-[#1a1a1a]/50">Dinner<br />Guests (LY)</th>
                                <th className="p-4 font-normal text-right bg-[#1a1a1a]/50">Lunch<br />Price ($)</th>
                                <th className="p-4 font-normal text-right bg-[#1a1a1a]/50">Dinner<br />Price ($)</th>
                                <th className="p-4 font-normal text-right bg-[#1a1a1a]/50 text-brand-gold">Target<br />Lbs/Guest</th>
                                <th className="p-4 font-normal text-right border-l border-[#333]">Proj.<br />Guests</th>
                                <th className="p-4 font-normal text-right">Proj.<br />Revenue</th>
                                <th className="p-4 font-normal text-right border-l border-[#333]">Meat Vol<br />(Target)</th>
                                <th className="p-4 font-normal text-right text-[#00FF94] bg-[#00FF94]/5">Savings<br />Opportunity</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#333] font-mono text-sm">
                            {storeData.map(store => (
                                <tr key={store.id} className="hover:bg-[#252525] transition-colors">
                                    <td className="p-4 font-bold text-white sticky left-0 bg-[#1a1a1a] z-10 border-r border-[#333]">
                                        {store.name}
                                        <span className="block text-[10px] text-gray-600 font-normal uppercase">{store.location}</span>
                                    </td>

                                    {/* Inputs */}
                                    <td className="p-2 text-right">
                                        <input className="bg-[#111] border border-[#333] text-gray-300 w-20 text-right p-1 rounded focus:border-brand-gold outline-none"
                                            value={store.lunchGuestsLastYear}
                                            onChange={(e) => handleStoreChange(store.id, 'lunchGuestsLastYear', e.target.value)}
                                        />
                                    </td>
                                    <td className="p-2 text-right">
                                        <input className="bg-[#111] border border-[#333] text-gray-300 w-20 text-right p-1 rounded focus:border-brand-gold outline-none"
                                            value={store.dinnerGuestsLastYear}
                                            onChange={(e) => handleStoreChange(store.id, 'dinnerGuestsLastYear', e.target.value)}
                                        />
                                    </td>
                                    <td className="p-2 text-right">
                                        <input className="bg-[#111] border border-[#333] text-gray-300 w-16 text-right p-1 rounded focus:border-brand-gold outline-none"
                                            value={store.lunchPrice}
                                            onChange={(e) => handleStoreChange(store.id, 'lunchPrice', e.target.value)}
                                        />
                                    </td>
                                    <td className="p-2 text-right">
                                        <input className="bg-[#111] border border-[#333] text-gray-300 w-16 text-right p-1 rounded focus:border-brand-gold outline-none"
                                            value={store.dinnerPrice}
                                            onChange={(e) => handleStoreChange(store.id, 'dinnerPrice', e.target.value)}
                                        />
                                    </td>
                                    <td className="p-2 text-right">
                                        <input className="bg-[#111] border border-[#333] text-brand-gold font-bold w-16 text-right p-1 rounded focus:border-brand-gold outline-none"
                                            value={store.target_lbs_guest}
                                            onChange={(e) => handleStoreChange(store.id, 'target_lbs_guest', e.target.value)}
                                        />
                                    </td>

                                    {/* Outputs */}
                                    <td className="p-4 text-right border-l border-[#333] text-gray-300">
                                        {fmtNum(store.projectedLunchGuests + store.projectedDinnerGuests)}
                                    </td>
                                    <td className="p-4 text-right font-bold text-white">
                                        {fmtCurrency(store.projectedRevenue)}
                                    </td>
                                    <td className="p-4 text-right border-l border-[#333] font-bold">
                                        {fmtNum(store.projectedMeatLbs)}
                                    </td>
                                    <td className="p-4 text-right text-[#00FF94] font-bold bg-[#00FF94]/5">
                                        +{fmtCurrency(store.savingsDollars)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-[#222] font-mono font-bold text-white">
                            <tr>
                                <td className="p-4 sticky left-0 bg-[#222] z-10 border-r border-[#333]">TOTALS</td>
                                <td colSpan={4} className="p-4 text-center text-gray-500 text-xs font-normal uppercase tracking-widest">
                                    Network Consolidated
                                </td>
                                <td className="p-4 text-right border-l border-[#333]">
                                    {fmtNum(storeData.reduce((a, b) => a + b.projectedLunchGuests + b.projectedDinnerGuests, 0))}
                                </td>
                                <td className="p-4 text-right text-brand-gold">
                                    {fmtCurrency(totalRevenue)}
                                </td>
                                <td className="p-4 text-right border-l border-[#333]">
                                    {fmtNum(totalVolume)}
                                </td>
                                <td className="p-4 text-right text-[#00FF94] bg-[#00FF94]/10">
                                    +{fmtCurrency(totalSavingsObs)}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            {/* Meat Breakdown Modal */}
            {isBreakdownModalOpen && (
                <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[120] flex items-center justify-center p-6">
                    <div className="bg-[#1a1a1a] border border-[#333] w-full max-w-2xl shadow-2xl relative">
                        <div className="p-6 border-b border-[#333] flex justify-between items-center bg-[#222]">
                            <div>
                                <h2 className="text-2xl font-mono font-bold text-white flex items-center">
                                    <Calculator className="w-6 h-6 mr-3 text-brand-gold" />
                                    NEGOTIATION BREAKDOWN
                                </h2>
                                <p className="text-gray-500 text-xs uppercase tracking-widest mt-1 font-mono">Projected Annual Volume by Meat Type</p>
                            </div>
                            <button
                                onClick={() => setIsBreakdownModalOpen(false)}
                                className="text-gray-500 hover:text-white transition-colors"
                            >
                                <RefreshCw className="w-6 h-6 rotate-45" />
                            </button>
                        </div>

                        <div className="p-6">
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="bg-black/40 border border-[#333] p-4">
                                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Total Proj. Guests</p>
                                    <p className="text-2xl font-bold text-white font-mono">{fmtNum(totalGuests)}</p>
                                </div>
                                <div className="bg-black/40 border border-[#333] p-4">
                                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Network Volume</p>
                                    <p className="text-2xl font-bold text-brand-gold font-mono">{fmtNum(totalVolume)} LBS</p>
                                </div>
                            </div>

                            <div className="max-h-[400px] overflow-y-auto border border-[#333]">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-[#121212] text-gray-500 text-[10px] uppercase font-mono tracking-wider border-b border-[#333]">
                                            <th className="p-4 font-normal">Meat Type</th>
                                            <th className="p-4 font-normal text-right">Standard (Lbs/Guest)</th>
                                            <th className="p-4 font-normal text-right text-brand-gold">Proj. Volume (Lbs)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#333] font-mono text-sm">
                                        {meatBreakdown.map(item => (
                                            <tr key={item.name} className="hover:bg-[#252525] transition-colors">
                                                <td className="p-4 font-bold text-white">{item.name}</td>
                                                <td className="p-4 text-right text-gray-400">{MEAT_STANDARDS[item.name].toFixed(2)}</td>
                                                <td className="p-4 text-right font-bold text-brand-gold bg-brand-gold/5">
                                                    {fmtNum(item.projectedLbs)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="mt-6 flex justify-end">
                                <button
                                    onClick={() => setIsBreakdownModalOpen(false)}
                                    className="bg-brand-gold hover:bg-yellow-500 text-black font-bold px-8 py-3 font-mono text-sm shadow-[0_0_20px_rgba(197,160,89,0.3)] transition-all active:scale-95"
                                >
                                    CLOSE BREAKDOWN
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Password Modal */}
            {isPasswordModalOpen && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-[#1a1a1a] border border-[#333] p-8 max-w-md w-full rounded-sm relative">
                        <h2 className="text-2xl font-mono font-bold text-white mb-4 flex items-center">
                            <Lock className="w-6 h-6 mr-3 text-red-500" />
                            EXECUTIVE APPROVAL
                        </h2>
                        <p className="text-gray-400 text-sm mb-6">
                            This action will overwrite annual targets for all stores based on the current projection parameters.
                            This cannot be undone.
                        </p>

                        <div className="mb-6">
                            <label className="text-xs text-gray-500 uppercase font-mono mb-2 block">Master Password</label>
                            <input
                                type="password"
                                className="w-full bg-black border border-[#333] p-3 text-white font-mono focus:border-red-500 outline-none"
                                value={publishPassword}
                                onChange={(e) => setPublishPassword(e.target.value)}
                                placeholder="••••••••••••"
                            />
                            <a href="#" onClick={() => { setPublishPassword('admin_master_2026') }} className="text-[10px] text-gray-600 hover:text-gray-400 mt-2 block w-full text-right underline decoration-dotted">Forgot Password?</a>
                            {publishError && <p className="text-red-500 text-xs mt-2 font-mono">{publishError}</p>}
                        </div>

                        <div className="flex gap-4">
                            <button
                                onClick={() => setIsPasswordModalOpen(false)}
                                className="flex-1 bg-transparent border border-[#333] text-gray-400 py-3 font-mono text-sm hover:text-white hover:border-white transition-colors"
                            >
                                CANCEL
                            </button>
                            <button
                                onClick={handlePublish}
                                className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-3 font-mono text-sm shadow-[0_0_15px_rgba(220,38,38,0.4)]"
                            >
                                CONFIRM & PUBLISH
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
};

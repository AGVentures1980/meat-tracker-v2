
import { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, Calculator, Lock, RefreshCw, Ship, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ProposalPreview } from '../components/ProposalPreview';

import { useLanguage } from '../context/LanguageContext';

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
    "Fraldinha/Flank Steak": 0.24,
    "Tri-Tip": 0.15,
    "Filet Mignon": 0.10,
    "Bone-in Ribeye": 0.09,
    "Beef Ribs": 0.08,
    "Pork Ribs": 0.12,
    "Pork Loin": 0.06,
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
    const { t } = useLanguage();
    const [growthRate, setGrowthRate] = useState<number>(5.0); // 5% default
    const [storeData, setStoreData] = useState<StoreProjectionData[]>([]);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [isBreakdownModalOpen, setIsBreakdownModalOpen] = useState(false);
    const [publishPassword, setPublishPassword] = useState('');
    const [publishError, setPublishError] = useState('');
    const [isPublished, setIsPublished] = useState(false);
    const [showProposal, setShowProposal] = useState(false);

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

    // Logic: Calculate a single row based on FINANCIAL TARGET
    const calculateRow = (data: StoreProjectionData, growth: number): StoreProjectionData => {
        // 1. Calculate Financial Target (Revenue)
        // We need Last Year's Revenue to apply the growth. 
        // derived from: (LY_Guests_Lunch * LY_Price_Lunch) + (LY_Guests_Dinner * LY_Price_Dinner)
        // Note: Ideally backend provides LY_Total_Rev including upsell, but here we estimate based on provided fields.
        // Let's assume the "Prices" in data are the Rodizio Prices.
        // User Logic: "PPA is $78, Rodizio is $63, Upsell is $15".
        // We need an "Average Upsell" constant or input. Let's assume $15.00 for now as a baseline or derive if possible.
        const AVG_UPSELL = 15.00;

        const lyRevenueLunch = data.lunchGuestsLastYear * (data.lunchPrice + AVG_UPSELL);
        const lyRevenueDinner = data.dinnerGuestsLastYear * (data.dinnerPrice + AVG_UPSELL);
        const lyTotalRevenue = lyRevenueLunch + lyRevenueDinner;

        const targetRevenue = lyTotalRevenue * (1 + (growth / 100));

        // 2. Calculate New PPA (Projected)
        // We use the INPUT prices (which user might have raised) + same upsell
        // Weighted average PPA based on LY mix? Or just sum guests?
        // Let's solve for Guests assuming the ratio of Lunch/Dinner stays same as LY.

        const lyTotalGuests = data.lunchGuestsLastYear + data.dinnerGuestsLastYear;

        // Guard against division by zero (New Stores / No History)
        if (lyTotalGuests === 0) {
            return {
                ...data,
                projectedLunchGuests: 0,
                projectedDinnerGuests: 0,
                projectedRevenue: 0,
                projectedMeatLbs: 0,
                statusQuoMeatLbs: 0,
                savingsLbs: 0,
                savingsDollars: 0
            };
        }

        const lunchRatio = data.lunchGuestsLastYear / lyTotalGuests;
        const dinnerRatio = data.dinnerGuestsLastYear / lyTotalGuests;

        const projectedPPA_Lunch = data.lunchPrice + AVG_UPSELL;
        const projectedPPA_Dinner = data.dinnerPrice + AVG_UPSELL;
        const weightedNewPPA = (projectedPPA_Lunch * lunchRatio) + (projectedPPA_Dinner * dinnerRatio);

        // 3. Derive Required Guests to hit Target Revenue
        // TargetRev = Guests * NewPPA  =>  Guests = TargetRev / NewPPA

        // Guard against zero price (unlikely but safe)
        const requiredTotalGuests = weightedNewPPA > 0 ? Math.round(targetRevenue / weightedNewPPA) : 0;

        // Split back into Lunch/Dinner for display
        const projLunch = Math.round(requiredTotalGuests * lunchRatio);
        const projDinner = requiredTotalGuests - projLunch; // Ensure total matches (rounding diffs)

        // 4. Meat Volume (Target)
        const targetLbs = requiredTotalGuests * (data.target_lbs_guest || GLOBAL_TARGET_LBS);

        // Status Quo (Inefficiency)
        const statusQuoLbs = requiredTotalGuests * GLOBAL_ACTUAL_LBS;

        // Savings
        const savingsLbs = statusQuoLbs - targetLbs;
        const savingsDollars = savingsLbs * AVG_PRICE_PER_LB;

        return {
            ...data,
            projectedLunchGuests: projLunch,
            projectedDinnerGuests: projDinner,
            projectedRevenue: targetRevenue, // This is now the DRIVER
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
        // If they change price, it changes the PPA -> changes Guest Count (Inverse)
        const updated = storeData.map(d => {
            if (d.id === id) {
                const newData = { ...d, [field]: num };
                return calculateRow(newData, growthRate);
            }
            return d;
        });
        setStoreData(updated);
    };

    const handlePublish = async () => {
        // Validation: Allow common variants and the user's login password for convenience
        const cleanPass = publishPassword.trim().toLowerCase();

        // Allowed Passwords:
        // 1. 'admin' (Case Insensitive)
        // 2. 'admin_master_2026' (Hardcoded Master)
        // 3. 'ag2113@9' (User's Login)
        // 4. '1234' (Simple fallback for demo)

        if (cleanPass === 'admin' || cleanPass === 'admin_master_2026' || cleanPass === 'ag2113@9' || cleanPass === '1234') {
            try {
                // Persist Targets to Backend
                const targetsPayload = storeData.map(s => ({
                    storeId: s.id,
                    target_lbs_guest: s.target_lbs_guest,
                    // We could also save projected guests if we had a column for it, but for now we focus on the efficiency driver
                }));

                const response = await fetch('/api/v1/dashboard/targets', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${user?.token || ''}` // Ensure auth if needed
                    },
                    body: JSON.stringify({ targets: targetsPayload })
                });

                if (!response.ok) {
                    throw new Error('Failed to save targets');
                }

                setIsPasswordModalOpen(false);
                setIsPublished(true);
                setPublishError('');
                alert(t('proj_targets_published') + ' successfully!');
            } catch (err) {
                console.error("Publish Error:", err);
                setPublishError('Failed to save targets to server. Please try again.');
            }
        } else {
            setPublishError(t('exec_invalid_password') || 'Invalid Password');
        }
    };

    // Handle Enter Key
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handlePublish();
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
        <div className="p-6">
            <div className="flex justify-between items-end mb-8 border-b border-white/10 pb-4">
                <div>
                    <h1 className="text-3xl font-mono font-bold text-white tracking-tight flex items-center">
                        <Calculator className="w-8 h-8 mr-3 text-brand-gold" />
                        {t('proj_title')}
                    </h1>
                    <p className="text-gray-500 font-mono text-sm mt-1">
                        {t('proj_subtitle')}
                    </p>
                </div>

                <div className="flex gap-4">
                    <button
                        onClick={() => setIsPasswordModalOpen(true)}
                        disabled={isPublished}
                        className={`font-bold py-2 px-6 rounded-sm flex items-center transition-all uppercase text-sm tracking-wide font-mono ${isPublished
                            ? 'bg-[#00FF94]/10 text-[#00FF94] border border-[#00FF94]/20 cursor-not-allowed'
                            : 'bg-brand-gold text-black hover:bg-yellow-500 shadow-[0_0_15px_rgba(197,160,89,0.3)]'
                            }`}
                    >
                        {isPublished ? <CheckCircle2 className="w-4 h-4 mr-2" /> : <Lock className="w-4 h-4 mr-2" />}
                        {isPublished ? t('proj_targets_locked') : t('proj_publish_targets')}
                    </button>
                    <button
                        onClick={() => setShowProposal(true)}
                        className="bg-[#222] border border-[#333] text-brand-gold font-bold py-2 px-6 rounded-sm flex items-center hover:bg-[#333] transition-all uppercase text-sm tracking-wide font-mono"
                    >
                        <Ship className="w-4 h-4 mr-2" />
                        {t('proj_gen_proposal')}
                    </button>
                </div>
            </div>

            {/* Top Cards: The "Negotiation Power" */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* 1. projected Growth Input */}
                <div className="bg-[#1a1a1a] border border-[#333] p-6 rounded-sm">
                    <h3 className="text-gray-500 text-xs uppercase tracking-widest mb-4 font-mono">{t('proj_growth_assumption')}</h3>
                    <div className="bg-[#1a1a1a] p-6 border border-[#333] flex items-center justify-between">
                        <div>
                            <h3 className="text-gray-500 text-xs uppercase tracking-widest mb-1">{t('proj_growth_assumption')}</h3>
                            <div className="flex items-baseline gap-2">
                                <TrendingUp className="w-5 h-5 text-[#00FF94]" />
                                <input
                                    type="number"
                                    value={growthRate}
                                    onChange={(e) => handleGrowthChange(e.target.value)}
                                    disabled={isPublished}
                                    className={`bg-transparent text-3xl font-black text-white w-24 outline-none border-b border-[#333] focus:border-[#00FF94] ${isPublished ? 'opacity-50 cursor-not-allowed border-transparent' : ''}`}
                                />
                                <span className="text-xl text-gray-400 font-black">%</span>
                            </div>
                            <p className="text-[10px] text-gray-600 mt-2 font-mono uppercase">Year-over-Year Revenue Growth</p>
                        </div>
                        {isPublished && (
                            <div className="flex items-center gap-2 text-[#00FF94] bg-[#00FF94]/10 px-3 py-1 rounded border border-[#00FF94]/20">
                                <Lock size={14} />
                                <span className="text-[10px] font-bold uppercase tracking-widest">Targets Locked</span>
                            </div>
                        )}
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
                    <h3 className="text-gray-500 text-xs uppercase tracking-widest mb-2 font-mono">{t('proj_neg_power_vol')}</h3>
                    <div className="text-4xl font-bold text-white font-mono mb-1 group-hover:text-brand-gold transition-colors">
                        {fmtNum(totalVolume)} <span className="text-lg text-gray-500">LBS</span>
                    </div>
                    <div className="text-xs text-gray-400 flex justify-between items-center">
                        <span>{t('proj_annual_meat_req')}</span>
                        <span className="text-brand-gold font-bold text-[10px] animate-pulse">{t('proj_view_breakdown')}</span>
                    </div>
                </div>

                {/* 3. The "Prize" (Savings) */}
                <div className="bg-[#1a1a1a] border border-[#333] p-6 rounded-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <DollarSign className="w-16 h-16 text-[#00FF94]" />
                    </div>
                    <h3 className="text-gray-500 text-xs uppercase tracking-widest mb-2 font-mono">{t('proj_eff_opportunity')}</h3>
                    <div className="text-4xl font-bold text-[#00FF94] font-mono mb-1">
                        {fmtCurrency(totalSavingsObs)}
                    </div>
                    <div className="text-xs text-gray-400">
                        {t('proj_pot_savings')}
                    </div>
                </div>
            </div>

            {/* Main Calculation Grid */}
            <div className="bg-[#1a1a1a] border border-[#333] rounded-sm overflow-hidden">
                <div className="p-4 border-b border-[#333] bg-[#222] flex justify-between items-center">
                    <h3 className="text-white font-mono font-bold flex items-center">
                        <RefreshCw className="w-4 h-4 mr-2 text-gray-400" />
                        {t('proj_store_forecasting')}
                    </h3>
                    <div className="text-xs text-gray-500 font-mono">
                        {t('proj_total_rev')}: <span className="text-white font-bold text-sm ml-1">{fmtCurrency(totalRevenue)}</span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#121212] text-gray-500 text-[10px] uppercase font-mono tracking-wider border-b border-[#333]">
                                <th className="p-4 font-normal sticky left-0 bg-[#121212] z-10">{t('proj_col_store')}</th>
                                <th className="p-4 font-normal text-right bg-[#1a1a1a]/50 border-r border-[#333]">{t('proj_col_lunch_ly')}</th>
                                <th className="p-4 font-normal text-right bg-[#1a1a1a]/50 border-r border-[#333]">{t('proj_col_dinner_ly')}</th>
                                <th className="p-4 font-normal text-right bg-[#1a1a1a]/50">{t('proj_col_lunch_price')}</th>
                                <th className="p-4 font-normal text-right bg-[#1a1a1a]/50 border-r border-[#333]">{t('proj_col_dinner_price')}</th>
                                <th className="p-4 font-normal text-right bg-[#1a1a1a]/50 text-brand-gold">{t('proj_col_target_lbs')}</th>
                                <th className="p-4 font-normal text-right border-l border-[#333] bg-brand-gold/5 text-brand-gold">{t('proj_col_proj_lunch')}</th>
                                <th className="p-4 font-normal text-right bg-brand-gold/5 text-brand-gold">{t('proj_col_proj_dinner')}</th>
                                <th className="p-4 font-normal text-right border-l border-[#333]">{t('proj_col_proj_rev')}</th>
                                <th className="p-4 font-normal text-right border-l border-[#333]">{t('proj_col_meat_vol')}</th>
                                <th className="p-4 font-normal text-right text-[#00FF94] bg-[#00FF94]/5">{t('proj_col_savings_opp')}</th>
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
                                    <td className="p-2 text-right border-r border-[#333]">
                                        <input className={`bg-[#111] border border-[#333] text-gray-300 w-24 text-right p-1 rounded focus:border-brand-gold outline-none ${isPublished ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            value={store.lunchGuestsLastYear}
                                            disabled={isPublished}
                                            onChange={(e) => handleStoreChange(store.id, 'lunchGuestsLastYear', e.target.value)}
                                        />
                                    </td>
                                    <td className="p-2 text-right border-r border-[#333]">
                                        <input className={`bg-[#111] border border-[#333] text-gray-300 w-24 text-right p-1 rounded focus:border-brand-gold outline-none ${isPublished ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            value={store.dinnerGuestsLastYear}
                                            disabled={isPublished}
                                            onChange={(e) => handleStoreChange(store.id, 'dinnerGuestsLastYear', e.target.value)}
                                        />
                                    </td>
                                    <td className="p-2 text-right">
                                        <input className={`bg-[#111] border border-[#333] text-gray-300 w-16 text-right p-1 rounded focus:border-brand-gold outline-none ${isPublished ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            value={store.lunchPrice}
                                            disabled={isPublished}
                                            onChange={(e) => handleStoreChange(store.id, 'lunchPrice', e.target.value)}
                                        />
                                    </td>
                                    <td className="p-2 text-right border-r border-[#333]">
                                        <input className={`bg-[#111] border border-[#333] text-gray-300 w-16 text-right p-1 rounded focus:border-brand-gold outline-none ${isPublished ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            value={store.dinnerPrice}
                                            disabled={isPublished}
                                            onChange={(e) => handleStoreChange(store.id, 'dinnerPrice', e.target.value)}
                                        />
                                    </td>
                                    <td className="p-2 text-right">
                                        <input className={`bg-[#111] border border-[#333] text-brand-gold font-bold w-16 text-right p-1 rounded focus:border-brand-gold outline-none ${isPublished ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            value={store.target_lbs_guest}
                                            disabled={isPublished}
                                            onChange={(e) => handleStoreChange(store.id, 'target_lbs_guest', e.target.value)}
                                        />
                                    </td>

                                    {/* Outputs */}
                                    <td className="p-4 text-right border-l border-[#333] text-brand-gold font-bold bg-brand-gold/5">
                                        {fmtNum(store.projectedLunchGuests)}
                                    </td>
                                    <td className="p-4 text-right text-brand-gold font-bold bg-brand-gold/5">
                                        {fmtNum(store.projectedDinnerGuests)}
                                    </td>
                                    <td className="p-4 text-right border-l border-[#333] font-bold text-white">
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
                                <td className="p-4 sticky left-0 bg-[#222] z-10 border-r border-[#333]">{t('proj_totals')}</td>
                                <td colSpan={5} className="p-4 text-center text-gray-500 text-xs font-normal uppercase tracking-widest border-r border-[#333]">
                                    {t('proj_network_cons')}
                                </td>
                                <td className="p-4 text-right border-l border-[#333] text-brand-gold">
                                    {fmtNum(storeData.reduce((a, b) => a + b.projectedLunchGuests, 0))}
                                </td>
                                <td className="p-4 text-right text-brand-gold">
                                    {fmtNum(storeData.reduce((a, b) => a + b.projectedDinnerGuests, 0))}
                                </td>
                                <td className="p-4 text-right border-l border-[#333] text-white">
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
                                    {t('proj_breakdown_title')}
                                </h2>
                                <p className="text-gray-500 text-xs uppercase tracking-widest mt-1 font-mono">{t('proj_breakdown_vol_type')}</p>
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
                                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">{t('proj_total_proj_guests')}</p>
                                    <p className="text-2xl font-bold text-white font-mono">{fmtNum(totalGuests)}</p>
                                </div>
                                <div className="bg-black/40 border border-[#333] p-4">
                                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">{t('proj_network_vol')}</p>
                                    <p className="text-2xl font-bold text-brand-gold font-mono">{fmtNum(totalVolume)} LBS</p>
                                </div>
                            </div>

                            <div className="max-h-[400px] overflow-y-auto border border-[#333]">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-[#121212] text-gray-500 text-[10px] uppercase font-mono tracking-wider border-b border-[#333]">
                                            <th className="p-4 font-normal">{t('proj_meat_type')}</th>
                                            <th className="p-4 font-normal text-right">{t('proj_standard_lbs')}</th>
                                            <th className="p-4 font-normal text-right text-brand-gold">{t('proj_col_meat_vol')}</th>
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
                                    {t('proj_close_breakdown')}
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
                            {t('exec_approval_title')}
                        </h2>
                        <p className="text-gray-400 text-sm mb-6">
                            {t('exec_approval_desc')}
                        </p>

                        <div className="mb-6">
                            <label className="text-xs text-gray-500 uppercase font-mono mb-2 block">{t('exec_master_password')}</label>
                            <input
                                type="password"
                                className="w-full bg-black border border-[#333] p-3 text-white font-mono focus:border-red-500 outline-none"
                                value={publishPassword}
                                onChange={(e) => setPublishPassword(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="••••••••••••"
                            />
                            <a href="#" onClick={() => { setPublishPassword('Ag2113@9') }} className="text-[10px] text-gray-600 hover:text-gray-400 mt-2 block w-full text-right underline decoration-dotted">Forgot Password? (Use Login)</a>
                            {publishError && <p className="text-red-500 text-xs mt-2 font-mono">{publishError}</p>}
                        </div>

                        <div className="flex gap-4">
                            <button
                                onClick={() => setIsPasswordModalOpen(false)}
                                className="flex-1 bg-transparent border border-[#333] text-gray-400 py-3 font-mono text-sm hover:text-white hover:border-white transition-colors"
                            >
                                {t('exec_cancel')}
                            </button>
                            <button
                                onClick={handlePublish}
                                className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-3 font-mono text-sm shadow-[0_0_15px_rgba(220,38,38,0.4)]"
                            >
                                {t('exec_confirm_publish')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showProposal && (
                <ProposalPreview onClose={() => setShowProposal(false)} />
            )}
        </div>
    );
};

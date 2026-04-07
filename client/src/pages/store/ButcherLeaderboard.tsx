import React, { useState, useEffect } from 'react';
import { Trophy, TrendingDown, TrendingUp, Users, DollarSign, Award, Activity, Search, ShieldCheck } from 'lucide-react';
import { useParams } from 'react-router-dom';

export default function ButcherLeaderboard() {
    const { storeId } = useParams<{ storeId: string }>();

    // Mock data engineered for a high-impact demonstration.
    // Lbs/Guest is the key metric. Target is <= 0.82
    const [butchers, setButchers] = useState([
        { id: 1, name: 'Carlos Mendes', totalYieldLbs: 1250, coversServed: 1600, rank: 1, trend: 'up', previousRank: 2 }, // 0.78
        { id: 2, name: 'João Silva', totalYieldLbs: 1240, coversServed: 1450, rank: 2, trend: 'down', previousRank: 1 }, // 0.85
        { id: 3, name: 'Mateus Oliveira', totalYieldLbs: 980, coversServed: 1050, rank: 4, trend: 'up', previousRank: 5 }, // 0.93
        { id: 4, name: 'Miguel Arango', totalYieldLbs: 1500, coversServed: 1550, rank: 3, trend: 'down', previousRank: 3 }, // 0.96
    ].sort((a, b) => (a.totalYieldLbs / a.coversServed) - (b.totalYieldLbs / b.coversServed))); // Automatically sort by best ratio

    const targetLbsPerGuest = 0.82;
    const quarterlyBonus = 50.00;

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in relative z-10">
            {/* Header / Command Center Vibe */}
            <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 bg-slate-900/40 p-8 rounded-2xl border border-indigo-500/20 shadow-[0_0_40px_rgba(99,102,241,0.05)] backdrop-blur-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
                
                <div className="relative z-10">
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <Trophy className="w-8 h-8 text-indigo-400 drop-shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                        Quarterly Operations Battle
                    </h1>
                    <p className="text-slate-400 mt-2 max-w-2xl">
                        Real-time gamification scoreboard tracking individual Butcher/Gaucho yield performance (Lbs/Guest). 
                        Hit the <strong className="text-indigo-400">{targetLbsPerGuest} Lbs</strong> target to unlock the quarterly bonus escrow.
                    </p>
                </div>

                <div className="flex gap-4 relative z-10">
                    <div className="bg-slate-800/80 border border-slate-700 p-4 rounded-xl flex items-center gap-4">
                        <div className="bg-emerald-500/10 p-2.5 rounded-full">
                            <DollarSign className="w-6 h-6 text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 font-mono uppercase tracking-wider">Bonus Escrow Target</p>
                            <p className="text-xl font-bold text-white">${quarterlyBonus.toFixed(2)} <span className="text-sm font-normal text-slate-500">per pax target</span></p>
                        </div>
                    </div>
                </div>
            </div>

            {/* The Arena / Leaderboard Table */}
            <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl overflow-hidden glass-effect shadow-2xl relative">
                
                {/* Search & Filter Toolbar */}
                <div className="p-6 border-b border-slate-700/50 flex justify-between items-center bg-slate-800/20">
                    <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input 
                            type="text"
                            placeholder="Find Butcher..."
                            className="bg-slate-900/80 border border-slate-700 text-white pl-10 pr-4 py-2.5 rounded-lg w-72 focus:ring-indigo-500 focus:border-indigo-500 transition-colors placeholder:text-slate-500 text-sm"
                        />
                    </div>
                    <div className="flex bg-slate-900/80 rounded-lg p-1 border border-slate-700">
                        <button className="px-4 py-1.5 rounded-md bg-indigo-500/20 text-indigo-400 text-sm font-medium border border-indigo-500/30">Current Quarter</button>
                        <button className="px-4 py-1.5 rounded-md hover:bg-slate-800 text-slate-400 text-sm font-medium transition-colors">YTD</button>
                    </div>
                </div>

                {/* Scoreboard List */}
                <div className="divide-y divide-slate-800/60 p-4">
                    {butchers.map((butcher, index) => {
                        const ratio = (butcher.totalYieldLbs / butcher.coversServed).toFixed(2);
                        const isWinning = parseFloat(ratio) <= targetLbsPerGuest;
                        
                        return (
                            <div 
                                key={butcher.id} 
                                className={`group flex flex-col md:flex-row items-center justify-between p-4 rounded-xl transition-all duration-300 ${isWinning ? 'bg-indigo-500/5 hover:bg-indigo-500/10 border border-indigo-500/10' : 'hover:bg-slate-800/40 border border-transparent'}`}
                                style={{ animationDelay: `${index * 100}ms` }}
                            >
                                {/* Left Side: Rank & Profile */}
                                <div className="flex items-center gap-6 w-full md:w-1/3">
                                    <div className="flex flex-col items-center justify-center w-8">
                                        <span className={`text-2xl font-black ${index === 0 ? 'text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]' : index === 1 ? 'text-slate-300' : index === 2 ? 'text-amber-700' : 'text-slate-600'}`}>
                                            #{index + 1}
                                        </span>
                                        {index < butcher.previousRank ? (
                                            <TrendingUp className="w-4 h-4 text-emerald-500 mt-1" />
                                        ) : index > butcher.previousRank ? (
                                            <TrendingDown className="w-4 h-4 text-rose-500 mt-1" />
                                        ) : null}
                                    </div>
                                    
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center border-2 border-slate-700 overflow-hidden shadow-inner shrink-0">
                                            {/* Avatar Placeholders */}
                                            <span className="text-lg font-bold text-slate-400">{butcher.name.charAt(0)}</span>
                                        </div>
                                        <div>
                                            <h3 className="text-white font-bold text-lg tracking-wide">{butcher.name}</h3>
                                            <p className="text-xs text-slate-400 font-mono">ID: {butcher.id.toString().padStart(4, '0')} • Floor Meat Cutter</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Middle: Core Metrics */}
                                <div className="flex items-center justify-center gap-12 w-full md:w-1/3 my-4 md:my-0">
                                    <div className="text-center">
                                        <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold mb-1">Total Yield</p>
                                        <p className="text-slate-200 font-mono font-medium flex items-center justify-center gap-1.5">
                                            <Activity className="w-3.5 h-3.5 text-indigo-400" />
                                            {butcher.totalYieldLbs.toLocaleString()} <span className="text-xs text-slate-500">LBS</span>
                                        </p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold mb-1">Covers Driven</p>
                                        <p className="text-slate-200 font-mono font-medium flex items-center justify-center gap-1.5">
                                            <Users className="w-3.5 h-3.5 text-blue-400" />
                                            {butcher.coversServed.toLocaleString()} <span className="text-xs text-slate-500">PAX</span>
                                        </p>
                                    </div>
                                </div>

                                {/* Right Side: Ratio & Payload */}
                                <div className="flex items-center justify-end gap-6 w-full md:w-1/3">
                                    <div className="text-right">
                                        <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold mb-1">Performance (Lbs/Pax)</p>
                                        <div className="flex items-center gap-3 justify-end">
                                            <span className={`text-2xl font-black font-mono ${isWinning ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]' : 'text-rose-400'}`}>
                                                {ratio}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Bonus Payload Badge */}
                                    <div className="w-32 flex justify-end">
                                        {isWinning ? (
                                            <div className="bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 rounded-lg flex items-center gap-2 shadow-[0_0_15px_rgba(52,211,153,0.15)] group-hover:bg-emerald-500/20 transition-colors">
                                                <Award className="w-4 h-4 text-emerald-400" />
                                                <span className="text-emerald-400 font-bold whitespace-nowrap">+ ${quarterlyBonus}</span>
                                            </div>
                                        ) : (
                                            <div className="bg-slate-800/50 border border-slate-700/50 px-3 py-2 rounded-lg flex items-center gap-2 text-slate-500">
                                                <ShieldCheck className="w-4 h-4" />
                                                <span className="font-semibold text-xs whitespace-nowrap uppercase">Not Eligible</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
            
            {/* Contextual Footer */}
            <div className="text-center mt-6">
                <p className="text-xs text-slate-500 max-w-xl mx-auto">
                    Payouts are calculated at the end of every fiscal quarter. Yield tracking is automated by the Brasa Meat OS physical integration at the prep station. Tampering with the scale is a terminable offense.
                </p>
            </div>
        </div>
    );
}

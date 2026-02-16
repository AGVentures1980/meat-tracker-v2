import { useState, useEffect } from 'react';
import {
    Search,
    Zap,
    Mail,
    Calendar,
    Building,
    TrendingUp,
    AlertCircle
} from 'lucide-react';

interface Prospect {
    id: string;
    companyName: string;
    size: 'Small' | 'Medium' | 'Large';
    segment: string;
    closeProbability: number;
    revenuePotential: string;
    rationale: string;
    contactName: string;
    foundation: string;
}

export const AIProspectingEngine = () => {
    const [prospects, setProspects] = useState<Prospect[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchProgress, setSearchProgress] = useState(0);

    const mockProspects: Prospect[] = [
        {
            id: 'p1',
            companyName: 'Grelhados & Cia',
            size: 'Medium',
            segment: 'Churrascaria Premium',
            closeProbability: 92,
            revenuePotential: '$45k/year',
            rationale: 'Recent 15% drop in profit margin due to inefficient inventory tracking. Management is seeking automation for meat waste control.',
            contactName: 'Carlos Eduardo (CTO)',
            foundation: 'São Paulo - 12 Locations'
        },
        {
            id: 'p2',
            companyName: 'Fogo de Chão (Partner Group)',
            size: 'Large',
            segment: 'Steakhouse Chain',
            closeProbability: 88,
            revenuePotential: '$120k/year',
            rationale: 'Strong synergy with current Brazil portfolio. High technical overlap with existing Brasa Intel modules. Expansion to Florida requires specialized tracking.',
            contactName: 'Mariana Silva (Operations Director)',
            foundation: 'International - 60 Locations'
        },
        {
            id: 'p3',
            companyName: 'Hambúrguer de Bairro',
            size: 'Small',
            segment: 'Fast Casual',
            closeProbability: 84,
            revenuePotential: '$12k/year',
            rationale: 'Currently transitioning from manual spreadsheets to digital. Fits perfectly into the standard "Growth" plan. High referral probability.',
            contactName: 'Roberto Junior (Owner)',
            foundation: 'Curitiba - 2 Locations'
        }
    ];


    const runScan = () => {
        setIsSearching(true);
        setSearchProgress(0);
        let progress = 0;
        const interval = setInterval(() => {
            progress += 5;
            setSearchProgress(progress);
            if (progress >= 100) {
                clearInterval(interval);
                setIsSearching(false);
                setProspects(mockProspects);
            }
        }, 100);
    };

    useEffect(() => {
        const timeout = setTimeout(runScan, 1000);
        return () => clearTimeout(timeout);
    }, []);

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center bg-[#111] p-6 rounded-3xl border border-white/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                    <Search size={120} className="text-white" />
                </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-[#FF2A6D]/20 rounded-lg">
                            <Zap className="text-[#FF2A6D]" size={20} />
                        </div>
                        <h2 className="text-2xl font-black text-white tracking-tight">AI PROSPECTING AGENT</h2>
                    </div>
                    <p className="text-gray-500 text-sm max-w-md">
                        Searching for companies with high-intent digital transformation needs and <span className="text-[#00FF94] font-bold">&gt;80% conversion probability</span>.
                    </p>
                </div>
                <button
                    onClick={runScan}
                    disabled={isSearching}
                    className={`px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${isSearching
                        ? 'bg-gray-800 text-gray-400 cursor-not-allowed'
                        : 'bg-[#C5A059] text-black hover:bg-[#D5B069] shadow-[0_10px_30px_rgba(197,160,89,0.2)]'
                        }`}
                >
                    {isSearching ? `SCANNING NEURAL NETS ${searchProgress}%` : 'TRIGGER NEW SCAN'}
                </button>
            </div>

            {isSearching && (
                <div className="bg-[#111] border border-white/5 rounded-3xl p-12 text-center animate-pulse">
                    <div className="inline-flex flex-col items-center">
                        <div className="w-16 h-16 border-4 border-[#C5A059] border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-gray-400 font-mono text-sm">ANALYZING MARKET SYNERGY DATA...</p>
                        <div className="mt-8 flex gap-2">
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="h-1 w-8 bg-[#C5A059]/30 rounded-full"></div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {!isSearching && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {prospects.map((p) => (
                        <div key={p.id} className="group relative bg-[#111] border border-white/5 rounded-3xl p-6 hover:border-[#C5A059]/30 transition-all duration-500 hover:shadow-2xl">
                            <div className="absolute top-4 right-4 bg-[#00FF94]/10 text-[#00FF94] px-3 py-1 rounded-full text-[10px] font-black tracking-widest flex items-center gap-2 border border-[#00FF94]/20">
                                <TrendingUp size={12} /> {p.closeProbability}% CHANCE
                            </div>

                            <div className="mb-6">
                                <div className="p-3 bg-white/5 w-fit rounded-2xl mb-4 text-[#C5A059] group-hover:scale-110 transition-transform">
                                    <Building size={24} />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-1">{p.companyName}</h3>
                                <p className="text-gray-500 text-xs font-mono uppercase tracking-widest">{p.segment} • {p.size}</p>
                            </div>

                            <div className="space-y-4 mb-8">
                                <div className="p-4 bg-white/3 rounded-2xl border border-white/5">
                                    <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                                        <AlertCircle size={10} className="text-[#C5A059]" /> Close Rationale
                                    </h4>
                                    <p className="text-xs text-gray-400 leading-relaxed italic">
                                        "{p.rationale}"
                                    </p>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-gray-500">Revenue Potential</span>
                                    <span className="text-[#00FF94] font-bold font-mono">{p.revenuePotential}</span>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-white/5 flex gap-3">
                                <button className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2">
                                    <Mail size={14} className="text-[#C5A059]" /> Email Marketing
                                </button>
                                <button className="flex-1 py-3 bg-[#C5A059] text-black text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2">
                                    <Calendar size={14} /> Schedule Meeting
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

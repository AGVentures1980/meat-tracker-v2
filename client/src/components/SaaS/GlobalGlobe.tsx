import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, ArrowRight, Globe as GlobeIcon, Network, DollarSign, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface Company {
    id: string;
    name: string;
    plan: string;
    _count: {
        stores: number;
    }
}

interface GlobalGlobeProps {
    companies: Company[];
    onSelect: (company: Company) => void;
}

export const GlobalGlobe = ({ companies, onSelect }: GlobalGlobeProps) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [imageLoaded, setImageLoaded] = useState(false);

    useEffect(() => {
        const img = new Image();
        img.src = '/earth-iphone-classic.png';
        img.onload = () => setImageLoaded(true);
    }, []);

    const systemCompanies = companies.filter(c => c.name.includes("Fogo") || c.name.includes("Texas") || c.name.toLowerCase().includes("outback") || c.name.includes("Brasa"));

    return (
        <div className="fixed inset-0 w-full h-full bg-[#000000] overflow-hidden flex flex-col z-[80]">
            {/* The Classic Earth Image */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 mt-8 md:mt-24">
                <img 
                    src="/earth-iphone-classic.png" 
                    alt="Classic iPhone Earth" 
                    className={`w-[110%] md:w-[90%] max-w-[1200px] object-contain transition-opacity duration-1000 ease-in-out ${imageLoaded ? 'opacity-85' : 'opacity-0'} drop-shadow-[0_0_80px_rgba(255,255,255,0.05)] md:translate-y-12`}
                />
            </div>

            {/* Soft Overlay to blend bottom into black */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#000000] via-[#000000]/30 to-transparent pointer-events-none z-0"></div>

            {/* Top Interactive Layer */}
            <div className="relative z-10 w-full h-full p-6 md:p-12 flex flex-col items-center overflow-y-auto overflow-x-hidden custom-scrollbar">
                
                {/* Header */}
                <div className="text-center mb-10 mt-6 md:mt-2">
                    <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-200 to-gray-500 mb-2 md:mb-4 tracking-tighter uppercase">
                        Global <span className="text-[#C5A059]">Intelligence</span>
                    </h1>
                    <div className="flex items-center justify-center gap-3">
                        <span className="w-2 h-2 rounded-full bg-[#00FF94] animate-pulse shadow-[0_0_10px_#00FF94]"></span>
                        <p className="text-[#00FF94] font-mono uppercase tracking-[0.3em] text-[10px] md:text-xs font-bold">Network Systems Online</p>
                    </div>
                </div>

                {/* Master Action Hub */}
                <div className="w-full flex-shrink-0 flex justify-center mt-auto mb-10 pt-10">
                    {user?.email?.toLowerCase().includes('alexandre@alexgarciaventures.co') && (
                        <div className="flex flex-wrap justify-center gap-4 md:gap-8 min-w-[300px]">
                            <button
                                onClick={() => navigate('/saas-admin')}
                                className="group flex flex-col items-center gap-3 transition-transform hover:scale-105 active:scale-95 w-24 md:w-32"
                            >
                                <div className="w-16 h-16 bg-[#1a1a1a]/60 backdrop-blur-md border border-[#333] hover:border-emerald-500/50 rounded-full flex items-center justify-center transition-all shadow-[0_0_20px_rgba(0,0,0,0.5)] group-hover:shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                                    <GlobeIcon className="w-6 h-6 text-emerald-500/70 group-hover:text-emerald-400 transition-colors" />
                                </div>
                                <div className="text-center w-full">
                                    <h4 className="text-white text-xs font-bold tracking-widest uppercase">Platform Hub</h4>
                                </div>
                            </button>

                            <button
                                onClick={() => navigate('/agv-network')}
                                className="group flex flex-col items-center gap-3 transition-transform hover:scale-105 active:scale-95 w-24 md:w-32"
                            >
                                <div className="w-16 h-16 bg-[#1a1a1a]/60 backdrop-blur-md border border-[#333] hover:border-indigo-500/50 rounded-full flex items-center justify-center transition-all shadow-[0_0_20px_rgba(0,0,0,0.5)] group-hover:shadow-[0_0_30px_rgba(99,102,241,0.3)]">
                                    <Network className="w-6 h-6 text-indigo-500/70 group-hover:text-indigo-400 transition-colors" />
                                </div>
                                <div className="text-center w-full">
                                    <h4 className="text-white text-xs font-bold tracking-widest uppercase">Partner Net</h4>
                                </div>
                            </button>

                            <button
                                onClick={() => navigate('/agv-billing')}
                                className="group flex flex-col items-center gap-3 transition-transform hover:scale-105 active:scale-95 w-24 md:w-32"
                            >
                                <div className="w-16 h-16 bg-[#1a1a1a]/60 backdrop-blur-md border border-[#333] hover:border-blue-500/50 rounded-full flex items-center justify-center transition-all shadow-[0_0_20px_rgba(0,0,0,0.5)] group-hover:shadow-[0_0_30px_rgba(59,130,246,0.3)]">
                                    <DollarSign className="w-6 h-6 text-blue-500/70 group-hover:text-blue-400 transition-colors" />
                                </div>
                                <div className="text-center w-full">
                                    <h4 className="text-white text-xs font-bold tracking-widest uppercase">Billing</h4>
                                </div>
                            </button>

                            <button
                                onClick={() => navigate('/agv-fraud-audit')}
                                className="group flex flex-col items-center gap-3 transition-transform hover:scale-105 active:scale-95 w-24 md:w-32"
                            >
                                <div className="w-16 h-16 bg-[#1a1a1a]/60 backdrop-blur-md border border-[#333] hover:border-red-500/50 rounded-full flex items-center justify-center transition-all shadow-[0_0_20px_rgba(0,0,0,0.5)] group-hover:shadow-[0_0_30px_rgba(239,68,68,0.3)]">
                                    <ShieldAlert className="w-6 h-6 text-red-500/70 group-hover:text-red-400 transition-colors" />
                                </div>
                                <div className="text-center w-full">
                                    <h4 className="text-white text-xs font-bold tracking-widest uppercase">Global Radar</h4>
                                </div>
                            </button>

                            <button
                                onClick={() => navigate('/owner-terminal')}
                                className="group flex flex-col items-center gap-3 transition-transform hover:scale-105 active:scale-95 w-28 md:w-36"
                            >
                                <div className="w-16 h-16 bg-[#1a1a1a]/60 backdrop-blur-md border border-[#C5A059]/30 hover:border-[#C5A059] rounded-full flex items-center justify-center transition-all shadow-[0_0_20px_rgba(0,0,0,0.5)] group-hover:shadow-[0_0_40px_rgba(197,160,89,0.5)]">
                                    <Zap className="w-6 h-6 text-[#C5A059] group-hover:text-white transition-colors" />
                                </div>
                                <div className="text-center w-full">
                                    <h4 className="text-white text-[11px] md:text-xs font-bold tracking-widest uppercase">Intelligence Center</h4>
                                </div>
                            </button>
                        </div>
                    )}
                </div>

                {/* Company Glassmorphism Floating Dock */}
                <div className="w-full max-w-6xl flex-shrink-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pb-20">
                    {systemCompanies.map((company) => (
                        <div
                            key={company.id}
                            onClick={() => onSelect(company)}
                            className="group relative bg-[#121212]/30 backdrop-blur-xl border border-white/10 p-6 rounded-2xl cursor-pointer hover:bg-[#1a1a1a]/70 hover:border-[#C5A059]/50 transition-all duration-300 shadow-[0_10px_30px_rgba(0,0,0,0.5)] hover:shadow-[0_20px_50px_rgba(197,160,89,0.2)]"
                        >
                            <div className="flex justify-between items-start mb-4">
                                {company.name === 'Fogo de Chão' ? (
                                    <img src="/fdc-logo-pure-white.png" alt="Fogo" className="h-[24px] object-contain" />
                                ) : company.name === 'Texas de Brazil' ? (
                                    <img src="/tdb-logo-white.svg" alt="TDB" className="h-[36px] object-contain" />
                                ) : company.name.toLowerCase().includes('outback') ? (
                                    <img src="/outback-logo.svg" alt="Outback" className="h-[28px] object-contain" />
                                ) : company.name.toLowerCase().includes('brasa') ? (
                                    <img src="/brasa-logo-v3.png" alt="Brasa" className="h-[28px] object-contain brightness-[5] grayscale" />
                                ) : (
                                    <h3 className="text-lg font-bold text-white group-hover:text-[#C5A059] truncate">{company.name}</h3>
                                )}
                                <ArrowRight className="w-5 h-5 text-gray-600 group-hover:text-[#C5A059]" />
                            </div>
                            <div className="flex items-center justify-between text-[10px] uppercase font-mono tracking-widest">
                                <span className="text-gray-400">{company._count.stores} <span className="text-gray-600">STORES</span></span>
                                <span className="text-[#C5A059]/70 bg-[#C5A059]/10 px-2 py-0.5 rounded border border-[#C5A059]/20">{company.plan}</span>
                            </div>
                        </div>
                    ))}
                </div>

            </div>
        </div>
    );
};

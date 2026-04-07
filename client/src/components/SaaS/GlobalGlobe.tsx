import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, ArrowRight, Globe as GlobeIcon, Network, DollarSign, ShieldAlert, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Globe from 'react-globe.gl';

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

const REGIONS = [
    { id: 'USA', name: 'USA', lat: 39.8283, lng: -98.5795, size: 5, color: '#C5A059' }, // Gold
    { id: 'BR', name: 'BRASIL', lat: -14.2350, lng: -51.9253, size: 5, color: '#C5A059' },
    { id: 'UAE', name: 'DUBAI', lat: 25.2048, lng: 55.2708, size: 3, color: '#C5A059' },
    { id: 'PH', name: 'FILIPINAS', lat: 12.8797, lng: 121.7740, size: 3, color: '#C5A059' },
];

export const GlobalGlobe = ({ companies, onSelect }: GlobalGlobeProps) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const globeEl = useRef<any>();
    const [dimensions, setDimensions] = useState({
        width: window.innerWidth,
        height: window.innerHeight
    });
    const [activeRegion, setActiveRegion] = useState<string | null>(null);

    useEffect(() => {
        const handleResize = () => setDimensions({ width: window.innerWidth, height: window.innerHeight });
        window.addEventListener('resize', handleResize);

        // Configure auto-rotation and initial zoom after a tick
        setTimeout(() => {
            if (globeEl.current) {
                globeEl.current.controls().autoRotate = true;
                globeEl.current.controls().autoRotateSpeed = 0.5;
                globeEl.current.controls().enableZoom = true; // Allow zoom so user can tap precisely
                globeEl.current.pointOfView({ altitude: 2 });
            }
        }, 100);

        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Stop rotation when a region is focused to lock onto it
    useEffect(() => {
        if (globeEl.current) {
            globeEl.current.controls().autoRotate = !activeRegion;
        }
    }, [activeRegion]);

    const systemCompanies = companies.filter(c => c.name.includes("Fogo") || c.name.includes("Texas") || c.name.toLowerCase().includes("outback") || c.name.includes("Brasa"));

    // Hardcode the region variations based on master database
    const regionalOperations = {
        'USA': [
            { id: 'usa-1', dbMatch: 'Fogo', name: 'Fogo de Chão USA', img: '/fdc-logo-pure-white.png', stores: 58, plan: 'ENTERPRISE' },
            { id: 'usa-2', dbMatch: 'Texas', name: 'Texas de Brazil', img: '/tdb-logo-white.svg', stores: 49, plan: 'ENTERPRISE' },
            { id: 'usa-3', dbMatch: 'Outback', name: 'Outback USA', img: '/outback-logo.svg', stores: 700, plan: 'ENTERPRISE' },
            { id: 'usa-4', dbMatch: 'Brasa', name: 'Brasa USA', img: '/brasa-logo-v3.png', stores: 1, plan: 'HQ' }
        ],
        'BR': [
            { id: 'br-1', dbMatch: 'Fogo', name: 'Fogo de Chão Brasil', img: '/fdc-logo-pure-white.png', stores: 9, plan: 'ENTERPRISE' },
            { id: 'br-2', dbMatch: 'Outback', name: 'Outback Brasil', img: '/outback-logo.svg', stores: 152, plan: 'ENTERPRISE' }
        ],
        'UAE': [
            { id: 'uae-1', dbMatch: 'Fogo', name: 'Fogo de Chão Dubai', img: '/fdc-logo-pure-white.png', stores: 1, plan: 'ENTERPRISE' },
            { id: 'uae-2', dbMatch: 'Texas', name: 'Texas de Brazil Dubai', img: '/tdb-logo-white.svg', stores: 1, plan: 'ENTERPRISE' }
        ],
        'PH': [
            { id: 'ph-1', dbMatch: 'Fogo', name: 'Fogo de Chão Philippines', img: '/fdc-logo-pure-white.png', stores: 1, plan: 'ENTERPRISE' }
        ]
    };

    const displayedCards = activeRegion ? regionalOperations[activeRegion as keyof typeof regionalOperations] : systemCompanies.map(c => ({
        id: c.id,
        dbMatch: c.name,
        name: c.name,
        stores: c._count.stores,
        plan: c.plan,
        img: c.name.includes('Fogo') ? '/fdc-logo-pure-white.png' :
             c.name.includes('Texas') ? '/tdb-logo-white.svg' :
             c.name.toLowerCase().includes('outback') ? '/outback-logo.svg' : 
             '/brasa-logo-v3.png'
    }));

    const handleSelectCard = (card: any) => {
        // Resolve parent company from database for accurate routing
        const targetDbCompany = companies.find(c => c.name.includes(card.dbMatch) || card.dbMatch.includes(c.name));
        if (targetDbCompany) {
            onSelect(targetDbCompany);
        } else if (systemCompanies.length > 0) {
            onSelect(systemCompanies[0]); // fallback
        }
    };

    const handleRegionClick = (region: any) => {
        setActiveRegion(region.id);
        // Spin globe to the region clicked
        if (globeEl.current) {
            globeEl.current.pointOfView({ lat: region.lat, lng: region.lng, altitude: 1.5 }, 1500);
        }
    };

    return (
        <div className="fixed inset-0 w-full h-full bg-[#000000] overflow-hidden flex flex-col z-[80]">
            {/* 3D Photorealistic Rotating Globe Engine */}
            <div className="absolute inset-0 z-0 opacity-80 mt-12 md:mt-24 flex justify-center items-center">
                <Globe
                    ref={globeEl}
                    width={dimensions.width}
                    height={dimensions.height}
                    backgroundColor="rgba(0,0,0,0)" // Transparent to blend with our gradient
                    globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
                    bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
                    atmosphereColor="#5ca2ff"
                    atmosphereAltitude={0.15}
                    
                    // Radar Rings
                    ringsData={REGIONS}
                    ringLat={(d: any) => d.lat}
                    ringLng={(d: any) => d.lng}
                    ringColor={(d: any) => d.color}
                    ringMaxRadius={(d: any) => d.size}
                    ringPropagationSpeed={3}
                    ringRepeatPeriod={1500}
                    
                    // Region Labels
                    labelsData={REGIONS}
                    labelLat={(d: any) => d.lat}
                    labelLng={(d: any) => d.lng}
                    labelText={(d: any) => d.name}
                    labelSize={1.5}
                    labelDotRadius={0.5}
                    labelColor={(d: any) => d.color}
                    labelResolution={2}
                    
                    // Interactions
                    onRingClick={handleRegionClick}
                    onLabelClick={handleRegionClick}
                />
            </div>

            {/* Deep space soft overlay to merge the globe cleanly into black */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#000000] via-[#000000]/60 to-transparent pointer-events-none z-0"></div>

            {/* Top Interactive Layer */}
            <div className="relative z-10 w-full h-full p-6 md:p-12 flex flex-col items-center overflow-y-auto overflow-x-hidden custom-scrollbar pointer-events-none">
                
                {/* Header */}
                <div className="text-center mb-10 mt-6 md:mt-2 pointer-events-auto">
                    <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-200 to-gray-500 mb-2 md:mb-4 tracking-tighter uppercase">
                        Global <span className="text-[#C5A059]">Intelligence</span>
                    </h1>
                    <div className="flex items-center justify-center gap-3">
                        <span className="w-2 h-2 rounded-full bg-[#00FF94] animate-pulse shadow-[0_0_10px_#00FF94]"></span>
                        <p className="text-[#00FF94] font-mono uppercase tracking-[0.3em] text-[10px] md:text-xs font-bold">Network Systems Online</p>
                    </div>
                </div>

                {/* Master Action Hub */}
                <div className="w-full flex-shrink-0 flex justify-center mt-auto mb-10 pt-10 pointer-events-auto">
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
                <div className="w-full max-w-6xl flex-shrink-0 pointer-events-auto">
                    
                    {activeRegion && (
                        <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-2">
                            <h2 className="text-[#C5A059] text-sm uppercase tracking-widest font-bold flex items-center gap-2">
                                <Zap className="w-4 h-4" /> 
                                Operações em: {REGIONS.find(r => r.id === activeRegion)?.name}
                            </h2>
                            <button 
                                onClick={() => setActiveRegion(null)}
                                className="text-xs text-gray-400 hover:text-white flex items-center gap-1 uppercase tracking-wider"
                            >
                                <X className="w-3 h-3" /> Ver Hub Global
                            </button>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pb-20">
                        {displayedCards.map((company) => (
                            <div
                                key={company.id}
                                onClick={() => handleSelectCard(company)}
                                className="group relative bg-[#121212]/30 backdrop-blur-xl border border-white/10 p-6 rounded-2xl cursor-pointer hover:bg-[#1a1a1a]/70 hover:border-[#C5A059]/50 transition-all duration-300 shadow-[0_10px_30px_rgba(0,0,0,0.5)] hover:shadow-[0_20px_50px_rgba(197,160,89,0.2)]"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    {company.img ? (
                                        <img src={company.img} alt={company.name} className={`h-[24px] object-contain ${company.name.includes('Brasa') ? 'brightness-[5] grayscale' : ''}`} />
                                    ) : (
                                        <h3 className="text-lg font-bold text-white group-hover:text-[#C5A059] truncate">{company.name}</h3>
                                    )}
                                    <ArrowRight className="w-5 h-5 text-gray-600 group-hover:text-[#C5A059]" />
                                </div>
                                <div className="flex items-center justify-between text-[10px] uppercase font-mono tracking-widest">
                                    <span className="text-gray-400">{company.stores} <span className="text-gray-600">{company.stores === 1 ? 'STORE' : 'STORES'}</span></span>
                                    <span className="text-[#C5A059]/70 bg-[#C5A059]/10 px-2 py-0.5 rounded border border-[#C5A059]/20">{company.plan}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
};

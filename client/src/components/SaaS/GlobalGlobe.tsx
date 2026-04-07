import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, ArrowRight, Globe as GlobeIcon, Network, DollarSign, ShieldAlert, X, Pause, Play, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
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
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    
    const [dimensions, setDimensions] = useState({
        width: window.innerWidth,
        height: window.innerHeight
    });
    const [activeRegion, setActiveRegion] = useState<string | null>(null);
    const [isPaused, setIsPaused] = useState(false);
    
    // Store mapping states
    const [focusedCompany, setFocusedCompany] = useState<any>(null);
    const [companyPoints, setCompanyPoints] = useState<any[]>([]);

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

    // Stop rotation when a region is focused to lock onto it or manually paused
    useEffect(() => {
        if (globeEl.current) {
            globeEl.current.controls().autoRotate = !activeRegion && !isPaused && !focusedCompany;
        }
    }, [activeRegion, isPaused, focusedCompany]);

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

    const generatePointsData = (regionId: string, count: number, companyName: string) => {
        const points = [];
        
        // Refined geographic clusters to ensure points land perfectly on continental urban areas (no ocean drops)
        const clusters = {
            'USA': [
                { minLat: 29, maxLat: 33, minLng: -98, maxLng: -95 }, // Texas Corridor
                { minLat: 25.5, maxLat: 28.5, minLng: -82, maxLng: -80 }, // Florida
                { minLat: 40.5, maxLat: 42, minLng: -75, maxLng: -71 }, // Northeast USA
                { minLat: 33.5, maxLat: 38, minLng: -122, maxLng: -117 }, // California
                { minLat: 41.5, maxLat: 42.5, minLng: -88, maxLng: -87 } // Chicago
            ],
            'BR': [
                { minLat: -24, maxLat: -22, minLng: -47, maxLng: -43 }, // SP / RJ
                { minLat: -16, maxLat: -15, minLng: -48, maxLng: -47 } // Brasilia
            ],
            'UAE': [
                { minLat: 24.8, maxLat: 25.3, minLng: 55.1, maxLng: 55.4 } // Dubai
            ],
            'PH': [
                { minLat: 14.4, maxLat: 14.7, minLng: 120.9, maxLng: 121.1 } // Manila
            ]
        };

        // Determine which clusters to use
        let activeClusters: any[] = [];
        if (regionId && clusters[regionId as keyof typeof clusters]) {
            activeClusters = clusters[regionId as keyof typeof clusters];
        } else {
            // GLOBAL fallback: Currently all onboarded system companies are predominantly USA holding entities.
            // When investigating from the Global Hub, exclusively map stores to the USA mainland.
            activeClusters = [...clusters.USA];
        }
        
        for (let i = 0; i < count; i++) {
            const cluster = activeClusters[Math.floor(Math.random() * activeClusters.length)];
            points.push({
                lat: cluster.minLat + Math.random() * (cluster.maxLat - cluster.minLat),
                lng: cluster.minLng + Math.random() * (cluster.maxLng - cluster.minLng),
            });
        }
        return points;
    };

    const handleSelectCard = (card: any) => {
        if (focusedCompany?.id === card.id) {
            // Second click: Actually enter the dashboard
            const targetDbCompany = companies.find(c => c.name.includes(card.dbMatch) || card.dbMatch.includes(c.name));
            if (targetDbCompany) {
                onSelect(targetDbCompany);
            } else if (systemCompanies.length > 0) {
                onSelect(systemCompanies[0]); // fallback
            }
        } else {
            // First click: Highlight company, plot points on globe
            setFocusedCompany(card);
            
            // Generate refined geographic points mapping the exact number of stores (e.g. 700 for Outback)
            setCompanyPoints(generatePointsData(activeRegion || '', card.stores, card.dbMatch)); 
            
            // Adjust camera slightly to show off the points
            if (globeEl.current) {
                if (activeRegion) {
                    const r = REGIONS.find(reg => reg.id === activeRegion);
                    if (r) {
                        globeEl.current.pointOfView({ lat: r.lat, lng: r.lng, altitude: 0.8 }, 1000);
                    }
                } else {
                    // Pull back and center exactly over the Americas (USA + Brazil) since 95% of system operations are there
                    globeEl.current.pointOfView({ lat: 15, lng: -80, altitude: 2.2 }, 1500);
                }
            }
        }
    };

    const handleRegionClick = (region: any) => {
        setActiveRegion(region.id);
        setFocusedCompany(null);
        setCompanyPoints([]); // Clear points when jumping regions
        // Spin globe to the region clicked
        if (globeEl.current) {
            globeEl.current.pointOfView({ lat: region.lat, lng: region.lng, altitude: 1.5 }, 1500);
        }
    };

    const clearSelection = () => {
        setActiveRegion(null);
        setFocusedCompany(null);
        setCompanyPoints([]);
    };

    const scrollCards = (direction: 'left' | 'right') => {
        if (scrollContainerRef.current) {
            const shift = direction === 'left' ? -350 : 350;
            scrollContainerRef.current.scrollBy({ left: shift, behavior: 'smooth' });
        }
    };

    return (
        <div className="fixed inset-0 w-full h-full bg-[#000000] overflow-hidden flex flex-col z-[80]">
            
            {/* Minimalist Top Right Controls */}
            <div className="absolute top-6 right-6 z-[90] pointer-events-auto">
                <button 
                    onClick={() => setIsPaused(!isPaused)}
                    className="p-3 rounded-full bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 text-white/40 hover:text-white transition-all duration-300 shadow-lg group"
                    title={isPaused ? "Retomar Rotação" : "Pausar Globo"}
                >
                    {isPaused ? <Play className="w-4 h-4 text-[#C5A059] fill-current" /> : <Pause className="w-4 h-4 group-hover:text-[#C5A059]" />}
                </button>
            </div>

            {/* Pure 3D WebGL Rendering (No CSS Hacks or Layers to prevent banding) */}
            <div className="absolute inset-0 z-0 flex justify-center items-center pointer-events-none">
                <div className="pointer-events-auto">
                    <Globe
                        ref={globeEl}
                        width={dimensions.width}
                        height={dimensions.height}
                        backgroundColor="rgba(0,0,0,0)" // Transparent into pure #000000
                        globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
                        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
                        showAtmosphere={true}
                        atmosphereColor="#0f2a4a" // Very deep, dark cinematic blue to transition into black smoothly
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
                        labelResolution={2} // Better text crispness
                        
                        // Generated Store Locations for Focused Company (Cinematic Glowing Dots)
                        htmlElementsData={companyPoints}
                        htmlLat={(d: any) => d.lat}
                        htmlLng={(d: any) => d.lng}
                        htmlElement={() => {
                            const el = document.createElement('div');
                            // Ultra-tiny glowing stars
                            el.innerHTML = `
                                <div class="w-1 h-1 bg-[#fef08a] rounded-full shadow-[0_0_5px_1px_#C5A059] opacity-80 pb-0 mb-0"></div>
                            `;
                            return el;
                        }}
                        
                        // Interactions
                        onRingClick={handleRegionClick}
                        onLabelClick={handleRegionClick}
                    />
                </div>
            </div>

            {/* Top Interactive Layer */}
            <div className="relative z-10 w-full h-full p-6 md:p-12 flex flex-col items-center overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] pointer-events-none">
                
                {/* Header */}
                <div className="text-center mb-10 mt-6 md:mt-4 pointer-events-auto transition-all duration-500" style={{ opacity: focusedCompany ? 0 : 1 }}>
                    <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-200 to-gray-500 mb-2 tracking-tighter uppercase">
                        Global <span className="text-[#C5A059]">Intelligence</span>
                    </h1>
                    <div className="flex items-center justify-center gap-3">
                        <span className="w-2 h-2 rounded-full bg-[#00FF94] animate-pulse shadow-[0_0_10px_#00FF94]"></span>
                        <p className="text-[#00FF94] font-mono uppercase tracking-[0.3em] text-[10px] md:text-xs font-bold">Network Systems Online</p>
                    </div>
                </div>

                {/* Master Action Hub */}
                <div className="w-full flex-shrink-0 flex justify-center mt-auto mb-10 pointer-events-auto transition-all duration-500" style={{ transform: focusedCompany ? 'scale(0.95)' : 'scale(1)', opacity: focusedCompany ? 0.3 : 1 }}>
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
                                    <h4 className="text-white text-[11px] md:text-xs font-bold tracking-widest uppercase">Intel Center</h4>
                                </div>
                            </button>
                        </div>
                    )}
                </div>

                {/* Company Glassmorphism Floating Dock */}
                <div className="w-full max-w-6xl flex-shrink-0 pointer-events-auto">
                    
                    {(activeRegion || focusedCompany) && (
                        <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-2">
                            <h2 className="text-[#C5A059] text-sm uppercase tracking-widest font-bold flex items-center gap-2">
                                <MapPin className="w-4 h-4 animate-bounce" /> 
                                {focusedCompany 
                                    ? `MAPA DE OPERAÇÕES: ${focusedCompany.name.toUpperCase()}`
                                    : `OPERAÇÕES EM: ${REGIONS.find(r => r.id === activeRegion)?.name}`}
                            </h2>
                            <button 
                                onClick={clearSelection}
                                className="text-xs px-3 py-1 rounded bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 flex items-center gap-1 uppercase tracking-wider transition-colors"
                            >
                                <X className="w-3 h-3" /> Ver Hub Global
                            </button>
                        </div>
                    )}

                    <div className="relative group/carousel">
                        {/* Horizontal Scroll Arrows */}
                        <button 
                            onClick={() => scrollCards('left')} 
                            className="absolute left-0 top-1/2 -translate-y-1/2 -ml-3 md:-ml-6 z-20 p-2 bg-[#1a1a1a]/80 backdrop-blur-md border border-white/10 text-white rounded-full opacity-0 group-hover/carousel:opacity-100 disabled:opacity-0 transition-opacity hover:bg-[#C5A059] hover:text-black shadow-lg"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>

                        <div 
                            ref={scrollContainerRef}
                            className="flex gap-4 pb-20 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] snap-x snap-mandatory scroll-smooth"
                        >
                            {displayedCards.map((company) => {
                                const isFocused = focusedCompany?.id === company.id;
                                const isDimmed = focusedCompany && !isFocused;

                                return (
                                    <div
                                        key={company.id}
                                        onClick={() => handleSelectCard(company)}
                                        className={`shrink-0 w-[280px] snap-start group relative bg-[#121212]/30 backdrop-blur-xl border p-6 rounded-2xl cursor-pointer transition-all duration-500 flex flex-col justify-between
                                            ${isFocused ? 'border-[#C5A059] bg-[#1a1a1a]/80 shadow-[0_15px_40px_rgba(197,160,89,0.3)] scale-100 z-10 min-h-[160px]' : 'border-white/10 hover:bg-[#1a1a1a]/70 hover:border-[#C5A059]/50 shadow-[0_10px_30px_rgba(0,0,0,0.5)]'}
                                            ${isDimmed ? 'opacity-30 pointer-events-none' : ''}
                                        `}
                                    >
                                        <div>
                                            <div className="flex justify-between items-start mb-4">
                                                {company.img ? (
                                                    <img 
                                                        src={company.img} 
                                                        alt={company.name} 
                                                        className={`h-[36px] md:h-[44px] w-auto max-w-[180px] object-contain object-left ${company.name.includes('Brasa') ? 'brightness-[5] grayscale' : ''}`} 
                                                    />
                                                ) : (
                                                    <h3 className="text-lg font-bold text-white group-hover:text-[#C5A059] truncate">{company.name}</h3>
                                                )}
                                            </div>
                                            <div className="flex items-center justify-between text-[10px] uppercase font-mono tracking-widest text-[#C5A059]">
                                                <span>{company.stores} STORES <span className="text-gray-500">MAPPED</span></span>
                                            </div>
                                        </div>

                                        {/* Reveal "ACESSAR SYSTEMA" on First Click target */}
                                        <div className={`mt-4 w-full overflow-hidden transition-all duration-500 ease-in-out ${isFocused ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'}`}>
                                            <div className="pt-4 border-t border-white/5">
                                                <button className="w-full flex items-center justify-center gap-2 py-2 bg-[#C5A059] text-black font-bold text-xs uppercase tracking-widest rounded shadow-lg hover:bg-white transition-colors">
                                                    Acessar Dashboard <ArrowRight className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <button 
                            onClick={() => scrollCards('right')} 
                            className="absolute right-0 top-1/2 -translate-y-1/2 -mr-3 md:-mr-6 z-20 p-2 bg-[#1a1a1a]/80 backdrop-blur-md border border-white/10 text-white rounded-full opacity-0 group-hover/carousel:opacity-100 disabled:opacity-0 transition-opacity hover:bg-[#C5A059] hover:text-black shadow-lg"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>

            </div>

            {/* AGV Premium Watermark */}
            <div className="absolute bottom-4 right-6 md:bottom-6 md:right-8 z-[90] pointer-events-none flex flex-col items-end opacity-20 transition-opacity hover:opacity-40">
                <h3 className="text-[#C5A059] font-serif font-black tracking-[0.15em] text-xl md:text-2xl leading-none mb-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">AGV</h3>
                <p className="text-[#e2e8f0] font-mono text-[7px] md:text-[9px] tracking-[0.2em] uppercase drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] mix-blend-screen">
                    &copy; 2026 Alex Garcia Ventures. All Rights Reserved.
                </p>
            </div>
            
        </div>
    );
};

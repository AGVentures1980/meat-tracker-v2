import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, ArrowRight, Globe as GlobeIcon, Network, DollarSign, ShieldAlert, X, Pause, Play, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Globe from 'react-globe.gl';

export interface GlobalStore {
    id: string | number;
    name: string;
    city: string | null;
    state: string | null;
    country: string | null;
    latitude: number | null;
    longitude: number | null;
    status: string;
}

export interface GlobalCompany {
    id: string;
    name: string;
    subdomain: string;
    logo_url: string | null;
    primary_color: string | null;
    company_status: string;
    active_store_count: number;
    mapped_store_count: number;
    geo_pending_count: number;
    stores: GlobalStore[];
}

interface GlobalGlobeProps {
    companies?: any[];
    onSelect: (company: { id: string; name: string; subdomain: string }) => void;
}

export const GlobalGlobe = ({ onSelect }: GlobalGlobeProps) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const globeEl = useRef<any>();
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    
    const [dimensions, setDimensions] = useState({
        width: window.innerWidth,
        height: window.innerHeight
    });
    const [isPaused, setIsPaused] = useState(false);
    
    // Dynamic Global Intelligence State
    const [globalCompanies, setGlobalCompanies] = useState<GlobalCompany[]>([]);
    const [loadingCompanies, setLoadingCompanies] = useState(true);
    const [focusedCompany, setFocusedCompany] = useState<GlobalCompany | null>(null);
    const [isServerOnline, setIsServerOnline] = useState(true);

    // Fetch Canonical Global Intelligence Platform Data
    useEffect(() => {
        let isMounted = true;

        const fetchGlobalIntelligence = async () => {
            try {
                const res = await fetch('/api/v1/platform/global-intelligence', {
                    headers: user?.token ? { 'Authorization': `Bearer ${user.token}` } : {}
                });
                
                if (res.ok) {
                    const data = await res.json();
                    if (isMounted && data.companies) {
                        setGlobalCompanies(data.companies);
                        setIsServerOnline(true);
                    }
                } else {
                    if (isMounted) setIsServerOnline(false);
                }
            } catch (err) {
                console.error('[GLOBAL_GLOBE] Failed to fetch platform global intelligence data', err);
                if (isMounted) setIsServerOnline(false);
            } finally {
                if (isMounted) setLoadingCompanies(false);
            }
        };

        fetchGlobalIntelligence();
        const interval = setInterval(fetchGlobalIntelligence, 30000);

        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [user?.token]);

    useEffect(() => {
        const handleResize = () => setDimensions({ width: window.innerWidth, height: window.innerHeight });
        window.addEventListener('resize', handleResize);

        const timer = setTimeout(() => {
            if (globeEl.current) {
                globeEl.current.controls().autoRotate = true;
                globeEl.current.controls().autoRotateSpeed = 0.5;
                globeEl.current.controls().enableZoom = true;
                globeEl.current.pointOfView({ altitude: 2 });
            }
        }, 100);

        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    useEffect(() => {
        if (globeEl.current) {
            globeEl.current.controls().autoRotate = !isPaused && !focusedCompany;
        }
    }, [isPaused, focusedCompany]);

    // Render Markers strictly from canonical Store coordinates (NO fake / random points)
    const companyPoints = focusedCompany
        ? focusedCompany.stores
            .filter(s => s.latitude !== null && s.longitude !== null && !isNaN(Number(s.latitude)) && !isNaN(Number(s.longitude)))
            .map(s => ({
                lat: Number(s.latitude),
                lng: Number(s.longitude),
                name: s.name,
                city: s.city || s.name
            }))
        : [];

    const handleSelectCard = (company: GlobalCompany) => {
        if (focusedCompany?.id === company.id) {
            // Second click: Navigate to selected tenant dashboard
            onSelect(company);
        } else {
            // First click: Highlight company, plot real store coordinates on globe
            setFocusedCompany(company);
            
            // Focus camera over store cluster if store coordinates exist
            if (globeEl.current && company.stores.length > 0) {
                const validStores = company.stores.filter(s => s.latitude !== null && s.longitude !== null);
                if (validStores.length > 0) {
                    const avgLat = validStores.reduce((acc, s) => acc + Number(s.latitude), 0) / validStores.length;
                    const avgLng = validStores.reduce((acc, s) => acc + Number(s.longitude), 0) / validStores.length;
                    globeEl.current.pointOfView({ lat: avgLat, lng: avgLng, altitude: 1.8 }, 1200);
                } else {
                    globeEl.current.pointOfView({ lat: 20, lng: -80, altitude: 2.2 }, 1200);
                }
            }
        }
    };

    const clearSelection = () => {
        setFocusedCompany(null);
        if (globeEl.current) {
            globeEl.current.pointOfView({ altitude: 2.2 }, 1000);
        }
    };

    const scrollCards = (direction: 'left' | 'right') => {
        if (scrollContainerRef.current) {
            const shift = direction === 'left' ? -350 : 350;
            scrollContainerRef.current.scrollBy({ left: shift, behavior: 'smooth' });
        }
    };

    const isGlobalMaster = user?.scope?.type === 'GLOBAL' || (user?.role === 'admin' && !user?.companyId);

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

            {/* Pure 3D WebGL Rendering */}
            <div className="absolute inset-0 z-0 flex justify-center items-center pointer-events-none">
                <div className="pointer-events-auto">
                    <Globe
                        ref={globeEl}
                        width={dimensions.width}
                        height={dimensions.height}
                        backgroundColor="rgba(0,0,0,0)"
                        globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
                        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
                        showAtmosphere={true}
                        atmosphereColor="#0f2a4a"
                        atmosphereAltitude={0.15}
                        
                        // Real Store Locations for Focused Company
                        htmlElementsData={companyPoints}
                        htmlLat={(d: any) => d.lat}
                        htmlLng={(d: any) => d.lng}
                        htmlElement={(d: any) => {
                            const el = document.createElement('div');
                            el.title = `${d.name} (${d.city || ''})`;
                            el.innerHTML = `
                                <div class="w-2 h-2 bg-[#fef08a] rounded-full shadow-[0_0_8px_2px_#C5A059] opacity-90 transition-transform duration-300 hover:scale-150"></div>
                            `;
                            return el;
                        }}
                    />
                </div>
            </div>

            {/* Top Interactive Layer */}
            <div className="relative z-10 w-full h-full p-6 md:p-12 flex flex-col items-center overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] pointer-events-none">
                
                {/* Header */}
                <div className="text-center mb-10 mt-6 md:mt-4 pointer-events-auto transition-all duration-500" style={{ opacity: focusedCompany ? 0.4 : 1 }}>
                    <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-200 to-gray-500 mb-2 tracking-tighter uppercase">
                        Global <span className="text-[#C5A059]">Intelligence</span>
                    </h1>
                    <div className="flex items-center justify-center gap-3">
                        <span className={`w-2 h-2 rounded-full ${isServerOnline ? 'bg-[#00FF94] animate-pulse shadow-[0_0_10px_#00FF94]' : 'bg-red-500 shadow-[0_0_10px_red]'}`}></span>
                        <p className={`${isServerOnline ? 'text-[#00FF94]' : 'text-red-500'} font-mono uppercase tracking-[0.3em] text-[10px] md:text-xs font-bold`}>
                            {isServerOnline ? 'Platform Registry Active' : 'Registry Connection Offline'}
                        </p>
                    </div>
                </div>

                {/* Master Action Hub */}
                <div className="w-full flex-shrink-0 flex justify-center mt-auto mb-10 pointer-events-auto transition-all duration-500" style={{ transform: focusedCompany ? 'scale(0.95)' : 'scale(1)', opacity: focusedCompany ? 0.3 : 1 }}>
                    {isGlobalMaster && (
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
                    
                    {focusedCompany && (
                        <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-2">
                            <h2 className="text-[#C5A059] text-sm uppercase tracking-widest font-bold flex items-center gap-2">
                                <MapPin className="w-4 h-4 animate-bounce" /> 
                                OPERATIONAL TOPOLOGY: {focusedCompany.name.toUpperCase()}
                            </h2>
                            <button 
                                onClick={clearSelection}
                                className="text-xs px-3 py-1 rounded bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 flex items-center gap-1 uppercase tracking-wider transition-colors"
                            >
                                <X className="w-3 h-3" /> View Global Hub
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
                            className="flex items-center gap-4 py-8 -my-8 px-4 -mx-4 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] snap-x snap-mandatory scroll-smooth"
                        >
                            {loadingCompanies ? (
                                <div className="w-full flex items-center justify-center py-12 text-gray-500 font-mono text-xs uppercase tracking-widest">
                                    Loading dynamic tenant registry...
                                </div>
                            ) : globalCompanies.map((company) => {
                                const isFocused = focusedCompany?.id === company.id;
                                const isDimmed = focusedCompany && !isFocused;
                                const logoUrl = company.logo_url || '/brasa-logo-v3.png';

                                return (
                                    <div
                                        key={company.id}
                                        onClick={() => handleSelectCard(company)}
                                        className={`shrink-0 w-[220px] md:w-[280px] snap-start group relative bg-[#121212]/30 backdrop-blur-xl border p-4 md:p-6 rounded-xl md:rounded-2xl cursor-pointer transition-all duration-500 flex flex-col justify-between
                                            ${isFocused ? 'border-[#C5A059] bg-[#1a1a1a]/80 shadow-[0_15px_40px_rgba(197,160,89,0.3)] scale-100 z-10 min-h-[130px] md:min-h-[160px]' : 'border-white/10 hover:bg-[#1a1a1a]/70 hover:border-[#C5A059]/50 shadow-[0_10px_30px_rgba(0,0,0,0.5)]'}
                                            ${isDimmed ? 'opacity-30 pointer-events-none' : ''}
                                        `}
                                    >
                                        <div>
                                            <div className="flex justify-between items-start mb-3 md:mb-4">
                                                {logoUrl ? (
                                                    <img 
                                                        src={logoUrl} 
                                                        alt={company.name} 
                                                        className="h-[28px] md:h-[44px] w-auto max-w-[150px] md:max-w-[180px] object-contain object-left" 
                                                    />
                                                ) : (
                                                    <h3 className="text-base md:text-lg font-bold text-white group-hover:text-[#C5A059] truncate">{company.name}</h3>
                                                )}
                                            </div>
                                            <div className="flex flex-col gap-1 text-[9px] md:text-[10px] uppercase font-mono tracking-widest text-[#C5A059]">
                                                <span>{company.active_store_count} STORES <span className="text-gray-400">({company.mapped_store_count} MAPPED)</span></span>
                                                {company.geo_pending_count > 0 && (
                                                    <span className="text-amber-500/80 text-[8px]">{company.geo_pending_count} GEO PENDING</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Reveal "Acessar Dashboard" on First Click target */}
                                        <div className={`mt-3 md:mt-4 w-full overflow-hidden transition-all duration-500 ease-in-out ${isFocused ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'}`}>
                                            <div className="pt-3 md:pt-4 border-t border-white/5">
                                                <button className="w-full flex items-center justify-center gap-1 md:gap-2 py-1.5 md:py-2 bg-[#C5A059] text-black font-bold text-[9px] md:text-xs uppercase tracking-widest rounded shadow-lg hover:bg-white transition-colors">
                                                    Acessar Dashboard <ArrowRight className="w-3 h-3 md:w-4 md:h-4" />
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

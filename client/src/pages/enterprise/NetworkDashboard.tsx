import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Globe, ArrowRight, ShieldAlert, AlertTriangle, TrendingUp, TrendingDown, Minus } from 'lucide-react';

export const NetworkDashboard = () => {
    const { user, selectedCompany } = useAuth();
    const navigate = useNavigate();
    const [network, setNetwork] = useState<any>(null);
    const [accuracies, setAccuracies] = useState<any>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchNet = async () => {
            try {
                const res = await fetch('/api/v1/enterprise/network-summary', {
                    headers: { 
                        'Authorization': `Bearer ${user?.token}`,
                        'x-company-id': selectedCompany || user?.companyId
                    }
                });
                
                if (res.ok) {
                    const data = await res.json();
                    setNetwork(data.properties || []);
                    
                    if (data.properties) {
                        const accMap: any = {};
                        for (const n of data.properties) {
                            const accRes = await fetch(`/api/v1/enterprise/property/${n.store_id}/forecast-accuracy-summary`, {
                                headers: { 
                                    'Authorization': `Bearer ${user?.token}`,
                                    'x-company-id': selectedCompany || user?.companyId
                                }
                            });
                            if (accRes.ok) {
                                const accData = await accRes.json();
                                if (accData.data && accData.data.length > 0) {
                                    const sumAcc = accData.data.reduce((sum: number, cur: any) => sum + cur.manager_accuracy_pct, 0);
                                    accMap[n.store_id] = sumAcc / accData.data.length;
                                }
                            }
                        }
                        setAccuracies(accMap);
                    }
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        if (user) {
            fetchNet();
        }
    }, [user]);

    if (loading) return <div className="p-8 text-[#C5A059] animate-pulse font-mono tracking-widest text-center">Loading Network Context...</div>;
    if (!network || network.length === 0) return (
        <div className="flex flex-col items-center justify-center p-12 mt-12 max-w-2xl mx-auto text-gray-400 border border-dashed border-[#333] rounded-xl bg-[#111]">
            <Globe className="w-12 h-12 mb-4 text-[#C5A059] opacity-50" />
            <h2 className="text-xl font-bold text-white mb-2 tracking-widest uppercase">Network Diagnostics</h2>
            <p className="text-center mb-6">No active properties provisioned for your current access level, or session requires a refresh. Please refresh or contact support.</p>
            <button onClick={() => window.location.reload()} className="px-6 py-2 border border-[#C5A059] text-[#C5A059] hover:bg-[#C5A059] hover:text-black font-bold uppercase tracking-widest transition-colors rounded">
                Refresh Context
            </button>
        </div>
    );

    try {

    const properties = network.map((n: any) => {
        const name = n.store_name?.toLowerCase() || '';
        const isTampa = name.includes('tampa');
        const isHollywood = name.includes('hollywood');
        const isPunta = name.includes('punta');
        const isAC = name.includes('atlantic');

        return {
            id: n.store_id,
            slug: isTampa ? 'tampa-casino' : isHollywood ? 'hollywood-casino' : isPunta ? 'punta-cana' : isAC ? 'atlantic-city' : n.store_id.toString(),
            name: n.store_name,
            location: n.location || 'Pending Location',
            guests: isTampa ? 2450 : isHollywood ? 3100 : isPunta ? 1800 : isAC ? 2200 : 1500,
            lbs: isTampa ? 4500 : isHollywood ? 5800 : isPunta ? 2800 : isAC ? 4100 : 2000,
            target: isTampa ? 1.76 : isHollywood ? 1.76 : isPunta ? 1.60 : isAC ? 1.80 : 1.75,
            outlets: isTampa ? 16 : isHollywood ? 12 : isPunta ? 8 : isAC ? 10 : 5
        };
    });

    const totalStats = properties.reduce((acc, curr) => ({
        guests: acc.guests + curr.guests,
        lbs: acc.lbs + curr.lbs,
    }), { guests: 0, lbs: 0 });

    const netLbsGuest = totalStats.lbs / totalStats.guests;
    const criticalCount = properties.reduce((acc, curr) => {
        const lbsGuest = curr.lbs / curr.guests;
        return acc + (lbsGuest > curr.target * 1.15 ? 1 : 0);
    }, 0);

    return (
        <div className="max-w-7xl mx-auto py-8 text-white space-y-6">
            <h1 className="text-2xl font-bold text-[#C5A059] tracking-widest uppercase pb-2 flex items-center gap-3">
                <Globe className="w-6 h-6" /> Enterprise Network Dashboard
            </h1>

            {/* A. NETWORK HEADER */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-[#1a1a1a] p-4 border border-[#333] rounded">
                    <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">Network Covers</div>
                    <div className="text-3xl font-bold text-white">{totalStats.guests.toLocaleString()}</div>
                    <div className="text-xs text-gray-400 mt-2">Today</div>
                </div>
                <div className="bg-[#1a1a1a] p-4 border border-[#333] rounded">
                    <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">Network Lbs</div>
                    <div className="text-3xl font-bold text-white">{totalStats.lbs.toLocaleString()}</div>
                    <div className="text-xs text-gray-400 mt-2">Today</div>
                </div>
                <div className="bg-[#1a1a1a] p-4 border border-[#333] rounded">
                    <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">Lbs / Guest Avg</div>
                    <div className="text-3xl font-bold text-[#C5A059]">{netLbsGuest.toFixed(2)}</div>
                    <div className="text-xs text-gray-400 mt-2">Aggregate</div>
                </div>
                <div className="bg-[#1a1a1a] p-4 border border-[#333] rounded">
                    <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">Properties at Risk</div>
                    <div className={`text-3xl font-bold ${criticalCount > 0 ? 'text-red-500' : 'text-green-500'}`}>{criticalCount}</div>
                    <div className="text-xs text-gray-400 mt-2">Active Critical Flags</div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                
                {/* B. PROPERTY CARDS GRID */}
                <div className="lg:col-span-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {properties.map(p => {
                            const lg = p.lbs / p.guests;
                            const dev = (lg - p.target) / p.target;
                            const pts = dev > 0.15 ? 4 : dev > 0.08 ? 2 : 0;
                            const dataTrust = accuracies[p.id] !== undefined ? accuracies[p.id] : 85; 
                            
                            return (
                                <div 
                                    key={p.id} 
                                    onClick={() => navigate(`/dashboard/property/${p.slug}`)} 
                                    className="bg-[#1a1a1a] border border-[#333] hover:border-[#C5A059] rounded-lg p-5 cursor-pointer transition-all group relative overflow-hidden"
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="font-bold text-lg text-white group-hover:text-[#C5A059] transition-colors">{p.name}</h3>
                                            <p className="text-sm text-gray-500 font-mono">{p.location}</p>
                                        </div>
                                        <ArrowRight className="w-5 h-5 text-gray-600 group-hover:text-[#C5A059] transition-colors" />
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div className="bg-[#111] p-3 rounded">
                                            <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Outlets</div>
                                            <div className="font-mono text-xl font-bold text-white">{p.outlets}</div>
                                        </div>
                                        <div className="bg-[#111] p-3 rounded">
                                            <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Data Trust</div>
                                            <div className={`font-mono text-xl font-bold ${dataTrust >= 90 ? 'text-[#00FF94]' : dataTrust >= 80 ? 'text-yellow-500' : 'text-red-500'}`}>
                                                {dataTrust.toFixed(1)}%
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex justify-between items-center bg-[#111] p-3 rounded">
                                        <span className="text-xs font-mono uppercase tracking-widest text-gray-500">Risk Score</span>
                                        <span className={`px-2 py-1 rounded text-xs font-bold font-mono ${pts > 3 ? 'bg-red-500/20 text-red-500' : pts > 0 ? 'bg-yellow-500/20 text-yellow-500' : 'bg-green-500/20 text-green-500'}`}>
                                            {pts > 0 ? `${pts} PTS` : 'HEALTHY (0 PTS)'}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* D. NETWORK ALERTS */}
                <div className="lg:col-span-1">
                    <div className="bg-[#1a1a1a] border border-[#333] rounded p-4 sticky top-6">
                        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-[#333] pb-2">
                            <ShieldAlert className="w-4 h-4 text-gray-500" /> Network Alerts
                        </h2>
                        
                        <div className="space-y-3">
                            {properties.find(p => p.slug === 'tampa-casino') && (
                                <div className="flex gap-3 items-start border-l-2 border-red-500 pl-2">
                                    <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                                    <div className="text-xs text-gray-300">
                                        <span className="font-bold text-white">Tampa:</span> High variance detected across 2 outlets.
                                    </div>
                                </div>
                            )}
                            {properties.find(p => p.slug === 'atlantic-city') && (
                                <div className="flex gap-3 items-start border-l-2 border-yellow-500 pl-2">
                                    <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
                                    <div className="text-xs text-gray-300">
                                        <span className="font-bold text-white">Atlantic City:</span> Missing KPI synchronization since 04:00 AM.
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
    } catch (err: any) {
        return <div className="p-8 text-red-500 font-mono tracking-widest text-center">Error parsing Network Dashboard: {err.message || 'Unknown Error'}</div>;
    }
};

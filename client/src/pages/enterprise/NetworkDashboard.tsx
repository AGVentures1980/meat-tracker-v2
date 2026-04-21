import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Globe, ArrowRight, ShieldAlert, AlertTriangle, TrendingUp, TrendingDown, Minus } from 'lucide-react';

export const NetworkDashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [network, setNetwork] = useState<any>(null);
    const [accuracies, setAccuracies] = useState<any>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchNet = async () => {
            try {
                const res = await fetch('/api/v1/enterprise/network-summary', {
                    headers: { 'Authorization': `Bearer ${user?.token}` }
                });
                
                if (res.ok) {
                    const data = await res.json();
                    setNetwork(data.summary);
                    
                    if (data.summary) {
                        const accMap: any = {};
                        for (const n of data.summary) {
                            const accRes = await fetch(`/api/v1/enterprise/property/${n.store_id}/forecast-accuracy-summary`, {
                                headers: { 'Authorization': `Bearer ${user?.token}` }
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
    if (!network) return null;

    const properties = [
        { id: 1202, slug: 'tampa-casino', name: 'Hard Rock Tampa', guests: 2450, lbs: 4500, target: 1.76 },
        { id: 1203, slug: 'hollywood-casino', name: 'Hard Rock Hollywood', guests: 3100, lbs: 5800, target: 1.76 },
        { id: 1204, slug: 'punta-cana', name: 'Hard Rock Punta Cana', guests: 1800, lbs: 2800, target: 1.60 },
        { id: 1205, slug: 'atlantic-city', name: 'Hard Rock Atlantic City', guests: 2200, lbs: 4100, target: 1.80 },
    ].filter(p => !network.length || network.some((n: any) => n.store_id === p.id));

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
                
                {/* B. PROPERTY COMPARISON TABLE */}
                <div className="lg:col-span-3 bg-[#1a1a1a] border border-[#333] rounded overflow-hidden">
                    <div className="p-4 border-b border-[#333]">
                        <h2 className="text-sm font-bold text-gray-300 tracking-widest uppercase">Property Comparison</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-[#111] text-xs uppercase font-mono tracking-widest text-gray-500">
                                <tr>
                                    <th className="px-4 py-3">Property Name</th>
                                    <th className="px-4 py-3 text-right">Covers Today</th>
                                    <th className="px-4 py-3 text-right">Lbs/Guest</th>
                                    <th className="px-4 py-3 text-right">Target</th>
                                    <th className="px-4 py-3 text-center">Fcst Acc</th>
                                    <th className="px-4 py-3 text-center">Trend (7d)</th>
                                    <th className="px-4 py-3 text-center">Risk Score</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#222]">
                                {properties.map(p => {
                                    const lg = p.lbs / p.guests;
                                    const dev = (lg - p.target) / p.target;
                                    const lgColor = dev > 0.15 ? 'text-red-500' : dev > 0.08 ? 'text-yellow-500' : 'text-green-500';
                                    const pts = dev > 0.15 ? 4 : dev > 0.08 ? 2 : 0;
                                    const TrendIcon = dev > 0 ? TrendingUp : dev < 0 ? TrendingDown : Minus;
                                    
                                    return (
                                        <tr key={p.id} onClick={() => navigate(`/dashboard/property/${p.slug}`)} className="hover:bg-[#222] cursor-pointer transition-colors group">
                                            <td className="px-4 py-4 font-bold text-gray-300 group-hover:text-[#C5A059] flex items-center gap-2">
                                                {p.name} <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </td>
                                            <td className="px-4 py-4 text-right font-mono text-gray-400">{p.guests}</td>
                                            <td className={`px-4 py-4 text-right font-bold ${lgColor}`}>{lg.toFixed(2)}</td>
                                            <td className="px-4 py-4 text-right text-gray-500">{p.target.toFixed(2)}</td>
                                            <td className={`px-4 py-4 text-center font-bold font-mono ${accuracies[p.id] >= 90 ? 'text-[#00FF94]' : accuracies[p.id] >= 80 ? 'text-yellow-500' : accuracies[p.id] !== undefined ? 'text-red-500' : 'text-gray-600'}`}>
                                                {accuracies[p.id] !== undefined ? `${accuracies[p.id].toFixed(1)}%` : '--%'}
                                            </td>
                                            <td className="px-4 py-4 text-center text-gray-400 flex justify-center"><TrendIcon className={`w-4 h-4 ${lgColor}`} /></td>
                                            <td className="px-4 py-4 text-center">
                                                <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${pts > 3 ? 'bg-red-500/20 text-red-500' : pts > 0 ? 'bg-yellow-500/20 text-yellow-500' : 'bg-green-500/20 text-green-500'}`}>
                                                    {pts} PTS
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
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
};

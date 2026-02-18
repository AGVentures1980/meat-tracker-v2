import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MEAT_UNIT_WEIGHTS } from '../config/meat_weights';
import { Trash2, Lock, CheckCircle, AlertTriangle, Scale, Save, FileText, ChevronDown, ChevronRight, Calendar, ArrowLeft, AlertCircle, Building2 } from 'lucide-react';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const WasteHistoryChart = ({ storeId }: { storeId?: number | null }) => {
    const { user } = useAuth();
    const [data, setData] = useState<any[]>([]);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                let url = '/api/v1/dashboard/waste/history?range=this-month';
                if (storeId) url += `&store_id=${storeId}`;
                const res = await fetch(url, { headers: { 'Authorization': `Bearer ${user?.token}` } });
                if (res.ok) {
                    const chartData = await res.json();
                    setData(chartData);
                }
            } catch (e) {
                console.error(e);
            }
        };
        fetchHistory();
    }, [storeId, user?.token]);

    if (data.length === 0) return <div className="h-40 flex items-center justify-center text-xs text-gray-600">No trend data available.</div>;

    return (
        <div className="h-48 w-full mt-4 mb-6">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                    <XAxis
                        dataKey="date"
                        stroke="#666"
                        fontSize={10}
                        tickFormatter={(val) => new Date(val).getDate().toString()}
                        tickMargin={10}
                    />
                    <YAxis stroke="#666" fontSize={10} />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#1a1a1a', borderColor: '#333', color: '#fff' }}
                        itemStyle={{ color: '#C5A059' }}
                        formatter={(value: number) => [`${value.toFixed(1)} lbs`, 'Waste']}
                        labelFormatter={(label) => new Date(label).toLocaleDateString()}
                    />
                    <Bar dataKey="pounds" radius={[2, 2, 0, 0]}>
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.pounds > 20 ? '#FF2A6D' : '#C5A059'} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

const WasteLogHistory = ({ storeId }: { storeId?: number | null }) => {
    const { user } = useAuth();
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedDate, setExpandedDate] = useState<string | null>(null);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                let url = '/api/v1/dashboard/waste/history/details?limit=50';
                if (storeId) url += `&store_id=${storeId}`;
                const res = await fetch(url, { headers: { 'Authorization': `Bearer ${user?.token}` } });
                if (res.ok) {
                    const data = await res.json();
                    setLogs(data);
                    // Open first date by default
                    if (data.length > 0) {
                        const firstDate = new Date(data[0].date).toISOString().split('T')[0];
                        setExpandedDate(firstDate);
                    }
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, [storeId, user?.token]);

    if (loading) return <div className="p-4 text-xs text-gray-500 animate-pulse">Loading Records...</div>;
    if (logs.length === 0) return <div className="p-4 text-xs text-gray-500">No waste logs found.</div>;

    // Group logs by Date
    const grouped: Record<string, any[]> = {};
    logs.forEach(log => {
        const dateStr = new Date(log.date).toISOString().split('T')[0];
        if (!grouped[dateStr]) grouped[dateStr] = [];
        grouped[dateStr].push(log);
    });

    const dates = Object.keys(grouped).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    return (
        <div className="mt-4 space-y-2">
            {dates.map(date => {
                const dayLogs = grouped[date];
                const totalWeight = dayLogs.reduce((sum: number, log: any) => {
                    return sum + (log.items as any[]).reduce((s: number, i: any) => s + (i.weight || 0), 0);
                }, 0);
                const isExpanded = expandedDate === date;

                return (
                    <div key={date} className="border border-[#333] rounded-sm bg-[#1a1a1a] overflow-hidden">
                        <button
                            onClick={() => setExpandedDate(isExpanded ? null : date)}
                            className="w-full flex items-center justify-between p-3 hover:bg-[#222] transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-brand-gold" />
                                    <span className="text-sm font-bold text-white font-mono">{new Date(date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="text-[10px] uppercase text-gray-500 tracking-wider">{dayLogs.length} Shifts Logged</span>
                                <span className={`font-mono font-bold text-sm ${totalWeight > 20 ? 'text-red-500' : 'text-[#C5A059]'}`}>
                                    {totalWeight.toFixed(1)} lbs
                                </span>
                            </div>
                        </button>

                        {isExpanded && (
                            <div className="border-t border-[#333] bg-black/20">
                                {dayLogs.map((log: any) => (
                                    <div key={log.id} className="p-3 border-b border-[#333] last:border-0 pl-10">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className={`text-[10px] px-2 py-0.5 rounded border ${log.shift === 'LUNCH' ? 'bg-blue-900/20 border-blue-500 text-blue-400' : 'bg-purple-900/20 border-purple-500 text-purple-400'}`}>
                                                {log.shift}
                                            </span>
                                            <span className="text-gray-600 text-[10px] uppercase tracking-widest">Logged by Manager</span>
                                        </div>
                                        <div className="space-y-1">
                                            {(log.items as any[]).map((item: any, idx: number) => (
                                                <div key={idx} className="flex justify-between text-xs items-center hover:bg-white/5 p-1 rounded">
                                                    <span className="text-gray-300">{item.protein}</span>
                                                    <div className="flex items-center gap-4">
                                                        <span className="text-gray-500 italic text-[10px]">{item.reason}</span>
                                                        <span className="font-mono text-[#C5A059]">{item.weight} lbs</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

const WastePage = () => {
    const { user } = useAuth();
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState<any>(null);
    const [networkStatus, setNetworkStatus] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [networkLoading, setNetworkLoading] = useState(false);
    const [selectedItems, setSelectedItems] = useState<any[]>([]);

    // Form State
    const [protein, setProtein] = useState('');
    const [weight, setWeight] = useState('');
    const [reason, setReason] = useState('Trimmed Fat');
    const [selectedStore, setSelectedStore] = useState<number | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const [stores, setStores] = useState<any[]>([]);

    const isExecutive = user?.role?.toLowerCase() === 'admin' ||
        user?.role?.toLowerCase() === 'director' ||
        user?.role?.toLowerCase() === 'owner' ||
        user?.email?.includes('admin') ||
        user?.email === 'dallas@texasdebrazil.com';

    useEffect(() => {
        const fetchStores = async () => {
            if (isExecutive) {
                try {
                    const res = await fetch('/api/v1/settings/stores', {
                        headers: { 'Authorization': `Bearer ${user?.token}` }
                    });
                    if (res.ok) {
                        const data = await res.json();
                        setStores(data);

                        // If not executive, we default to their store. 
                        // If executive, we don't auto-select if no param is present (show grid)
                    }
                } catch (e) {
                    console.error('Failed to load stores', e);
                }
            }
        };
        fetchStores();
    }, [user]);

    useEffect(() => {
        const storeIdParam = searchParams.get('storeId');
        if (storeIdParam) {
            setSelectedStore(parseInt(storeIdParam));
        } else if (user?.store_id) {
            if (!selectedStore && !isExecutive) {
                setSelectedStore(user.store_id);
            }
        }
    }, [searchParams, user]);

    const fetchStatus = async () => {
        try {
            let url = '/api/v1/dashboard/waste/status';
            if (selectedStore) url += `?store_id=${selectedStore}`;

            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${user?.token}` }
            });
            const data = await res.json();
            setStatus(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchNetworkStatus = async () => {
        setNetworkLoading(true);
        try {
            const res = await fetch('/api/v1/dashboard/waste/network-status', {
                headers: { 'Authorization': `Bearer ${user?.token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setNetworkStatus(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setNetworkLoading(false);
            setLoading(false);
        }
    };

    useEffect(() => {
        if (selectedStore) {
            setLoading(true);
            fetchStatus();
        } else if (isExecutive) {
            setLoading(true);
            fetchNetworkStatus();
        }
    }, [selectedStore]);

    const handleAddItem = () => {
        if (!protein || !weight) return;
        setSelectedItems([...selectedItems, { protein, weight: parseFloat(weight), reason }]);
        setProtein('');
        setWeight('');
    };

    const handleRemoveItem = (index: number) => {
        const newItems = [...selectedItems];
        newItems.splice(index, 1);
        setSelectedItems(newItems);
    };

    const handleSubmit = async () => {
        if (!status) return;

        // Determine Shift automatically based on what's open? 
        // Or ask user? The requirement says "input data for LUNCH... cannot put waste for DINNER".
        // This implies the user Selects the shift they are inputting for.
        // But if they are blocked, they can't select.

        let shiftToSubmit = '';
        if (status.today.can_input_lunch) shiftToSubmit = 'LUNCH';
        else if (status.today.can_input_dinner) shiftToSubmit = 'DINNER';

        // If both are open (start of day), user needs to choose.
        // For simplicity in MVP, let's force sequential? No, shifted schedules exist.
        // Let's prompt for shift if both are open.

        if (!shiftToSubmit) {
            // If both blocked
            return;
        }

        setSubmitting(true);
        setError('');

        try {
            const res = await fetch('/api/v1/dashboard/waste/log', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user?.token}`
                },
                body: JSON.stringify({
                    shift: shiftToSubmit,
                    items: selectedItems,
                    store_id: selectedStore || user?.store_id || 1,
                    date: new Date().toISOString().split('T')[0]
                })
            });

            if (res.ok) {
                // Refresh status
                await fetchStatus();
                setSelectedItems([]);
            } else {
                const errData = await res.json();
                setError(errData.error || 'Failed to submit waste log');
            }
        } catch (err) {
            setError('Network error');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="p-8 text-[#C5A059] font-mono animate-pulse">Checking Compliance Protocols...</div>;

    // --- RENDER EXECUTIVE NETWORK GRID ---
    if (isExecutive && !selectedStore) {
        return (
            <div className="max-w-6xl mx-auto p-6 space-y-8">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                            <Trash2 className="w-8 h-8 text-[#FF2A6D]" />
                            Network Waste Status
                        </h1>
                        <p className="text-gray-500 text-sm mt-1 font-mono uppercase tracking-wider">Executive Compliance Overview</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="bg-[#1a1a1a] px-4 py-2 rounded border border-[#333] text-sm">
                            <span className="text-gray-500 pr-2 uppercase text-[10px] tracking-widest">Submitted:</span>
                            <span className="text-white font-bold">{networkStatus?.submitted_count} / {networkStatus?.total_stores}</span>
                        </div>
                        {networkStatus?.company_avg_percent !== undefined && (
                            <div className={`px-4 py-2 rounded border text-sm font-bold flex items-center gap-2 ${networkStatus.company_avg_percent > 5
                                ? 'bg-red-500/10 border-red-500/30 text-red-500'
                                : networkStatus.company_avg_percent > 1
                                    ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500'
                                    : 'bg-[#00FF94]/10 border-[#00FF94]/30 text-[#00FF94]'
                                }`}>
                                <Building2 className="w-4 h-4" />
                                COMPANY AVG: {networkStatus.company_avg_percent}%
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {networkStatus?.stores.map((store: any) => (
                        <button
                            key={store.id}
                            onClick={() => setSelectedStore(store.id)}
                            className={`p-4 rounded-lg border text-left transition-all group relative overflow-hidden bg-[#121212] hover:bg-[#1a1a1a] ${store.status === 'RED' ? 'border-red-500/30' :
                                store.status === 'YELLOW' ? 'border-yellow-500/30' :
                                    store.status === 'GREEN' ? 'border-[#00FF94]/30' : 'border-[#333]'
                                }`}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="font-bold text-lg text-white group-hover:text-brand-gold transition-colors">{store.name}</h3>
                                    <p className="text-xs text-gray-500 uppercase">{store.location}</p>
                                </div>
                                {store.status === 'MISSING' ? (
                                    <AlertCircle className="w-5 h-5 text-gray-700" />
                                ) : (
                                    <CheckCircle className="w-5 h-5 text-[#00FF94]" />
                                )}
                            </div>

                            {store.status === 'MISSING' ? (
                                <div className="py-2">
                                    <span className="text-[10px] bg-gray-900 text-gray-500 px-2 py-1 rounded font-mono uppercase tracking-widest">MISSING REPORT</span>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <span className="text-[10px] text-gray-500 uppercase block leading-none mb-1">Waste Weight</span>
                                            <span className="text-lg font-black text-white">{store.waste_lbs} <span className="text-[10px] font-normal text-gray-500">lbs</span></span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[10px] text-gray-500 uppercase block leading-none mb-1">Impact</span>
                                            <span className={`text-lg font-black ${store.status === 'RED' ? 'text-red-500' :
                                                store.status === 'YELLOW' ? 'text-yellow-500' : 'text-[#00FF94]'
                                                }`}>{store.waste_percent}%</span>
                                        </div>
                                    </div>
                                    <div className="w-full h-1 bg-[#222] rounded-full overflow-hidden">
                                        <div
                                            className={`h-full ${store.status === 'RED' ? 'bg-red-500' :
                                                store.status === 'YELLOW' ? 'bg-yellow-500' : 'bg-[#00FF94]'
                                                }`}
                                            style={{ width: `${Math.min(store.waste_percent * 5, 100)}%` }}
                                        ></div>
                                    </div>
                                </div>
                            )}

                            {/* Decorative Status Accent */}
                            <div className={`absolute bottom-0 left-0 w-full h-[3px] ${store.status === 'RED' ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' :
                                store.status === 'YELLOW' ? 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.3)]' :
                                    store.status === 'GREEN' ? 'bg-[#00FF94] shadow-[0_0_10px_rgba(0,255,148,0.3)]' : 'bg-transparent'
                                }`}></div>
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    if (!status) return <div className="p-8 text-red-500">Failed to load status.</div>;

    // Determine UI State based on Status
    const isLocked = status?.compliance?.is_locked;
    const isBlockedToday = !status?.today?.can_input_lunch && !status?.today?.can_input_dinner;
    const activeShift = status?.today?.can_input_lunch ? 'LUNCH' : (status?.today?.can_input_dinner ? 'DINNER' : 'NONE');

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-8">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    {isExecutive && selectedStore && (
                        <button
                            onClick={() => setSelectedStore(null)}
                            className="p-2 bg-[#1a1a1a] hover:bg-[#333] rounded border border-[#444] text-white transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                    )}
                    <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                        <Trash2 className="w-8 h-8 text-[#FF2A6D]" />
                        {selectedStore ? (stores.find(s => s.id === selectedStore)?.name || 'Store Report') : 'Process Waste'}
                    </h1>
                </div>

                {/* Admin Store Selector */}
                {isExecutive && (
                    <div className="flex items-center gap-2 bg-[#1a1a1a] p-1 rounded border border-[#333]">
                        <select
                            className="bg-[#121212] text-white text-sm p-1 rounded border border-[#333] outline-none focus:border-[#C5A059]"
                            value={selectedStore || ''}
                            onChange={(e) => setSelectedStore(e.target.value ? parseInt(e.target.value) : null)}
                        >
                            <option value="">Select Store...</option>
                            {stores.map(s => <option key={s.id} value={s.id}>{s.name || s.store_name}</option>)}
                        </select>
                    </div>
                )}

                <div className="flex items-center gap-4 text-sm font-mono">
                    <div className="flex flex-col items-end">
                        <span className="text-gray-500">WEEKLY COMPLIANCE</span>
                        <div className="flex gap-2 mt-1">
                            <div className={`px-2 py-1 rounded border ${status.compliance.lunch_count >= 3 ? 'bg-green-500/20 border-green-500 text-green-500' : 'bg-gray-800 border-gray-700 text-gray-400'}`}>
                                LUNCH: {status.compliance.lunch_count}/3
                            </div>
                            <div className={`px-2 py-1 rounded border ${status.compliance.dinner_count >= 3 ? 'bg-green-500/20 border-green-500 text-green-500' : 'bg-gray-800 border-gray-700 text-gray-400'}`}>
                                DINNER: {status.compliance.dinner_count}/3
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {status.error ? (
                <div className="bg-red-900/20 border border-red-500 text-red-500 p-6 rounded flex flex-col gap-2">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <AlertTriangle className="w-6 h-6" />
                        Infrastructure Error
                    </h2>
                    <p className="text-sm opacity-80">{status.details || status.error}</p>
                </div>
            ) : (
                <>
                    {status?.analysis && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            {/* Main Gauge Card */}
                            <div className={`col-span-1 md:col-span-2 p-6 rounded-lg border flex flex-col justify-center relative overflow-hidden ${status.analysis.is_critical ? 'bg-red-950/40 border-red-500/50' : 'bg-[#1a1a1a] border-[#333]'}`}>

                                {/* Status Indicator Bar */}
                                <div className={`absolute left-0 top-0 bottom-0 w-2 ${status.analysis.is_critical ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></div>

                                <div className="flex justify-between items-center mb-6 pl-4">
                                    <div>
                                        <h2 className="text-gray-400 text-sm uppercase tracking-widest mb-1">Total Store Waste</h2>
                                        <div className="flex items-baseline gap-2">
                                            <span className={`text-5xl font-black ${status.analysis.is_critical ? 'text-red-500' : 'text-white'}`}>
                                                {status.analysis.global_percent}%
                                            </span>
                                            <span className="text-sm text-gray-500 font-mono">
                                                of Usage ({status.analysis.total_waste_lbs} lbs)
                                            </span>
                                        </div>
                                    </div>
                                    {/* Visual Meter */}
                                    <div className="hidden sm:block text-right">
                                        {status.analysis.is_critical ? (
                                            <div className="flex items-center gap-2 text-red-500">
                                                <AlertTriangle className="w-10 h-10" />
                                                <span className="text-xl font-bold uppercase">Critical</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 text-green-500">
                                                <CheckCircle className="w-10 h-10" />
                                                <span className="text-xl font-bold uppercase">Good</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Waste History List */}
                                <div className="pl-4 border-t border-[#333] pt-4 mt-6">
                                    <h3 className="text-xs text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                                        <FileText className="w-3 h-3" />
                                        30-Day Trend & History
                                    </h3>
                                    <WasteHistoryChart storeId={selectedStore} />
                                    <WasteLogHistory storeId={selectedStore} />
                                </div>
                            </div>

                            {/* Breakdown by Reason */}
                            <div className="bg-[#1a1a1a] border border-[#333] rounded-lg p-4 flex flex-col justify-center">
                                <h3 className="text-xs text-gray-500 uppercase tracking-widest mb-3 border-b border-[#333] pb-2">Top Waste Reasons</h3>
                                <div className="space-y-2">
                                    {status.analysis.breakdown.slice(0, 3).map((item: any, idx: number) => (
                                        <div key={idx} className="flex justify-between items-center text-sm">
                                            <span className="text-gray-300 truncate pr-2" title={item.reason}>{item.reason}</span>
                                            <div className="flex items-center gap-2">
                                                <div className="w-16 h-1.5 bg-[#333] rounded-full overflow-hidden">
                                                    <div className="h-full bg-[#C5A059]" style={{ width: `${item.percent}%` }}></div>
                                                </div>
                                                <span className="text-[#C5A059] font-mono min-w-[3ch] text-right">{Math.round(item.percent)}%</span>
                                            </div>
                                        </div>
                                    ))}
                                    {status.analysis.breakdown.length === 0 && (
                                        <span className="text-gray-600 italic text-xs">No data yet</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Traffic Light Status */}
                    <div className={`p-6 rounded-lg border-l-4 ${isLocked ? 'bg-red-900/20 border-red-600' : (isBlockedToday ? 'bg-yellow-900/20 border-yellow-500' : 'bg-green-900/20 border-green-500')}`}>
                        <div className="flex items-start gap-4">
                            {isLocked ? <Lock className="w-8 h-8 text-red-500" /> : (isBlockedToday ? <CheckCircle className="w-8 h-8 text-yellow-500" /> : <Scale className="w-8 h-8 text-green-500" />)}
                            <div>
                                <h2 className={`text-xl font-bold ${isLocked ? 'text-red-500' : (isBlockedToday ? 'text-yellow-500' : 'text-green-500')}`}>
                                    {isLocked ? 'SYSTEM LOCKED' : (isBlockedToday ? 'DAILY LIMIT REACHED' : 'OPEN FOR ENTRY')}
                                </h2>
                                <p className="text-gray-400 mt-1 max-w-2xl">
                                    {status.today.message}
                                </p>
                            </div>
                            {activeShift !== 'NONE' && !isBlockedToday && (
                                <div className="ml-auto bg-[#1a1a1a] px-4 py-2 rounded border border-[#333] text-center">
                                    <div className="text-[10px] text-gray-500 uppercase tracking-widest">Current Shift</div>
                                    <div className="text-xl font-bold text-[#C5A059]">{activeShift}</div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Input Form */}
                    {!isLocked && !isBlockedToday && (user?.role !== 'director' && user?.role !== 'admin' && !user?.email?.includes('director') && !user?.email?.includes('admin')) && (
                        <div className="bg-[#1a1a1a] rounded-lg border border-[#333] overflow-hidden">
                            <div className="p-4 border-b border-[#333] bg-[#222]">
                                <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Log Waste Items</h3>
                            </div>

                            <div className="p-6 space-y-6">
                                {/* Control Row */}
                                <div className="grid grid-cols-12 gap-4 items-end">
                                    <div className="col-span-4">
                                        <label className="block text-xs text-gray-500 mb-1 uppercase">Protein</label>
                                        <select
                                            className="w-full bg-[#111] border border-[#333] text-white rounded p-2 focus:border-[#C5A059] outline-none"
                                            value={protein}
                                            onChange={(e) => setProtein(e.target.value)}
                                        >
                                            <option value="">Select Protein...</option>
                                            {Object.keys(MEAT_UNIT_WEIGHTS).map(k => (
                                                <option key={k} value={k}>{k}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="col-span-3">
                                        <label className="block text-xs text-gray-500 mb-1 uppercase">Weight (Lbs)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            className="w-full bg-[#111] border border-[#333] text-white rounded p-2 focus:border-[#C5A059] outline-none"
                                            placeholder="0.0"
                                            value={weight}
                                            onChange={(e) => setWeight(e.target.value)}
                                        />
                                    </div>
                                    <div className="col-span-3">
                                        <label className="block text-xs text-gray-500 mb-1 uppercase">Reason</label>
                                        <select
                                            className="w-full bg-[#111] border border-[#333] text-white rounded p-2 focus:border-[#C5A059] outline-none"
                                            value={reason}
                                            onChange={(e) => setReason(e.target.value)}
                                        >
                                            <option value="Prep Scraps (Raw)">Prep Scraps (Raw)</option>
                                            <option value="Grill Error (Burnt)">Grill Error (Burnt)</option>
                                            <option value="Customer Return (Temp)">Customer Return (Temp)</option>
                                            <option value="Expired / Spoiled">Expired / Spoiled</option>
                                            <option value="Dropped / Contaminated">Dropped / Contaminated</option>
                                        </select>
                                    </div>
                                    <div className="col-span-2">
                                        <button
                                            onClick={handleAddItem}
                                            disabled={!protein || !weight}
                                            className="w-full bg-[#333] hover:bg-[#444] text-white py-2 rounded transition-colors disabled:opacity-50"
                                        >
                                            Add
                                        </button>
                                    </div>
                                </div>

                                {/* Staged Items List */}
                                {selectedItems.length > 0 && (
                                    <div className="border border-[#333] rounded overflow-hidden">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-[#222] text-gray-500">
                                                <tr>
                                                    <th className="px-4 py-2">Protein</th>
                                                    <th className="px-4 py-2">Weight</th>
                                                    <th className="px-4 py-2">Reason</th>
                                                    <th className="px-4 py-2 text-right">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[#333]">
                                                {selectedItems.map((item, idx) => {
                                                    // Mock Check for "Saltar aos llhos" (Visual Impact) - > 5% Alert
                                                    // In reality, compare item.weight vs Projected Usage 
                                                    // For prototype, let's flag anything > 5lbs as "High Waste" visually immediately
                                                    const isHighWaste = item.weight > 5;
                                                    return (
                                                        <tr key={idx} className={`bg-[#111] ${isHighWaste ? 'bg-red-900/10' : ''}`}>
                                                            <td className="px-4 py-2 text-white flex items-center gap-2">
                                                                {item.protein}
                                                                {isHighWaste && <AlertTriangle className="w-4 h-4 text-red-500 animate-pulse" />}
                                                            </td>
                                                            <td className={`px-4 py-2 font-mono ${isHighWaste ? 'text-red-500 font-bold' : 'text-[#C5A059]'}`}>{item.weight} lbs</td>
                                                            <td className="px-4 py-2 text-gray-400">{item.reason}</td>
                                                            <td className="px-4 py-2 text-right">
                                                                <button onClick={() => handleRemoveItem(idx)} className="text-red-500 hover:text-red-400">Remove</button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {error && (
                                    <div className="bg-red-900/20 border border-red-500 text-red-500 p-3 rounded flex items-center gap-2">
                                        <AlertTriangle className="w-5 h-5" />
                                        {error}
                                    </div>
                                )}

                                <div className="flex justify-end pt-4 border-t border-[#333]">
                                    <button
                                        onClick={handleSubmit}
                                        disabled={selectedItems.length === 0 || submitting}
                                        className="bg-[#C5A059] hover:bg-[#b08d4a] text-black font-bold py-2 px-6 rounded flex items-center gap-2 disabled:opacity-50"
                                    >
                                        {submitting ? 'Submitting...' : (
                                            <>
                                                <Save className="w-4 h-4" />
                                                Submit Log
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default WastePage;

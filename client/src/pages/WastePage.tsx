import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MEAT_UNIT_WEIGHTS } from '../config/meat_weights';
import { Trash2, Lock, CheckCircle, AlertTriangle, Scale, Save } from 'lucide-react';

const WastePage = () => {
    const { user } = useAuth();
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [selectedItems, setSelectedItems] = useState<any[]>([]);

    // Form State
    const [protein, setProtein] = useState('');
    const [weight, setWeight] = useState('');
    const [reason, setReason] = useState('Trimmed Fat');
    const [selectedStore, setSelectedStore] = useState<number | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const stores = [
        { id: 1, name: 'Dallas' },
        { id: 2, name: 'Austin' },
        { id: 3, name: 'New York' },
        { id: 4, name: 'Miami' },
        { id: 5, name: 'Las Vegas' }
    ];

    useEffect(() => {
        const storeIdParam = searchParams.get('storeId');
        if (storeIdParam) {
            setSelectedStore(parseInt(storeIdParam));
        }
    }, [searchParams]);

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

    useEffect(() => {
        setLoading(true);
        fetchStatus();
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

    // Determine UI State based on Status
    const isLocked = status?.compliance?.is_locked;
    const isBlockedToday = !status?.today?.can_input_lunch && !status?.today?.can_input_dinner;

    // Auto-select shift for display if only one option
    const activeShift = status?.today?.can_input_lunch ? 'LUNCH' : (status?.today?.can_input_dinner ? 'DINNER' : 'NONE');

    if (!status || status.error) {
        return (
            <div className="max-w-4xl mx-auto p-6 space-y-8">
                <div className="bg-red-900/20 border border-red-500 text-red-500 p-6 rounded flex flex-col gap-2">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <AlertTriangle className="w-6 h-6" />
                        Infrastructure Error
                    </h2>
                    <p className="text-sm opacity-80">{status?.error || 'Failed to connect to the Waste Compliance API. Please refresh or contact support.'}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-8">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                    <Trash2 className="w-8 h-8 text-[#FF2A6D]" />
                    Process Waste
                </h1>

                {/* Admin Store Selector */}
                {(user?.role === 'admin' || user?.role === 'director' || user?.email?.includes('admin')) && (
                    <div className="flex items-center gap-2 bg-[#1a1a1a] p-1 rounded border border-[#333]">
                        <select
                            className="bg-[#121212] text-white text-sm p-1 rounded border border-[#333] outline-none focus:border-[#C5A059]"
                            value={selectedStore || ''}
                            onChange={(e) => setSelectedStore(e.target.value ? parseInt(e.target.value) : null)}
                        >
                            <option value="">My Store (Default)</option>
                            {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
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

            {/* Global Waste Dashboard (The "Fair" View) */}
            {status?.analysis && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {/* Main Gauge Card */}
                    <div className={`col-span-1 md:col-span-2 p-6 rounded-lg border flex items-center justify-between relative overflow-hidden ${status.analysis.is_critical ? 'bg-red-950/40 border-red-500/50' : 'bg-[#1a1a1a] border-[#333]'}`}>

                        {/* Status Indicator Bar */}
                        <div className={`absolute left-0 top-0 bottom-0 w-2 ${status.analysis.is_critical ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></div>

                        <div className="pl-4">
                            <h2 className="text-gray-400 text-sm uppercase tracking-widest mb-1">Total Store Waste</h2>
                            <div className="flex items-baseline gap-2">
                                <span className={`text-5xl font-black ${status.analysis.is_critical ? 'text-red-500' : 'text-white'}`}>
                                    {status.analysis.global_percent}%
                                </span>
                                <span className="text-sm text-gray-500 font-mono">
                                    of Usage ({status.analysis.total_waste_lbs} lbs)
                                </span>
                            </div>
                            <div className="mt-2 text-xs text-gray-400">
                                Target: <span className="text-[#C5A059]">{status.analysis.store_target} lbs/guest</span>
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
            {!isLocked && !isBlockedToday && (user?.role !== 'director' && !user?.email?.includes('director')) && (
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
                                    <option>Sobras de Preparação (Crú)</option>
                                    <option>Erro de Grelha (Queimado)</option>
                                    <option>Retorno de Cliente (Temperatura)</option>
                                    <option>Validade / Deterioração</option>
                                    <option>Queda / Contaminação</option>
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
        </div>
    );
};

export default WastePage;

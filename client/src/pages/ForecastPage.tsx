import React, { useState, useEffect } from 'react';
import { Brain, Lock, Save, AlertTriangle, Calendar, Truck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export const ForecastPage = () => {
    const { user } = useAuth();
    // const { t } = useLanguage(); // Deprecated for v4.1 English Unification

    // State
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [lunchGuests, setLunchGuests] = useState<number>(0);
    const [dinnerGuests, setDinnerGuests] = useState<number>(0);
    const [isLocked, setIsLocked] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [refreshKey, setRefreshKey] = useState(0); // Dedicated trigger for table updates

    // Initialize with Next Week's Monday
    useEffect(() => {
        const nextMonday = new Date();
        nextMonday.setDate(nextMonday.getDate() + ((1 + 7 - nextMonday.getDay()) % 7 || 7));
        setSelectedDate(nextMonday.toISOString().split('T')[0]);
    }, []);

    // Fetch Forecast when date changes
    useEffect(() => {
        if (!selectedDate || !user) return;

        const fetchForecast = async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/v1/forecast/next-week?date=${selectedDate}`, {
                    headers: { 'Authorization': `Bearer ${user.token}` }
                });
                const data = await res.json();

                if (data.success && data.forecast) {
                    setLunchGuests(data.forecast.forecast_lunch);
                    setDinnerGuests(data.forecast.forecast_dinner);
                    setIsLocked(data.forecast.is_locked);
                    setRefreshKey(prev => prev + 1); // Trigger table load if forecast exists
                } else {
                    // Reset if no forecast found
                    setLunchGuests(0);
                    setDinnerGuests(0);
                    setIsLocked(false);
                }
            } catch (err) {
                console.error("Failed to fetch forecast", err);
            } finally {
                setLoading(false);
            }
        };

        fetchForecast();
    }, [selectedDate, user]);

    const handleSave = async () => {
        setMessage(null);
        setLoading(true);
        try {
            const res = await fetch('/api/v1/forecast/upsert', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user?.token}`
                },
                body: JSON.stringify({
                    week_start: selectedDate,
                    lunch_guests: lunchGuests,
                    dinner_guests: dinnerGuests
                })
            });

            const data = await res.json();

            if (data.success) {
                setMessage({ type: 'success', text: 'Forecast saved successfully!' });
                if (data.forecast.is_locked) setIsLocked(true);
                setRefreshKey(prev => prev + 1); // FORCE REFRESH of Smart Order Table
            } else {
                setMessage({ type: 'error', text: data.error || 'Error saving forecast' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Connection failed.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto animate-in fade-in duration-500">
            {/* Non-Printable UI (Header + Inputs) */}
            <div className="print:hidden">
                {/* Header */}
                <div className="flex items-center gap-3 mb-8">
                    <Brain className="w-8 h-8 text-[#C5A059]" />
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                            Smart Forecasting <span className="text-[10px] bg-[#333] text-gray-400 px-2 py-1 rounded-full">v4.1.12</span>
                        </h1>
                        <p className="text-gray-500 text-sm font-mono uppercase tracking-wider">
                            Demand Planning & Purchasing
                        </p>
                    </div>
                </div>

                {/* Main Card */}
                <div className="bg-[#1a1a1a] border border-[#333] rounded-sm p-6 shadow-2xl relative overflow-hidden">
                    {isLocked && (
                        <div className="absolute top-0 right-0 bg-[#FF2A6D] text-white text-[10px] font-bold px-3 py-1 flex items-center gap-1">
                            <Lock size={10} /> LOCKED
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Left: Input Selection */}
                        <div>
                            <label className="block text-gray-500 text-xs font-bold uppercase tracking-widest mb-2">
                                Reference Week (Monday)
                            </label>
                            <div className="relative mb-6">
                                <Calendar className="absolute left-3 top-3 text-[#C5A059] w-4 h-4" />
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className="w-full bg-[#121212] border border-[#333] text-white p-2 pl-10 rounded-sm focus:border-[#C5A059] focus:outline-none font-mono"
                                />
                            </div>

                            <div className="p-4 bg-[#252525] border border-[#333] rounded-sm mb-4">
                                <h3 className="text-gray-400 text-xs uppercase font-bold mb-2 flex items-center gap-2">
                                    <AlertTriangle size={12} className="text-[#C5A059]" /> Locking Rule
                                </h3>
                                <p className="text-[10px] text-gray-500 leading-relaxed">
                                    Forecast must be submitted by <strong>Wednesday</strong> of the previous week.
                                    After this deadline, only the Director can unlock it.
                                    This ensures the Purchasing System (Smart Order) has enough lead time for Thu/Fri orders.
                                </p>
                            </div>
                        </div>

                        {/* Right: Guest Inputs */}
                        <div className="space-y-6">
                            <div>
                                <label className="block text-gray-400 text-xs uppercase tracking-widest mb-1">
                                    Lunch Forecast
                                </label>
                                <input
                                    type="number"
                                    value={lunchGuests === 0 ? '' : lunchGuests}
                                    onChange={(e) => setLunchGuests(e.target.value === '' ? 0 : parseInt(e.target.value))}
                                    disabled={isLocked}
                                    className={`w-full bg-[#121212] border border-[#333] text-white text-xl font-bold p-3 rounded-sm focus:border-[#00FF94] focus:outline-none transition-colors ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    placeholder="0"
                                />
                            </div>

                            <div>
                                <label className="block text-gray-400 text-xs uppercase tracking-widest mb-1">
                                    Dinner Forecast
                                </label>
                                <input
                                    type="number"
                                    value={dinnerGuests === 0 ? '' : dinnerGuests}
                                    onChange={(e) => setDinnerGuests(e.target.value === '' ? 0 : parseInt(e.target.value))}
                                    disabled={isLocked}
                                    className={`w-full bg-[#121212] border border-[#333] text-white text-xl font-bold p-3 rounded-sm focus:border-[#00FF94] focus:outline-none transition-colors ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    placeholder="0"
                                />
                            </div>

                            <div className="pt-4 border-t border-[#333] flex justify-between items-center">
                                <div>
                                    <p className="text-gray-500 text-[10px] uppercase">Total Guests</p>
                                    <p className="text-2xl font-bold text-white">{lunchGuests + dinnerGuests}</p>
                                </div>

                                {!isLocked && (
                                    <button
                                        onClick={handleSave}
                                        disabled={loading}
                                        className="bg-[#00FF94] hover:bg-[#00CC76] text-black font-bold uppercase text-xs px-6 py-3 rounded-sm flex items-center gap-2 transition-all active:scale-95"
                                    >
                                        {loading ? 'Saving...' : <><Save size={16} /> Confirm Forecast</>}
                                    </button>
                                )}
                                {isLocked && (
                                    <button disabled className="bg-[#333] text-gray-500 font-bold uppercase text-xs px-6 py-3 rounded-sm flex items-center gap-2 cursor-not-allowed">
                                        <Lock size={16} /> Locked
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {message && (
                        <div className={`mt-4 p-3 text-xs font-bold uppercase tracking-wide border ${message.type === 'success' ? 'bg-[#00FF94]/10 text-[#00FF94] border-[#00FF94]/30' : 'bg-[#FF2A6D]/10 text-[#FF2A6D] border-[#FF2A6D]/30'}`}>
                            {message.text}
                        </div>
                    )}
                </div>
            </div>

            {/* Smart Order Suggestions (Lazy Loaded after Save or Load) */}
            <SmartOrderTable date={selectedDate} refreshTrigger={refreshKey} />
        </div>
    );
};

// Sub-component for Smart Order Table
const SmartOrderTable = ({ date, refreshTrigger }: { date: string, refreshTrigger: number }) => {
    // ... existing hooks ...
    const { user } = useAuth();
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [meta, setMeta] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [missingTargets, setMissingTargets] = useState(false);

    // ... existing handleInitialize and useEffect ...
    const handleInitialize = async () => {
        if (!confirm('This will reset/initialize the meat targets. Continue?')) return;
        setLoading(true);
        try {
            await fetch('/api/v1/setup/seed-targets');
            alert('System Initialized! Refreshing...');
            window.location.reload();
        } catch (e) {
            alert('Failed to initialize');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!date || !user) return;
        const fetchSuggestions = async () => {
            setLoading(true);
            setError(null);
            setMissingTargets(false);
            try {
                const res = await fetch(`/api/v1/intelligence/supply-suggestions?date=${date}`, {
                    headers: { 'Authorization': `Bearer ${user.token}` }
                });
                const data = await res.json();
                if (data.success) {
                    setSuggestions(data.suggestions);
                    setMeta({ accumulated_weight: data.accumulated_weight, day: data.day_index });
                    if (data.missing_targets) setMissingTargets(true); // Flag from backend
                } else {
                    setError('No suggestions returned.');
                }
            } catch (err) {
                console.error(err);
                setError('Failed to load suggestions.');
            } finally {
                setLoading(false);
            }
        };
        fetchSuggestions();
    }, [date, refreshTrigger, user]);


    const handlePrint = () => {
        window.print();
    };

    if (loading && !suggestions.length) {
        return (
            <div className="mt-8 bg-[#1a1a1a] border border-[#333] rounded-sm p-12 text-center animate-pulse print:hidden">
                <Truck className="w-12 h-12 text-[#C5A059] mx-auto mb-3 opacity-50" />
                <h3 className="text-[#C5A059] font-bold uppercase tracking-widest text-sm">Calculating Logistics...</h3>
            </div>
        );
    }

    if (!suggestions.length) {
        return (
            <div className="mt-8 bg-[#1a1a1a] border border-[#333] rounded-sm p-6 text-center animate-in fade-in print:hidden">
                <Truck className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <h3 className="text-gray-400 font-bold uppercase tracking-widest text-sm">Waiting for Forecast</h3>
                <p className="text-gray-500 text-xs mt-1">Fill and save the forecast above to generate the shopping list.</p>

                {/* Emergency Sync Button for Empty State */}
                <div className="mt-4">
                    <button
                        onClick={handleInitialize}
                        className="bg-[#333] hover:bg-white hover:text-black text-gray-500 text-[10px] font-bold uppercase px-3 py-2 rounded inline-flex items-center gap-2 transition-colors border border-gray-700"
                    >
                        ⚠ Force Sync Data
                    </button>
                    <p className="text-[10px] text-gray-600 mt-1">Click if data appears missing in other stores.</p>
                </div>

                {error && (
                    <div className="mt-4 p-2 bg-[#FF2A6D]/10 border border-[#FF2A6D]/30 rounded text-[#FF2A6D] text-[10px] font-mono inline-block">
                        DEBUG: {error}
                    </div>
                )}
                {missingTargets && (
                    <div className="mt-6">
                        <button
                            onClick={handleInitialize}
                            className="bg-[#C5A059] text-black font-bold uppercase text-xs px-6 py-3 rounded-sm hover:bg-white transition-colors"
                        >
                            ⚠ Initialize System (Seed Data)
                        </button>
                        <p className="text-[10px] text-gray-500 mt-2">Database appears empty. Click to load defaults.</p>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="mt-8 bg-[#1a1a1a] border border-[#333] rounded-sm p-6 shadow-2xl animate-in slide-in-from-bottom-4 fade-in duration-700 print:shadow-none print:border-none print:p-8 print:bg-white print:absolute print:top-0 print:left-0 print:w-full print:text-black print:z-50 min-h-screen">
            <div className="flex items-center justify-between mb-6 print:hidden">
                <div>
                    <div className="flex items-center gap-4 mb-1">
                        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                            <Truck className="text-[#00FF94]" /> Smart Order Sheet
                        </h2>
                        <button
                            onClick={handleInitialize}
                            className="bg-[#333] hover:bg-white hover:text-black text-gray-500 text-[10px] font-bold uppercase px-2 py-1 rounded flex items-center gap-1 transition-colors border border-gray-700"
                            title="Fix Missing Data impacting other stores"
                        >
                            ⚠ Force Sync
                        </button>
                    </div>
                    <p className="text-gray-500 text-[10px] font-mono uppercase tracking-wider">
                        Dynamic Suggestion (v4.0) • {meta ? `Est. Consumption: ${(meta.accumulated_weight * 100).toFixed(0)}% of week` : ''}
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    {loading && <div className="text-[#C5A059] text-xs font-mono animate-pulse">CALCULATING...</div>}
                    <button
                        onClick={handlePrint}
                        className="bg-[#333] hover:bg-[#444] text-white text-xs font-bold uppercase px-4 py-2 rounded flex items-center gap-2 transition-colors"
                    >
                        <Calendar size={14} /> Print List
                    </button>
                </div>
            </div>

            {/* Print Header */}
            <div className="hidden print:block mb-8">
                <h1 className="text-2xl font-bold text-black border-b-2 border-black pb-2">Smart Order Sheet</h1>
                <p className="text-sm mt-2">Week of: <strong>{date}</strong> | <span className="text-xs">Dynamic Inventory Active</span> | <span className="text-xs font-bold">ALL UNITS IN LBS</span></p>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse print:text-black">
                    <thead>
                        <tr className="border-b border-[#333] print:border-black text-gray-500 print:text-black text-[10px] uppercase tracking-widest">
                            <th className="p-3">Protein</th>
                            <th className="p-3 text-right text-gray-500">Last Ct (Lbs)</th>
                            <th className="p-3 text-right text-[#00FF94]">+ Recv (Lbs)</th>
                            <th className="p-3 text-right text-[#FF2A6D]">- Est. Usage (Lbs)</th>
                            <th className="p-3 text-right font-bold text-white border-r border-[#333] print:text-black print:border-black">Est. On Hand (Lbs)</th>

                            <th className="p-3 text-right text-[#C5A059] bg-[#C5A059]/5 print:bg-transparent">Mon (Lbs)</th>
                            <th className="p-3 text-right text-[#00FF94] bg-[#00FF94]/5 print:bg-transparent font-bold">Wed (Lbs)</th>
                            <th className="p-3 text-right text-[#C5A059] bg-[#C5A059]/5 print:bg-transparent">Sat (Lbs)</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm font-mono text-gray-300 print:text-black">
                        {suggestions.map((item, idx) => (
                            <tr key={idx} className="border-b border-[#333]/50 print:border-gray-300 hover:bg-[#252525] print:hover:bg-transparent transition-colors">
                                <td className="p-3 font-bold text-white print:text-black">{item.protein}</td>

                                {/* Dynamic Inventory Columns */}
                                <td className="p-3 text-right text-gray-500 text-xs">{item.lastCount?.toFixed(0)}</td>
                                <td className="p-3 text-right text-[#00FF94] text-xs">+{item.received?.toFixed(0)}</td>
                                <td className="p-3 text-right text-[#FF2A6D] text-xs">-{item.depletion?.toFixed(0)}</td>
                                <td className="p-3 text-right font-bold text-white border-r border-[#333] print:text-black print:border-black">
                                    {item.onHand?.toFixed(0)} <span className="text-[10px] text-gray-600 font-normal">lbs</span>
                                </td>

                                {/* Ordering Columns */}
                                <td className="p-3 text-right text-[#C5A059] print:text-black bg-[#C5A059]/5 print:bg-transparent">
                                    {item.breakdown?.mon?.toFixed(0)}
                                </td>
                                <td className="p-3 text-right text-[#00FF94] print:text-black bg-[#00FF94]/5 print:bg-transparent font-bold border-x border-[#333] print:border-gray-300">
                                    {item.breakdown?.wed?.toFixed(0)}
                                </td>
                                <td className="p-3 text-right text-[#C5A059] print:text-black bg-[#C5A059]/5 print:bg-transparent">
                                    {item.breakdown?.sat?.toFixed(0)}
                                </td>

                                <td className="p-3 text-center print:hidden">
                                    <span className={`px-2 py-1 rounded text-[10px] font-bold ${item.status === 'Order Needed' ? 'bg-[#00FF94]/20 text-[#00FF94]' : 'bg-gray-800 text-gray-500'}`}>
                                        {item.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="mt-4 p-3 bg-[#252525] print:bg-transparent border border-[#333] print:border-gray-300 rounded-sm flex items-center gap-3">
                <AlertTriangle size={14} className="text-[#C5A059] print:text-black" />
                <p className="text-[10px] text-gray-400 print:text-black">
                    <strong>Dynamic Inventory:</strong> System estimates <strong>{(meta?.accumulated_weight * 100)?.toFixed(0)}%</strong> consumption of the week so far.
                    Ensure all recent invoices are entered for accuracy.
                </p>
            </div>
        </div >
    );
};

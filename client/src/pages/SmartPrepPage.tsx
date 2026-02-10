
import { useState, useEffect } from 'react';
import { Users, ChefHat, Scale, Printer } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const SmartPrepPage = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [forecast, setForecast] = useState<number>(150);
    const [prepData, setPrepData] = useState<any>(null);

    const [error, setError] = useState<string | null>(null);
    const [lockLoading, setLockLoading] = useState(false);

    const [selectedStore, setSelectedStore] = useState<number | null>(null);
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

    // Mock Stores (In real app, fetch from API)
    const stores = [
        { id: 1, name: 'Dallas' },
        { id: 2, name: 'Austin' },
        { id: 3, name: 'New York' },
        { id: 4, name: 'Miami' },
        { id: 5, name: 'Las Vegas' }
    ];

    // Debounce forecast updates to avoid API spam
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchPrepData();
        }, 500);
        return () => clearTimeout(timer);
    }, [forecast, selectedStore, selectedDate]); // added dependencies

    const fetchPrepData = async () => {
        setLoading(true);
        setError(null);
        try {
            if (!user?.token) {
                setError("Authentication missing. Please log in.");
                setLoading(false);
                return;
            }

            let url = `/api/v1/dashboard/smart-prep?guests=${forecast}&date=${selectedDate}`;
            if (selectedStore) {
                url += `&store_id=${selectedStore}`;
            }

            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${user.token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setPrepData(data);
                if (data.is_locked) {
                    setForecast(data.forecast_guests);
                }
            } else {
                const err = await res.json();
                setError(err.error || 'Failed to load prep data');
            }
        } catch (error) {
            console.error(error);
            setError('Is the server running? Connection failed.');
        } finally {
            setLoading(false);
        }
    };

    const handleLock = async () => {
        if (!prepData || !user?.token || prepData.is_locked) return;

        if (!window.confirm("Are you sure you want to finalize this plan? This will lock adjustments for today and send the data to the Director.")) {
            return;
        }

        setLockLoading(true);
        try {
            const res = await fetch('/api/v1/dashboard/smart-prep/lock', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token}`
                },
                body: JSON.stringify({
                    store_id: selectedStore || user.store_id || 1,
                    date: selectedDate,
                    forecast: forecast,
                    data: {
                        prep_list: prepData.prep_list,
                        target_lbs_guest: prepData.target_lbs_guest
                    }
                })
            });

            if (res.ok) {
                await fetchPrepData();
            } else {
                const err = await res.json();
                alert(err.error || 'Failed to lock plan');
            }
        } catch (err) {
            console.error(err);
            alert('Failed to connect to server');
        } finally {
            setLockLoading(false);
        }
    };

    return (
        <div className="p-6">
            {/* Print Header (Only visible when printing) */}
            <div className="hidden print:block mb-8 text-black">
                <div className="flex justify-between items-center mb-6 border-b-2 border-black pb-4">
                    <div>
                        <h1 className="text-4xl font-bold uppercase tracking-wider">Meat Prep Guide</h1>
                        <p className="text-sm font-mono mt-1">BRASÁ MEAT INTELLIGENCE</p>
                    </div>
                    <div className="text-right">
                        <div className="text-3xl font-bold">{forecast} <span className="text-sm font-normal">GUESTS</span></div>
                        <div className="text-sm">{new Date().toLocaleDateString()}</div>
                    </div>
                </div>

                {/* Print-Only Table */}
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b-2 border-black">
                            <th className="py-2 font-bold uppercase text-sm">Item</th>
                            <th className="py-2 font-bold uppercase text-sm text-right">Prep Qty</th>
                            <th className="py-2 font-bold uppercase text-sm text-right">Total Weight</th>
                            <th className="py-2 font-bold uppercase text-sm text-center w-24">Complete</th>
                            <th className="py-2 font-bold uppercase text-sm w-48">Notes</th>
                        </tr>
                    </thead>
                    <tbody>
                        {prepData?.prep_list.map((item: any) => (
                            <tr key={item.protein} className="border-b border-gray-300">
                                <td className="py-3 font-bold">{item.protein}</td>
                                <td className="py-3 text-right font-mono text-lg">{Math.ceil(item.recommended_units)} <span className="text-xs text-gray-500">units</span></td>
                                <td className="py-3 text-right font-mono">{item.recommended_lbs} lbs</td>
                                <td className="py-3 text-center border-l border-r border-gray-200">
                                    <div className="w-6 h-6 border-2 border-black rounded mx-auto"></div>
                                </td>
                                <td className="py-3 border-r border-gray-200"></td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="mt-8 pt-4 border-t border-black flex justify-between text-xs text-gray-500">
                    <span>Generated by Brasa Intel v2.5.8</span>
                    <span>Target: {prepData?.target_lbs_guest} lbs/guest</span>
                </div>
            </div>

            <div className="flex justify-between items-center mb-6 print:hidden">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                        <ChefHat className="w-8 h-8 text-[#00FF94]" />
                        Smart Prep
                    </h1>
                    <p className="text-gray-500 text-sm mt-1 font-mono uppercase tracking-wider">Kitchen Production Guide</p>
                </div>
                <div className="text-right flex items-center gap-4">

                    {/* Director Controls */}
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
                            <input
                                type="date"
                                className="bg-[#121212] text-white text-sm p-1 rounded border border-[#333] outline-none focus:border-[#C5A059]"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                            />
                        </div>
                    )}

                    <button
                        onClick={() => window.print()}
                        className="bg-[#333] hover:bg-[#444] text-white px-4 py-2 rounded flex items-center gap-2 transition-colors border border-[#444]"
                    >
                        <Printer className="w-4 h-4" /> Print Guide
                    </button>

                    {prepData?.is_locked ? (
                        <div className="bg-[#00FF94]/10 border border-[#00FF94]/50 px-4 py-2 rounded flex items-center gap-2 text-[#00FF94] font-bold animate-pulse">
                            <ChefHat className="w-4 h-4" /> PLAN LOCKED
                        </div>
                    ) : (
                        <button
                            onClick={handleLock}
                            disabled={lockLoading || loading}
                            className="bg-[#00FF94] hover:bg-[#00e685] text-black px-4 py-2 rounded flex items-center gap-2 font-bold transition-all disabled:opacity-50"
                        >
                            <ChefHat className="w-4 h-4" /> {lockLoading ? 'SAVING...' : 'FINALIZE & SEND'}
                        </button>
                    )}

                    <div>
                        <div className="text-sm text-gray-400">Target</div>
                        <div className="text-xl font-bold text-[#00FF94] font-mono">{prepData?.target_lbs_guest || '1.76'} <span className="text-xs text-gray-500">LBS/GUEST</span></div>
                    </div>
                </div>
            </div>

            {/* Control Panel (Hidden on Print) */}
            <div className="bg-[#1a1a1a] border border-[#333] rounded-lg p-6 mb-8 shadow-xl print:hidden">
                <div className="flex flex-col md:flex-row items-center gap-8">

                    <div className="bg-[#252525] p-4 rounded w-full md:w-auto text-center min-w-[200px]">
                        <h3 className="text-gray-400 text-xs uppercase tracking-widest mb-1">Projected Guests</h3>
                        <div className="text-4xl font-black text-white flex items-center justify-center gap-2">
                            <Users className="w-6 h-6 text-gray-500" />
                            {forecast}
                        </div>
                    </div>

                    <div className="flex-1 w-full space-y-2">
                        <label className="text-sm text-gray-400 flex justify-between">
                            <span>Adjust Projection</span>
                            <span className="text-xs text-brand-gold">Real-time Recalculation</span>
                        </label>
                        <input
                            type="range"
                            min="50"
                            max="1000"
                            step="10"
                            value={forecast}
                            disabled={prepData?.is_locked}
                            onChange={(e) => setForecast(parseInt(e.target.value))}
                            className={`w-full h-2 bg-[#333] rounded-lg appearance-none cursor-pointer accent-[#00FF94] ${prepData?.is_locked ? 'opacity-30 cursor-not-allowed' : ''}`}
                        />
                        <div className="flex justify-between text-xs text-gray-600 font-mono">
                            <span>50</span>
                            <span>500</span>
                            <span>1000</span>
                        </div>
                    </div>

                    <div className="bg-[#252525] p-4 rounded w-full md:w-auto text-center min-w-[200px] border border-[#333]">
                        <h3 className="text-gray-400 text-xs uppercase tracking-widest mb-1">Total Meat Needed</h3>
                        <div className="text-3xl font-bold text-white flex items-center justify-center gap-2">
                            <Scale className="w-5 h-5 text-gray-500" />
                            {prepData ? Math.round(prepData.forecast_guests * prepData.target_lbs_guest) : 0} <span className="text-sm text-gray-500">LBS</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Prep Grid */}
            {loading && !prepData && (
                <div className="text-center py-20 text-gray-500 animate-pulse print:hidden">Calculating optimal prep levels...</div>
            )}

            {error && (
                <div className="text-center py-20 text-[#FF2A6D] print:hidden">
                    <p className="font-bold">System Error</p>
                    <p className="text-sm">{error}</p>
                    <button onClick={fetchPrepData} className="mt-4 px-4 py-2 bg-[#333] hover:bg-[#444] rounded text-white text-sm">Retry Connection</button>
                </div>
            )}

            {!loading && !error && prepData && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 print:hidden">
                    {prepData.prep_list.map((item: any) => (
                        <div key={item.protein} className="bg-[#121212] border border-[#333] rounded p-4 hover:border-[#00FF94]/50 transition-colors group">
                            <div className="flex justify-between items-start mb-3">
                                <h3 className="font-bold text-lg text-white group-hover:text-[#00FF94] transition-colors">{item.protein}</h3>
                                <span className="text-xs bg-[#222] text-gray-400 px-2 py-1 rounded font-mono">{item.mix_percentage}</span>
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between items-end border-b border-[#333] pb-2">
                                    <span className="text-xs text-gray-500 uppercase">Prep Qty</span>
                                    <div className="text-right">
                                        <div className="text-3xl font-black text-white leading-none">{Math.ceil(item.recommended_units)}</div>
                                        <p className="text-[10px] text-gray-500 font-mono">Build ID: 2.5.11-ACCOUNTABILITY</p>
                                        <div className="text-[10px] text-gray-500 uppercase mt-1">Pieces / Packs</div>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-gray-500">Total Weight</span>
                                    <span className="text-gray-300 font-mono">{item.recommended_lbs} lbs</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-gray-500">Avg Unit</span>
                                    <span className="text-gray-300 font-mono">{item.avg_weight} lbs</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

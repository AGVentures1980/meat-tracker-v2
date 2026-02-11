import { useState, useEffect } from 'react';
import { Users, ChefHat, Scale, Printer, ArrowLeft, CheckCircle2, AlertCircle, Building2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export const SmartPrepPage = () => {
    const { user } = useAuth();
    const { t } = useLanguage();
    const [loading, setLoading] = useState(true);
    const [forecast, setForecast] = useState<number>(150);
    const [prepData, setPrepData] = useState<any>(null);
    const [networkStatus, setNetworkStatus] = useState<any>(null);

    const [error, setError] = useState<string | null>(null);
    const [lockLoading, setLockLoading] = useState(false);

    const [selectedStore, setSelectedStore] = useState<number | null>(null);
    const getCentralDate = () => {
        const now = new Date();
        const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
        const central = new Date(utc + (3600000 * -6));
        return central.toISOString().split('T')[0];
    };

    const [selectedDate, setSelectedDate] = useState<string>(getCentralDate());

    // Role check
    const isExecutive = user?.role === 'admin' || user?.role === 'director' || user?.email?.includes('admin');

    useEffect(() => {
        if (isExecutive && !selectedStore) {
            fetchNetworkStatus();
        } else {
            fetchPrepData();
        }
    }, [selectedStore, selectedDate]);

    // Handle manual forecast changes (Debounced)
    useEffect(() => {
        if (!selectedStore) return;
        const timer = setTimeout(() => {
            fetchPrepData();
        }, 500);
        return () => clearTimeout(timer);
    }, [forecast]);

    const fetchNetworkStatus = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/v1/dashboard/smart-prep/network-status?date=${selectedDate}`, {
                headers: { 'Authorization': `Bearer ${user?.token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setNetworkStatus(data);
            } else {
                setError('Failed to load network status');
            }
        } catch (err) {
            setError('Server connection failed');
        } finally {
            setLoading(false);
        }
    };

    const fetchPrepData = async () => {
        setLoading(true);
        setError(null);
        try {
            let url = `/api/v1/dashboard/smart-prep?guests=${forecast}&date=${selectedDate}`;
            if (selectedStore) url += `&store_id=${selectedStore}`;

            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${user?.token}` }
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
            alert('Failed to connect to server');
        } finally {
            setLockLoading(false);
        }
    };

    // --- RENDER EXECUTIVE GRID ---
    if (isExecutive && !selectedStore) {
        return (
            <div className="p-6">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                            <Building2 className="w-8 h-8 text-[#C5A059]" />
                            Network Prep Status
                        </h1>
                        <p className="text-gray-500 text-sm mt-1 font-mono uppercase tracking-wider">Executive Overview</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <input
                            type="date"
                            className="bg-[#1a1a1a] text-white text-sm p-2 rounded border border-[#333] outline-none focus:border-[#C5A059]"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                        />
                        <div className="bg-[#1a1a1a] px-4 py-2 rounded border border-[#333] text-sm">
                            <span className="text-gray-500">Submitted:</span>
                            <span className="ml-2 text-white font-bold">{networkStatus?.submitted_count} / {networkStatus?.total_stores}</span>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-20 text-gray-500 animate-pulse">Scanning store network...</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {networkStatus?.stores.map((store: any) => (
                            <button
                                key={store.id}
                                onClick={() => setSelectedStore(store.id)}
                                className={`p-4 rounded-lg border text-left transition-all group relative overflow-hidden ${store.is_locked
                                    ? 'bg-[#121212] border-[#00FF94]/30 hover:border-[#00FF94]'
                                    : 'bg-[#1a1214] border-[#FF2A6D]/30 hover:border-[#FF2A6D] shadow-[0_0_15px_rgba(255,42,109,0.05)]'
                                    }`}
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="font-bold text-lg text-white group-hover:text-[#C5A059] transition-colors">{store.name}</h3>
                                        <p className="text-xs text-gray-500 uppercase">{store.location}</p>
                                    </div>
                                    {store.is_locked ? (
                                        <CheckCircle2 className="w-5 h-5 text-[#00FF94]" />
                                    ) : (
                                        <AlertCircle className="w-5 h-5 text-[#FF2A6D] animate-pulse" />
                                    )}
                                </div>

                                {store.is_locked ? (
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-end">
                                            <span className="text-[10px] text-gray-500 uppercase">Projected Guests</span>
                                            <span className="text-xl font-black text-white">{store.forecast}</span>
                                        </div>
                                        <div className="w-full h-1 bg-[#1a1a1a] rounded overflow-hidden">
                                            <div className="h-full bg-[#00FF94] w-full"></div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="py-4">
                                        <div className="text-[#FF2A6D] text-xs font-bold uppercase tracking-widest text-center">Awaiting Submission</div>
                                    </div>
                                )}

                                {/* Decorative Status Bar */}
                                <div className={`absolute bottom-0 left-0 w-full h-[2px] ${store.is_locked ? 'bg-[#00FF94]' : 'bg-[#FF2A6D]'}`}></div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // --- RENDER DETAILED STORE VIEW ---
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
                        <div className="text-sm">{new Date(selectedDate).toLocaleDateString()}</div>
                    </div>
                </div>

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
            </div>

            <div className="flex justify-between items-center mb-6 print:hidden">
                <div className="flex items-center gap-4">
                    {isExecutive && (
                        <button
                            onClick={() => setSelectedStore(null)}
                            className="p-2 bg-[#1a1a1a] hover:bg-[#333] rounded border border-[#444] text-white transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                    )}
                    <div>
                        <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                            <ChefHat className="w-8 h-8 text-[#00FF94]" />
                            {selectedStore ? prepData?.store_name : t('smart_prep_title')}
                        </h1>
                        <p className="text-gray-500 text-sm mt-1 font-mono uppercase tracking-wider">{t('smart_prep_subtitle')}</p>
                    </div>
                </div>
                <div className="text-right flex items-center gap-4">
                    <button
                        onClick={() => window.print()}
                        className="bg-[#333] hover:bg-[#444] text-white px-4 py-2 rounded flex items-center gap-2 transition-colors border border-[#444]"
                    >
                        <Printer className="w-4 h-4" /> Print Guide
                    </button>

                    {prepData?.is_locked ? (
                        <div className="bg-[#00FF94]/10 border border-[#00FF94]/50 px-4 py-2 rounded flex items-center gap-2 text-[#00FF94] font-bold">
                            <CheckCircle2 className="w-4 h-4" /> {t('plan_locked')}
                        </div>
                    ) : (
                        <button
                            onClick={handleLock}
                            disabled={lockLoading || loading}
                            className="bg-[#00FF94] hover:bg-[#00e685] text-black px-4 py-2 rounded flex items-center gap-2 font-bold transition-all disabled:opacity-50"
                        >
                            <ChefHat className="w-4 h-4" /> {lockLoading ? 'SAVING...' : t('finalize_send')}
                        </button>
                    )}

                    <div>
                        <div className="text-sm text-gray-400">Target</div>
                        <div className="text-xl font-bold text-[#00FF94] font-mono">{prepData?.target_lbs_guest || '1.76'} <span className="text-xs text-gray-500">LBS/G/P</span></div>
                    </div>
                </div>
            </div>

            {/* Control Panel */}
            <div className={`bg-[#1a1a1a] border border-[#333] rounded-lg p-6 mb-8 shadow-xl print:hidden transition-opacity ${prepData?.is_locked ? 'opacity-80' : ''}`}>
                <div className="flex flex-col md:flex-row items-center gap-8">
                    <div className="bg-[#252525] p-4 rounded w-full md:w-auto text-center min-w-[200px]">
                        <h3 className="text-gray-400 text-xs uppercase tracking-widest mb-1">{t('projected_guests')}</h3>
                        <div className="text-4xl font-black text-white flex items-center justify-center gap-2">
                            <Users className="w-6 h-6 text-gray-500" />
                            {forecast}
                        </div>
                    </div>

                    <div className="flex-1 w-full space-y-2">
                        <label className="text-sm text-gray-400 flex justify-between">
                            <span>{t('adjust_projection')}</span>
                            {prepData?.is_locked && <span className="text-[#00FF94] text-xs font-bold uppercase tracking-widest">{t('plan_locked')}</span>}
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
            {!loading && !error && prepData && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 print:hidden">
                    {prepData.prep_list.map((item: any) => (
                        <div key={item.protein} className="bg-[#121212] border border-[#333] rounded p-4 group">
                            <div className="flex justify-between items-start mb-3">
                                <h3 className="font-bold text-lg text-white group-hover:text-[#00FF94] transition-colors">{item.protein}</h3>
                                <span className="text-xs bg-[#222] text-gray-400 px-2 py-1 rounded font-mono">{item.mix_percentage}</span>
                            </div>
                            <div className="space-y-4">
                                <div className="flex justify-between items-end border-b border-[#333] pb-2">
                                    <span className="text-xs text-gray-500 uppercase">Prep Qty</span>
                                    <div className="text-right">
                                        <div className="text-3xl font-black text-white leading-none">{Math.ceil(item.recommended_units)}</div>
                                        <p className="text-[10px] text-gray-500 uppercase mt-1">Pieces / Packs</p>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center text-xs text-gray-400">
                                    <span>Total Weight</span>
                                    <span className="font-mono">{item.recommended_lbs} lbs</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

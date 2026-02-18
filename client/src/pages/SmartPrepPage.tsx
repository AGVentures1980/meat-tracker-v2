import { useState, useEffect, useMemo } from 'react';
import { Users, ChefHat, Scale, Printer, ArrowLeft, CheckCircle2, AlertCircle, Building2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export const SmartPrepPage = () => {
    const { user } = useAuth();
    const { t } = useLanguage();
    const [loading, setLoading] = useState(true);
    const [lunchForecast, setLunchForecast] = useState<number>(75);
    const [dinnerForecast, setDinnerForecast] = useState<number>(125);
    const forecast = lunchForecast + dinnerForecast;
    const [prepData, setPrepData] = useState<any>(null);
    const [networkStatus, setNetworkStatus] = useState<any>(null);

    const [error, setError] = useState<string | null>(null);
    const [lockLoading, setLockLoading] = useState(false);

    const [selectedStore, setSelectedStore] = useState<number | null>(null);
    const [excludedProteins, setExcludedProteins] = useState<string[]>([]);
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
        // We allow fetch even if selectedStore is null (backend will use JWT store_id)
        // This fixes the slider for regular store users.
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
                    const total = data.forecast_guests;
                    setLunchForecast(Math.round(total * 0.4));
                    setDinnerForecast(total - Math.round(total * 0.4));
                    // Reset exclusions if locked, as locked data is already filtered/calculated
                    setExcludedProteins([]);
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

    // REDISTRIBUTION & FINANCIAL LOGIC
    const adjustedPrepData = useMemo(() => {
        if (!prepData) return null;

        let activeItems = prepData.prep_list;
        let isExclusionActive = excludedProteins.length > 0;

        if (isExclusionActive) {
            activeItems = prepData.prep_list.filter((item: any) => !excludedProteins.includes(item.protein));
        }

        if (activeItems.length === 0) return prepData;

        // Calculate total target weight to maintain (forecast * target_lbs_guest)
        const totalTargetLbs = forecast * (prepData.target_lbs_guest || 1.76);

        // Sum current mix percentages of active items
        const rawMixSum = activeItems.reduce((sum: number, item: any) => {
            const val = parseFloat(item.mix_percentage.replace('%', ''));
            return sum + (isNaN(val) ? 0 : val / 100);
        }, 0);

        let totalAdjustedCost = 0;

        const updatedList = prepData.prep_list.map((item: any) => {
            const isExcluded = excludedProteins.includes(item.protein);
            if (isExcluded) {
                return { ...item, recommended_lbs: 0, recommended_units: 0, mix_percentage: '0.0% (EXCLUDED)' };
            }

            // Normalize weight
            const itemMix = parseFloat(item.mix_percentage.replace('%', '')) / 100;
            const normalizedMix = itemMix / rawMixSum;
            const adjustedLbs = totalTargetLbs * normalizedMix;

            // Financial Accumulation
            const costLb = item.cost_lb || 6.00;
            totalAdjustedCost += adjustedLbs * costLb;

            // Recalculate units based on original density (unitWeight)
            const unitWeight = item.avg_weight || 1;
            const adjustedUnits = adjustedLbs / unitWeight;

            return {
                ...item,
                recommended_lbs: parseFloat(adjustedLbs.toFixed(2)),
                recommended_units: adjustedUnits,
                mix_percentage: (normalizedMix * 100).toFixed(1) + '%'
            };
        });

        const predictedCostGuest = totalAdjustedCost / forecast;
        const targetCostPerGuest = prepData.target_cost_guest || 9.94;
        const toleranceThreshold = targetCostPerGuest + 0.05;

        // Dynamic Briefing Update (Frontend override if mix changes)
        let localBriefing = prepData.tactical_briefing;
        if (isExclusionActive) {
            if (predictedCostGuest > toleranceThreshold) {
                localBriefing = `Financial Risk Identified: The mix adjustment raised the cost to $${predictedCostGuest.toFixed(2)}. Target of $${targetCostPerGuest.toFixed(2)} at risk.`;
            } else {
                localBriefing = `Mix Adjustment OK: Projected cost of $${predictedCostGuest.toFixed(2)} per guest.`;
            }
        }

        return {
            ...prepData,
            predicted_cost_guest: parseFloat(predictedCostGuest.toFixed(2)),
            tactical_briefing: localBriefing,
            prep_list: updatedList
        };
    }, [prepData, excludedProteins, forecast]);

    const toggleProtein = (protein: string) => {
        if (prepData?.is_locked) return;
        setExcludedProteins((prev: string[]) =>
            prev.includes(protein) ? prev.filter((p: string) => p !== protein) : [...prev, protein]
        );
    };

    const handleLock = async () => {
        if (!prepData || !user?.token || prepData.is_locked) return;

        if (!window.confirm(t('confirm_finalize'))) {
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
                        prep_list: adjustedPrepData.prep_list,
                        target_lbs_guest: prepData.target_lbs_guest,
                        predicted_cost_guest: adjustedPrepData.predicted_cost_guest,
                        tactical_briefing: adjustedPrepData.tactical_briefing
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
                            <span className="text-gray-500">{t('prep_submitted')}:</span>
                            <span className="ml-2 text-white font-bold">{networkStatus?.submitted_count} / {networkStatus?.total_stores}</span>
                        </div>
                        {networkStatus?.company_avg_cost_guest && (
                            <div className={`px-4 py-2 rounded border text-sm font-bold flex items-center gap-2 ${networkStatus.company_avg_cost_guest > 9.98
                                ? 'bg-red-500/10 border-red-500/30 text-red-500'
                                : 'bg-[#00FF94]/10 border-[#00FF94]/30 text-[#00FF94]'
                                }`}>
                                <Building2 className="w-4 h-4" />
                                COMPANY AVG: ${networkStatus.company_avg_cost_guest}
                            </div>
                        )}
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-20 text-gray-500 animate-pulse">{t('prep_scanning')}</div>
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
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center bg-[#1a1a1a] p-2 rounded">
                                            <div className="text-center">
                                                <span className="text-[10px] text-gray-500 uppercase block leading-none mb-1">Guests</span>
                                                <span className="text-lg font-black text-white">{store.forecast}</span>
                                            </div>
                                            <div className="h-6 w-[1px] bg-[#333]"></div>
                                            <div className="text-center">
                                                <span className="text-[10px] text-gray-500 uppercase block leading-none mb-1">$/Guest</span>
                                                <span className={`text-lg font-black ${store.predicted_cost_guest > 9.98 ? 'text-red-500' : 'text-[#00FF94]'
                                                    }`}>${store.predicted_cost_guest || '0.00'}</span>
                                            </div>
                                        </div>
                                        <div className="w-full h-1 bg-[#1a1a1a] rounded overflow-hidden">
                                            <div className={`h-full w-full ${store.predicted_cost_guest > 9.98 ? 'bg-red-500' : 'bg-[#00FF94]'
                                                }`}></div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="py-4">
                                        <div className="text-[#FF2A6D] text-xs font-bold uppercase tracking-widest text-center">{t('prep_awaiting')}</div>
                                    </div>
                                )}

                                {/* Decorative Status Bar */}
                                <div className={`absolute bottom-0 left-0 w-full h-[2px] ${store.is_locked ? (store.predicted_cost_guest > 9.98 ? 'bg-red-500' : 'bg-[#00FF94]') : 'bg-[#FF2A6D]'}`}></div>
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
                    <tbody className="print:text-black text-black">
                        {adjustedPrepData?.prep_list.filter((item: any) => !excludedProteins.includes(item.protein)).map((item: any) => (
                            <tr key={item.protein} className="border-b border-gray-300 print:text-black">
                                <td className="py-3 font-bold print:text-black">{item.protein}</td>
                                <td className="py-3 text-right font-mono text-lg print:text-black">{Math.ceil(item.recommended_units)} <span className="text-xs text-gray-500 print:text-gray-600">{item.unit_name || 'units'}</span></td>
                                <td className="py-3 text-right font-mono print:text-black">{item.recommended_lbs} lbs</td>
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
                        <Printer className="w-4 h-4" /> {t('prep_print_guide')}
                    </button>

                    {prepData?.is_locked ? (
                        <div className="bg-[#00FF94]/10 border border-[#00FF94]/50 px-4 py-2 rounded flex items-center gap-2 text-[#00FF94] font-bold">
                            <CheckCircle2 className="w-4 h-4" /> {t('plan_locked')}
                        </div>
                    ) : (
                        (user?.role !== 'director' && user?.role !== 'admin' && !user?.email?.includes('director') && !user?.email?.includes('admin')) && (
                            <button
                                onClick={handleLock}
                                disabled={lockLoading || loading}
                                className="bg-[#00FF94] hover:bg-[#00e685] text-black px-4 py-2 rounded flex items-center gap-2 font-bold transition-all disabled:opacity-50"
                            >
                                <ChefHat className="w-4 h-4" /> {lockLoading ? 'SAVING...' : t('finalize_send')}
                            </button>
                        )
                    )}

                    <div>
                        <div className="text-sm text-gray-400">{t('label_target')}</div>
                        <div className="text-xl font-bold text-[#00FF94] font-mono">{prepData?.target_lbs_guest || '1.76'} <span className="text-xs text-gray-500">{t('unit_lbs')}/G/P</span></div>
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

                    <div className="flex-1 w-full space-y-6">
                        {/* Lunch Slider */}
                        <div className="space-y-2">
                            <label className="text-sm text-gray-400 flex justify-between">
                                <span>{t('lunch_projection') || 'Estimated Lunch Covers'}</span>
                                <span className="text-[#C5A059] font-bold">{lunchForecast}</span>
                            </label>
                            <input
                                type="range"
                                min="0"
                                max="500"
                                step="5"
                                value={lunchForecast}
                                disabled={prepData?.is_locked || (isExecutive && selectedStore !== null)}
                                onChange={(e) => setLunchForecast(parseInt(e.target.value))}
                                className={`w-full h-2 bg-[#333] rounded-lg appearance-none cursor-pointer accent-[#C5A059] ${prepData?.is_locked || (isExecutive && selectedStore !== null) ? 'opacity-30 cursor-not-allowed' : ''}`}
                            />
                        </div>

                        {/* Dinner Slider */}
                        <div className="space-y-2">
                            <label className="text-sm text-gray-400 flex justify-between">
                                <span>{t('dinner_projection') || 'Estimated Dinner Covers'}</span>
                                <span className="text-[#C5A059] font-bold">{dinnerForecast}</span>
                            </label>
                            <input
                                type="range"
                                min="0"
                                max="800"
                                step="5"
                                value={dinnerForecast}
                                disabled={prepData?.is_locked || (isExecutive && selectedStore !== null)}
                                onChange={(e) => setDinnerForecast(parseInt(e.target.value))}
                                className={`w-full h-2 bg-[#333] rounded-lg appearance-none cursor-pointer accent-[#C5A059] ${prepData?.is_locked || (isExecutive && selectedStore !== null) ? 'opacity-30 cursor-not-allowed' : ''}`}
                            />
                            {prepData?.is_locked && <div className="text-center text-[#00FF94] text-xs font-bold uppercase tracking-widest mt-1">{t('plan_locked')}</div>}
                        </div>
                    </div>

                    <div className="bg-[#252525] p-4 rounded w-full md:w-auto text-center min-w-[200px] border border-[#333]">
                        <h3 className="text-gray-400 text-xs uppercase tracking-widest mb-1">{t('total_meat_needed')}</h3>
                        <div className="text-3xl font-bold text-white flex items-center justify-center gap-2">
                            <Scale className="w-5 h-5 text-gray-500" />
                            {prepData ? Math.round(forecast * prepData.target_lbs_guest) : 0} <span className="text-sm text-gray-500">{t('unit_lbs')}</span>
                        </div>
                    </div>

                    {/* FINANCIAL HEALTH CARD */}
                    <div className={`p-4 rounded w-full md:w-auto text-center min-w-[200px] border transition-colors ${(adjustedPrepData?.predicted_cost_guest || 0) > (adjustedPrepData?.target_cost_guest || 9.94) + 0.05
                        ? 'bg-red-500/10 border-red-500/50'
                        : (adjustedPrepData?.predicted_cost_guest || 0) > (adjustedPrepData?.target_cost_guest || 9.94)
                            ? 'bg-yellow-500/10 border-yellow-500/50'
                            : 'bg-[#00FF94]/10 border-[#00FF94]/50'
                        }`}>
                        <h3 className="text-gray-400 text-xs uppercase tracking-widest mb-1">$/GUEST (PROJECTED)</h3>
                        <div className={`text-3xl font-black flex items-center justify-center gap-2 ${(adjustedPrepData?.predicted_cost_guest || 0) > (adjustedPrepData?.target_cost_guest || 9.94) + 0.05
                            ? 'text-red-500'
                            : (adjustedPrepData?.predicted_cost_guest || 0) > (adjustedPrepData?.target_cost_guest || 9.94)
                                ? 'text-yellow-500'
                                : 'text-[#00FF94]'
                            }`}>
                            <span className="text-sm font-normal text-gray-500">$</span>
                            {adjustedPrepData?.predicted_cost_guest || '0.00'}
                        </div>
                    </div>
                </div>
            </div>

            {/* TACTICAL BRIEFING CARD */}
            {adjustedPrepData?.tactical_briefing && (
                <div className={`mb-8 p-4 rounded-lg border flex gap-4 items-start ${(adjustedPrepData?.predicted_cost_guest || 0) > (adjustedPrepData?.target_cost_guest || 9.94) + 0.05
                    ? 'bg-red-500/5 border-red-500/20 text-red-200'
                    : 'bg-[#C5A059]/5 border-[#C5A059]/20 text-[#C5A059]'
                    }`}>
                    <AlertCircle className="w-6 h-6 shrink-0 mt-0.5" />
                    <div>
                        <h4 className="font-bold uppercase text-xs tracking-widest mb-1">Tactical Manager Briefing</h4>
                        <p className="text-sm leading-relaxed">{adjustedPrepData.tactical_briefing}</p>
                    </div>
                </div>
            )}

            {/* Prep Grid */}
            {!loading && !error && adjustedPrepData && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 print:hidden">
                    {adjustedPrepData.prep_list.map((item: any) => {
                        const isExcluded = excludedProteins.includes(item.protein);
                        return (
                            <div
                                key={item.protein}
                                className={`bg-[#121212] border border-[#333] rounded p-4 group transition-all ${isExcluded ? 'opacity-40 grayscale border-dashed' : ''}`}
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <h3 className="font-bold text-lg text-white group-hover:text-[#00FF94] transition-colors line-clamp-1">{item.protein}</h3>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => toggleProtein(item.protein)}
                                            disabled={isExecutive && selectedStore !== null}
                                            className={`p-1 rounded hover:bg-[#222] transition-colors ${isExcluded ? 'text-red-500' : 'text-gray-500 hover:text-[#00FF94]'} ${(isExecutive && selectedStore !== null) ? 'cursor-not-allowed opacity-50' : ''}`}
                                            title={isExcluded ? 'Enable Item' : 'Discard / Out of Stock'}
                                        >
                                            {isExcluded ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                        {!isExcluded && (
                                            <span className={`text-[10px] bg-[#222] px-2 py-1 rounded font-mono border border-[#333] ${item.cost_lb > 10 ? 'text-red-400' : 'text-gray-400'
                                                }`}>
                                                {item.mix_percentage}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-end border-b border-[#333] pb-2">
                                        <span className="text-xs text-gray-500 uppercase">{t('prep_qty')}</span>
                                        <div className="text-right">
                                            <div className={`text-3xl font-black leading-none ${isExcluded ? 'text-gray-600' : 'text-white'}`}>
                                                {isExcluded ? '--' : Math.ceil(item.recommended_units)}
                                            </div>
                                            <p className="text-[10px] text-gray-400 uppercase mt-1">{item.unit_name || t('prep_pieces_packs')}</p>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center text-xs text-gray-400">
                                        <span>{t('prep_total_weight')}</span>
                                        <span className="font-mono">{isExcluded ? '0.00' : item.recommended_lbs} {t('unit_lbs').toLowerCase()}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

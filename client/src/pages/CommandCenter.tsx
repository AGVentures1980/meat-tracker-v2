import { useState, useEffect } from 'react';
import {
    PlayCircle,
    ShieldCheck,
    ChevronRight,
    ChefHat,
    Trash2,
    AlertTriangle,
    Zap,
    Users,
    Printer,
    ArrowRight,
    Plus,
    X,
    ChevronDown,
    Brain
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export const CommandCenter = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    // --- STATE ---
    const [loading, setLoading] = useState(true);
    const [gateStatus, setGateStatus] = useState<any>(null);
    const [prepData, setPrepData] = useState<any>(null);
    const [lunchForecast, setLunchForecast] = useState<number>(0);
    const [dinnerForecast, setDinnerForecast] = useState<number>(150);
    const [wasteItems, setWasteItems] = useState<any[]>([]);
    const [isSubmittingWaste, setIsSubmittingWaste] = useState(false);
    const [networkAccountability, setNetworkAccountability] = useState<any>(null);
    const [networkPrepStatus, setNetworkPrepStatus] = useState<any>(null);
    const [selectedStoreId, setSelectedStoreId] = useState<number | null>(user?.storeId || null);
    const [isStoreDropdownOpen, setIsStoreDropdownOpen] = useState(false);

    // --- REASON LIST FOR WASTE ---
    const WASTE_REASONS = ['Floor Drop', 'Over-Prep', 'Quality Check', 'Burnt/Cook Error', 'End of Shift', 'Staff Meals (Family Meal)'];
    const [proteins, setProteins] = useState<string[]>([]);
    const [villains, setVillains] = useState<string[]>([]);

    const getCentralDate = () => {
        const now = new Date();
        const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
        const central = new Date(utc + (3600000 * -6));
        return central.toISOString().split('T')[0];
    };

    const [selectedDate, setSelectedDate] = useState(getCentralDate());

    // --- FETCH DATA ---
    const fetchData = async () => {
        setLoading(true);
        try {
            const urlParams = new URLSearchParams();
            if (user?.role === 'director' || user?.role === 'admin') {
                if (selectedStoreId) urlParams.append('store_id', selectedStoreId.toString());
            }

            // 1. Fetch gate status
            const statusRes = await fetch(`/api/v1/dashboard/waste/status?${urlParams.toString()}`, {
                headers: { 'Authorization': `Bearer ${user?.token}` }
            });
            const statusData = await statusRes.json();
            setGateStatus(statusData);
            if (statusData.storeId && !selectedStoreId) setSelectedStoreId(statusData.storeId);

            if (!statusData.gate_locked) {
                // 2. Fetch Prep Data if gate is open
                urlParams.append('lunch_forecast', lunchForecast.toString());
                urlParams.append('dinner_forecast', dinnerForecast.toString());
                urlParams.append('date', selectedDate);
                if (selectedStoreId) {
                    urlParams.append('store_id', selectedStoreId.toString());
                } else if (user?.storeId) {
                    urlParams.append('store_id', user.storeId.toString());
                }
                const prepRes = await fetch(`/api/v1/dashboard/smart-prep?${urlParams.toString()}`, {
                    headers: { 'Authorization': `Bearer ${user?.token}` }
                });
                if (prepRes.ok) {
                    const pData = await prepRes.json();
                    setPrepData(pData);
                    if (pData.store_id && !selectedStoreId) setSelectedStoreId(pData.store_id);
                    if (pData.is_locked) {
                        setLunchForecast(pData.lunch_forecast || 0);
                        setDinnerForecast(pData.dinner_forecast || pData.forecast_guests || 150);
                    }
                } else {
                    const err = await prepRes.json();
                    alert("System Error: " + (err.error || "Failed to load Prep List"));
                }
            }

            // 3. Fetch Network Accountability and Prep Status if Director/Admin
            if (user?.role === 'director' || user?.role === 'admin') {
                const [networkRes, prepStatusRes] = await Promise.all([
                    fetch('/api/v1/dashboard/waste/network-accountability', {
                        headers: { 'Authorization': `Bearer ${user?.token}` }
                    }),
                    fetch('/api/v1/dashboard/smart-prep/network-status', {
                        headers: { 'Authorization': `Bearer ${user?.token}` }
                    })
                ]);

                if (networkRes.ok) {
                    setNetworkAccountability(await networkRes.json());
                } else {
                    console.error("Network Accountability failed", await networkRes.text());
                }

                if (prepStatusRes.ok) {
                    setNetworkPrepStatus(await prepStatusRes.json());
                } else {
                    const errText = await prepStatusRes.text();
                    alert("Network Prep Status failed: " + errText);
                    console.error("Network Prep Status failed", errText);
                }
            }

            // 4. Fetch Products
            const productRes = await fetch(`${(import.meta as any).env?.VITE_API_URL || ''}/api/v1/dashboard/settings/company-products`, {
                headers: { 'Authorization': `Bearer ${user?.token}` }
            });
            if (productRes.ok) {
                const pData = await productRes.json();
                if (Array.isArray(pData)) {
                    setProteins(pData.map((p: any) => p.name));
                    setVillains(pData.filter((p: any) => p.is_villain).map((p: any) => p.name));
                }
            }
        } catch (err) {
            console.error('Failed to sync with command center.', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();

        // Polling for network status for Admin
        let interval: NodeJS.Timeout;
        if (user?.role === 'director' || user?.role === 'admin') {
            interval = setInterval(() => {
                fetch('/api/v1/dashboard/waste/network-accountability', {
                    headers: { 'Authorization': `Bearer ${user?.token}` }
                })
                    .then(res => res.json())
                    .then(data => setNetworkAccountability(data))
                    .catch(err => console.error(err));

                fetch('/api/v1/dashboard/smart-prep/network-status', {
                    headers: { 'Authorization': `Bearer ${user?.token}` }
                })
                    .then(res => res.json())
                    .then(data => setNetworkPrepStatus(data))
                    .catch(err => console.error(err));
            }, 10000); // Poll every 10 seconds
        }

        return () => clearInterval(interval);
    }, [user, selectedStoreId, selectedDate]);

    // Debounced fetch for forecast changes
    useEffect(() => {
        if (!prepData || prepData.is_locked) return;
        const timer = setTimeout(() => {
            fetchData();
        }, 800);
        return () => clearTimeout(timer);
    }, [lunchForecast, dinnerForecast]);

    // --- HANDLERS ---
    const handleSetNoDelivery = async () => {
        if (!window.confirm("Confirm: No meat delivery was received today?")) return;
        try {
            const res = await fetch('/api/v1/dashboard/settings/no-delivery', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${user?.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    storeId: selectedStoreId || user?.storeId || 1,
                    enabled: true
                })
            });
            if (res.ok) {
                fetchData();
            } else {
                alert("Failed to set flag.");
            }
        } catch (err) {
            alert("Connection error.");
        }
    };

    const lockPrepPlan = async () => {
        const totalForecast = lunchForecast + dinnerForecast;
        if (!window.confirm(`Lock Shift Prep Plan for ${totalForecast} guests?`)) return;
        try {
            const payload: any = {
                store_id: selectedStoreId || user?.storeId || 1,
                date: selectedDate,
                forecast: totalForecast,
                lunch_forecast: prepData?.is_lunch_enabled ? lunchForecast : null,
                dinner_forecast: dinnerForecast,
                data: prepData
            };

            const res = await fetch('/api/v1/dashboard/smart-prep/lock', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${user?.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                alert('Prep Plan locked successfully.');
                fetchData();
            } else {
                const err = await res.json();
                alert(err.error || 'Failed to lock plan');
            }
        } catch (err) {
            alert('Connection error');
        }
    };

    const addWasteItem = () => {
        setWasteItems([...wasteItems, { protein: proteins[0] || '', weight: 0, reason: WASTE_REASONS[0] }]);
    };

    const removeWasteItem = (index: number) => {
        setWasteItems(wasteItems.filter((_, i) => i !== index));
    };

    const updateWasteItem = (index: number, field: string, value: any) => {
        const newItems = [...wasteItems];
        newItems[index] = { ...newItems[index], [field]: value };
        setWasteItems(newItems);
    };

    const submitWaste = async () => {
        if (wasteItems.length === 0) return;
        if (wasteItems.some(i => i.weight <= 0)) {
            alert("All weights must be greater than 0");
            return;
        }

        setIsSubmittingWaste(true);
        try {
            const shift = gateStatus?.today?.can_input_lunch ? 'LUNCH' : 'DINNER';

            const payload: any = {
                date: selectedDate,
                shift: shift,
                items: wasteItems
            };
            if (user?.role === 'director' || user?.role === 'admin') {
                payload.store_id = selectedStoreId;
            }

            const res = await fetch('/api/v1/dashboard/waste', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user?.token}`
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                alert("Waste logged successfully!");
                setWasteItems([]);
                fetchData();
            } else {
                const err = await res.json();
                alert(err.error || "Failed to log waste");
            }
        } catch (err) {
            alert("Connection failed");
        } finally {
            setIsSubmittingWaste(false);
        }
    };

    // --- LOADING RENDER ---
    if (loading && !gateStatus) {
        return (
            <div className="flex flex-col items-center justify-center h-[80vh] gap-6">
                <div className="relative">
                    <Zap className="w-16 h-16 text-[#C5A059] animate-pulse" />
                    <div className="absolute inset-0 bg-[#C5A059]/20 blur-xl animate-pulse"></div>
                </div>
                <div className="text-center">
                    <h2 className="text-xl font-bold tracking-tighter text-white uppercase italic">Synchronizing Governance</h2>
                    <p className="text-gray-500 text-xs font-mono uppercase mt-2 tracking-widest">Bridging Invoice & Operation Data...</p>
                </div>
            </div>
        );
    }

    // --- GATE LOCKED RENDER ---
    if (gateStatus?.gate_locked) {
        return (
            <div className="max-w-4xl mx-auto mt-12 px-6">
                {/* Director Alert Header */}
                {(user?.role === 'director' || user?.role === 'admin') && networkAccountability?.critical_cases > 0 && (
                    <div className="mb-6 bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center gap-4 animate-pulse">
                        <AlertTriangle className="w-6 h-6 text-red-500" />
                        <div>
                            <span className="block text-red-500 font-bold uppercase text-xs tracking-wider">Network Integrity Alert</span>
                            <p className="text-red-200/80 text-sm">{networkAccountability.critical_cases} critical cases detected across the network.</p>
                        </div>
                    </div>
                )}

                <div className="bg-[#1a1214] border border-[#FF2A6D]/20 rounded-xl p-10 text-center relative overflow-hidden shadow-2xl">
                    <div className="absolute top-0 left-0 w-full h-1 bg-[#FF2A6D]"></div>
                    <div className="flex justify-center mb-8">
                        <div className="p-6 bg-[#FF2A6D]/10 rounded-full border border-[#FF2A6D]/20">
                            <ShieldCheck className="w-16 h-16 text-[#FF2A6D]" />
                        </div>
                    </div>

                    <h1 className="text-4xl font-black text-white mb-2 tracking-tight uppercase">Accountability Gate</h1>
                    <div className="flex justify-center mb-6">
                        <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] text-gray-400 font-mono uppercase tracking-widest">
                            Context: {user?.role === 'manager' ? 'Store Level' : 'Executive View'} | Source: {gateStatus?.source || 'Detecting...'}
                        </span>
                    </div>

                    <p className="text-gray-400 text-lg mb-10 max-w-2xl mx-auto leading-relaxed">
                        To maintain financial integrity, you must either log today's <span className="text-white font-bold italic underline decoration-[#FF2A6D]">Meat Invoices</span> or flag that <span className="text-white font-bold italic underline decoration-[#FF2A6D]">No Delivery</span> was received before opening the Shift Command Center.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                        {(user?.role === 'manager' || user?.role === 'store_admin') && (
                            <>
                                <button
                                    onClick={() => navigate('/prices')}
                                    className="flex items-center justify-between p-6 bg-[#252525] hover:bg-[#333] border border-white/5 rounded-lg transition-all group"
                                >
                                    <div className="text-left">
                                        <span className="block text-[#C5A059] text-xs font-bold uppercase tracking-widest mb-1">Process Invoices</span>
                                        <span className="text-white font-bold">Log New Delivery</span>
                                    </div>
                                    <ChevronRight className="w-6 h-6 text-gray-600 group-hover:text-[#C5A059] group-hover:translate-x-1 transition-all" />
                                </button>

                                <button
                                    onClick={handleSetNoDelivery}
                                    className="flex items-center justify-between p-6 bg-[#121212] hover:bg-[#1a1a1a] border border-white/5 rounded-lg transition-all group border-dashed"
                                >
                                    <div className="text-left">
                                        <span className="block text-gray-500 text-xs font-bold uppercase tracking-widest mb-1">Manual Override</span>
                                        <span className="text-gray-300 font-bold">No Delivery Received Today</span>
                                    </div>
                                    <PlayCircle className="w-6 h-6 text-gray-800 group-hover:text-white transition-colors" />
                                </button>
                            </>
                        )}
                    </div>

                    <div className="mt-12 pt-8 border-t border-white/5">
                        <p className="text-[10px] text-gray-600 font-mono uppercase tracking-widest">
                            OZ PRINCIPLE COMPLIANCE: {user?.email} | {new Date().toLocaleDateString()}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // --- COMMAND CENTER RENDER ---
    return (
        <div className="max-w-[1600px] mx-auto p-4 space-y-6">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#1a1a1a] p-6 rounded-xl border border-white/5 shadow-xl relative print:border-none print:shadow-none print:p-0 print:bg-transparent print:mb-6">
                <div className="absolute top-0 left-0 w-1 h-full bg-[#C5A059] print:hidden"></div>
                <div>
                    <div className="flex items-center gap-3">
                        <PlayCircle className="w-8 h-8 text-[#C5A059] print:hidden" />
                        <h1 className="text-3xl font-black text-white tracking-tight uppercase print:text-5xl print:text-black">Shift Command Center</h1>
                    </div>
                    <div className="flex items-center gap-3 mt-1 print:hidden">
                        {(user?.role === 'director' || user?.role === 'admin') && networkPrepStatus ? (
                            <div className="flex items-center gap-2 relative z-50">
                                <p className="text-gray-500 text-sm font-mono uppercase tracking-wider">Commanding Store:</p>
                                <div className="relative z-50">
                                    <button
                                        onClick={() => setIsStoreDropdownOpen(!isStoreDropdownOpen)}
                                        className="bg-black/40 border border-white/10 text-white text-sm font-bold py-1 px-3 rounded flex items-center justify-between min-w-[160px] hover:border-[#C5A059] transition-colors"
                                    >
                                        <span>
                                            {(() => {
                                                const currentOptions = networkPrepStatus.stores.find((s: any) => s.id === (selectedStoreId || 1));
                                                return currentOptions ? `${currentOptions.is_locked ? '🟢' : '🔴'} ${currentOptions.name}` : 'Select Store';
                                            })()}
                                        </span>
                                        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isStoreDropdownOpen ? 'rotate-180' : ''}`} />
                                    </button>

                                    {isStoreDropdownOpen && (
                                        <>
                                            <div
                                                className="fixed inset-0 z-[100]"
                                                onClick={() => setIsStoreDropdownOpen(false)}
                                            />
                                            <div className="absolute top-full mt-2 left-0 w-full min-w-[200px] bg-[#1a1a1a] border border-white/10 rounded overflow-hidden shadow-2xl z-[101]">
                                                <ul className="max-h-[300px] overflow-y-auto custom-scrollbar">
                                                    {networkPrepStatus.stores.map((store: any) => (
                                                        <li
                                                            key={store.id}
                                                            onClick={() => {
                                                                setSelectedStoreId(store.id);
                                                                setIsStoreDropdownOpen(false);
                                                            }}
                                                            className={`px-4 py-2 text-sm font-bold cursor-pointer transition-colors hover:bg-[#C5A059]/20 flex items-center gap-2 ${selectedStoreId === store.id ? 'bg-[#C5A059]/10 text-white border-l-2 border-[#C5A059]' : 'text-gray-300'}`}
                                                        >
                                                            <span>{store.is_locked ? '🟢' : '🔴'}</span>
                                                            <span>{store.name}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <p className="text-gray-500 text-sm font-mono uppercase tracking-wider">Store {gateStatus?.storeId || '...'} | Shift: {gateStatus?.today?.can_input_lunch ? 'LUNCH' : (gateStatus?.today?.can_input_dinner ? 'DINNER' : 'ALL DAY')}</p>
                        )}
                        <span className="px-2 py-0.5 bg-white/5 rounded text-[8px] text-gray-600 font-bold uppercase tracking-tighter border border-white/5">Source: {gateStatus?.source || '365'}</span>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex flex-col print:hidden">
                        <span className="text-[10px] text-gray-500 uppercase tracking-widest mb-1 ml-1">Historical View</span>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            max={getCentralDate()}
                            className="bg-black/40 text-[#C5A059] border border-[#C5A059]/30 rounded-lg p-2 text-sm font-mono outline-none focus:border-[#C5A059] hover:bg-[#C5A059]/10 transition-colors cursor-pointer"
                        />
                    </div>
                    {(user?.role === 'director' || user?.role === 'admin') && (
                        <div className="flex items-center gap-3 px-4 py-2 bg-black/40 rounded-lg border border-white/5 print:hidden">
                            <div className="text-right">
                                <span className="block text-[8px] text-gray-600 uppercase tracking-widest leading-none">Network Intake</span>
                                <span className={`text-xs font-black ${networkAccountability?.critical_cases > 0 ? 'text-red-500' : 'text-[#00FF94]'}`}>
                                    {networkAccountability?.total_stores - networkAccountability?.critical_cases}/{networkAccountability?.total_stores} Ready
                                </span>
                            </div>
                            <ShieldCheck className={`w-4 h-4 ${networkAccountability?.critical_cases > 0 ? 'text-red-500' : 'text-[#00FF94]'}`} />
                        </div>
                    )}

                    {prepData?.holiday_insight && (
                        <div className="bg-[#C5A059]/20 border-2 border-[#C5A059]/50 rounded-lg p-4 flex items-start gap-3 print:hidden max-w-sm shadow-[0_0_15px_rgba(197,160,89,0.2)]">
                            <div className="relative">
                                <Brain className="w-6 h-6 text-[#C5A059] shrink-0" />
                                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#FF2A6D] rounded-full animate-pulse border border-black"></div>
                            </div>
                            <div>
                                <span className="text-xs font-black text-[#C5A059] uppercase tracking-wider block mb-1">AI Event Insight</span>
                                <p className="text-sm text-white font-medium leading-snug">{prepData.holiday_insight}</p>
                            </div>
                        </div>
                    )}

                    <div className="flex flex-wrap items-center gap-6 bg-[#121212] p-4 rounded-lg border border-white/5 print:border-none print:p-0 print:bg-transparent">
                        <div className="text-center px-4 border-r border-white/5 print:border-gray-200">
                            <span className="block text-[10px] text-gray-500 w-[100px] uppercase tracking-widest mb-1 print:text-gray-600">Total Forecast</span>
                            <div className="flex justify-center items-center gap-2">
                                {prepData?.is_lunch_enabled ? (
                                    <div className="flex gap-2 text-sm print:text-black items-center">
                                        <div className="flex flex-col items-center">
                                            <span className="text-[8px] text-gray-500 uppercase print:text-gray-600">Lunch</span>
                                            {prepData?.is_locked ? (
                                                <span className="font-bold text-[#00FF94] print:text-black">{lunchForecast}</span>
                                            ) : (user?.role === 'director' || user?.role === 'admin' ? (
                                                <span className="font-bold text-white print:text-black">{lunchForecast}</span>
                                            ) : (
                                                <input type="number" value={lunchForecast} onChange={(e) => setLunchForecast(parseInt(e.target.value) || 0)} className="w-12 bg-transparent text-center font-bold border-b border-[#333] focus:border-[#C5A059] outline-none" />
                                            ))}
                                        </div>
                                        <span className="text-gray-600">+</span>
                                        <div className="flex flex-col items-center">
                                            <span className="text-[8px] text-gray-500 uppercase print:text-gray-600">Dinner</span>
                                            {prepData?.is_locked ? (
                                                <span className="font-bold text-[#00FF94] print:text-black">{dinnerForecast}</span>
                                            ) : (user?.role === 'director' || user?.role === 'admin' ? (
                                                <span className="font-bold text-white print:text-black">{dinnerForecast}</span>
                                            ) : (
                                                <input type="number" value={dinnerForecast} onChange={(e) => setDinnerForecast(parseInt(e.target.value) || 0)} className="w-12 bg-transparent text-center font-bold border-b border-[#333] focus:border-[#C5A059] outline-none" />
                                            ))}
                                        </div>
                                        <span className="text-gray-600">=</span>
                                        <span className="font-black text-xl">{lunchForecast + dinnerForecast}</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        {prepData?.is_locked ? (
                                            <span className="text-xl font-black text-[#00FF94] print:text-black">{dinnerForecast}</span>
                                        ) : (user?.role === 'director' || user?.role === 'admin' ? (
                                            <span className="text-xl font-black text-white px-2 py-1 print:text-black">{dinnerForecast}</span>
                                        ) : (
                                            <input type="number" value={dinnerForecast} onChange={(e) => setDinnerForecast(parseInt(e.target.value) || 0)} className="w-16 bg-transparent text-xl font-black text-center outline-none border-b border-[#333] focus:border-[#C5A059]" />
                                        ))}
                                    </div>
                                )}

                                {(!prepData?.is_locked && user?.role !== 'director' && user?.role !== 'admin') && (
                                    <button
                                        onClick={lockPrepPlan}
                                        title="Lock Forecast"
                                        className="ml-2 px-3 py-1 border rounded text-[10px] font-bold uppercase transition-colors bg-white/5 text-gray-300 border-white/10 hover:bg-[#00FF94]/20 hover:text-[#00FF94] hover:border-[#00FF94]/30 print:hidden"
                                    >
                                        Lock
                                    </button>
                                )}
                                {(prepData?.is_locked) && (
                                    <span title="Plan is Locked" className="ml-2 print:hidden">
                                        <ShieldCheck className="w-4 h-4 text-[#00FF94]" />
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="text-center px-4 border-r border-white/5 print:border-gray-200">
                            <span className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1 print:text-gray-600">Projected Cost/G</span>
                            <div className={`text-xl font-black print:text-black ${prepData?.predicted_cost_guest > (prepData?.target_cost_guest || 9.94) ? 'text-red-500' : 'text-[#00FF94]'}`}>
                                ${prepData?.predicted_cost_guest || '0.00'}
                            </div>
                        </div>
                        <div className="text-center px-4">
                            <span className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1 print:text-gray-600">Status</span>
                            <span className="text-xs font-bold text-[#00FF94] animate-pulse print:animate-none print:text-black">● LIVE OPS</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tactical Briefing */}
            {prepData?.tactical_briefing && (
                <div className="bg-[#C5A059]/5 border border-[#C5A059]/20 p-4 rounded-lg flex gap-4 items-start shadow-inner print:hidden">
                    <Zap className="w-6 h-6 text-[#C5A059] shrink-0" />
                    <div>
                        <h3 className="text-[10px] font-bold text-[#C5A059] uppercase tracking-[0.2em] mb-1">Pareto Optimization Briefing</h3>
                        <p className="text-sm text-gray-300 leading-relaxed font-medium">{prepData.tactical_briefing}</p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 print:block">

                {/* LEFT: SMART PREP (Operational Prep List) */}
                <div className="lg:col-span-12 xl:col-span-5 space-y-4 print:w-full print:block">
                    <div className="flex justify-between items-center px-2">
                        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            <ChefHat className="w-4 h-4" /> Shift Prep Requirements (+20% Buffer + Delivery)
                        </h2>
                        <button onClick={() => window.print()} className="text-[10px] text-gray-500 hover:text-white uppercase transition-colors flex items-center gap-1 print:hidden">
                            <Printer className="w-3 h-3" /> Print Guide
                        </button>
                    </div>

                    <div className="bg-[#1a1a1a] rounded-xl border border-white/5 overflow-hidden shadow-xl print:border-none print:shadow-none print:bg-transparent">
                        <div className="grid grid-cols-12 bg-[#252525] p-3 text-[10px] font-bold text-gray-500 uppercase tracking-tighter print:bg-gray-100 print:text-black print:border-b print:border-gray-300">
                            <div className="col-span-6">Protein Item</div>
                            <div className="col-span-3 text-right">Prep Qty</div>
                            <div className="col-span-3 text-right">Weight (Lbs)</div>
                        </div>
                        <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto print:max-h-none print:overflow-visible print:divide-gray-200">
                            {prepData?.prep_list?.map((item: any) => {
                                const isVillain = villains.some(v => item.protein.includes(v));
                                return (
                                    <div key={item.protein} className={`grid grid-cols-12 p-3 items-center group hover:bg-white/5 transition-colors ${isVillain ? 'bg-[#C5A059]/[0.02]' : ''}`}>
                                        <div className="col-span-6 flex items-center gap-3">
                                            {isVillain && <div className="w-1.5 h-1.5 rounded-full bg-[#C5A059] shadow-[0_0_8px_rgba(197,160,89,0.5)]"></div>}
                                            <div>
                                                <span className={`text-sm font-bold ${isVillain ? 'text-white' : 'text-gray-300 group-hover:text-white'}`}>{item.protein}</span>
                                                {isVillain && <span className="block text-[8px] text-[#C5A059] font-black uppercase tracking-widest">Villain</span>}
                                            </div>
                                        </div>
                                        <div className="col-span-3 text-right">
                                            <span className="text-lg font-black text-white font-mono">{Math.ceil(item.recommended_units)}</span>
                                            <span className="text-[10px] text-gray-600 block leading-none">{item.unit_name || 'Units'}</span>
                                        </div>
                                        <div className="col-span-3 text-right">
                                            <span className="text-sm font-bold text-gray-400 font-mono">{item.recommended_lbs}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* RIGHT: WASTE LOGGING (Operational Waste Terminal) */}
                <div className="lg:col-span-12 xl:col-span-7 space-y-4 print:hidden">
                    <div className="flex justify-between items-center px-2">
                        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            <Trash2 className="w-4 h-4" /> Shift Waste Recording
                        </h2>
                        {gateStatus?.today?.statusMessage && (
                            <span className="text-[10px] font-mono text-gray-500 uppercase">{gateStatus.today.statusMessage}</span>
                        )}
                    </div>

                    <div className="bg-[#1a1a1a] rounded-xl border border-white/5 p-6 shadow-xl min-h-[400px] flex flex-col">

                        {wasteItems.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-white/5 rounded-lg mb-6">
                                <Trash2 className="w-12 h-12 text-gray-800 mb-4" />
                                <p className="text-gray-500 mb-6">No waste recorded for this shift yet.</p>
                                {(user?.role !== 'director' && user?.role !== 'admin') && (
                                    <button
                                        onClick={addWasteItem}
                                        className="px-6 py-3 bg-[#C5A059] text-black font-black uppercase text-xs tracking-widest rounded hover:bg-[#d6b579] transition-all flex items-center gap-2 shadow-lg hover:shadow-[#C5A059]/20"
                                    >
                                        <Plus className="w-4 h-4" /> Start Shift Log
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="flex-1 space-y-3 mb-6">
                                {wasteItems.map((item, idx) => {
                                    const isVillain = villains.some(v => item.protein.includes(v));
                                    return (
                                        <div key={idx} className={`flex flex-col md:flex-row gap-4 p-4 rounded-lg bg-[#222] border transition-all ${isVillain ? 'border-[#C5A059]/30 border-l-4 border-l-[#C5A059]' : 'border-white/5'}`}>
                                            <div className="flex-1">
                                                <label className="text-[9px] font-bold text-gray-500 uppercase mb-1 block">Protein</label>
                                                <select
                                                    value={item.protein}
                                                    onChange={(e) => updateWasteItem(idx, 'protein', e.target.value)}
                                                    className="w-full bg-[#111] text-white border border-white/10 rounded p-2 text-sm outline-none focus:border-[#C5A059]"
                                                    disabled={user?.role === 'director' || user?.role === 'admin'}
                                                >
                                                    {proteins.map(p => (
                                                        <option key={p} value={p}>{p}</option>
                                                    ))}
                                                </select>
                                                {isVillain && (
                                                    <div className="mt-1 flex items-center gap-1 text-[9px] text-[#C5A059] font-bold uppercase tracking-wider">
                                                        <AlertTriangle className="w-3 h-3" /> Pareto Risk Item
                                                    </div>
                                                )}
                                            </div>
                                            <div className="w-full md:w-32">
                                                <label className="text-[9px] font-bold text-gray-500 uppercase mb-1 block">Weight (Lbs)</label>
                                                <input
                                                    type="number"
                                                    value={item.weight}
                                                    onChange={(e) => updateWasteItem(idx, 'weight', parseFloat(e.target.value) || 0)}
                                                    className="w-full bg-[#111] text-white border border-white/10 rounded p-2 text-sm outline-none focus:border-[#C5A059] font-mono"
                                                    disabled={user?.role === 'director' || user?.role === 'admin'}
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <label className="text-[9px] font-bold text-gray-500 uppercase mb-1 block">Reason</label>
                                                <select
                                                    value={item.reason}
                                                    onChange={(e) => updateWasteItem(idx, 'reason', e.target.value)}
                                                    className="w-full bg-[#111] text-white border border-white/10 rounded p-2 text-sm outline-none focus:border-[#C5A059]"
                                                    disabled={user?.role === 'director' || user?.role === 'admin'}
                                                >
                                                    {WASTE_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                                                </select>
                                            </div>
                                            {(user?.role !== 'director' && user?.role !== 'admin') && (
                                                <div className="flex items-end justify-end">
                                                    <button
                                                        onClick={() => removeWasteItem(idx)}
                                                        className="p-2.5 text-gray-600 hover:text-red-500 hover:bg-red-500/10 rounded transition-all"
                                                    >
                                                        <X className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                {(user?.role !== 'director' && user?.role !== 'admin') && (
                                    <button
                                        onClick={addWasteItem}
                                        className="w-full py-4 border-2 border-dashed border-white/5 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-all flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest"
                                    >
                                        <Plus className="w-4 h-4" /> Add Another Item
                                    </button>
                                )}
                            </div>
                        )}

                        {wasteItems.length > 0 && (
                            <div className="pt-6 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
                                <div className="text-left">
                                    <span className="text-[10px] text-gray-600 uppercase block mb-1">Total Shift Waste</span>
                                    <span className="text-2xl font-black text-white font-mono">
                                        {wasteItems.reduce((sum, item) => sum + (item.weight || 0), 0).toFixed(2)} <span className="text-xs font-normal text-gray-500">LBS</span>
                                    </span>
                                </div>
                                {(user?.role !== 'director' && user?.role !== 'admin') && (
                                    <button
                                        onClick={submitWaste}
                                        disabled={isSubmittingWaste}
                                        className="w-full md:w-auto px-10 py-4 bg-[#FF2A6D] text-white font-black uppercase text-sm tracking-widest rounded hover:bg-[#ff1b62] shadow-lg shadow-[#FF2A6D]/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                                    >
                                        {isSubmittingWaste ? 'RECORDING OPS...' : 'FINALIZE SHIFT WASTE'} <ArrowRight className="w-5 h-5" />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

import { useState, useEffect } from 'react';
import { Save, DollarSign, TrendingDown, TrendingUp, Loader2, ChevronLeft, ChevronRight, Lock, FileText, Camera, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';


export const WeeklyPriceInput = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [isProcessingOCR, setIsProcessingOCR] = useState(false);

    // State for calculated weighted averages
    const [weightedAverages, setWeightedAverages] = useState<Record<string, number>>({});

    // Mock Data State - In real app, fetch from DB based on selectedDate
    const [prices, setPrices] = useState([
        { id: 1, item: 'Picanha', current: 9.14, last: 9.00, unit: 'lb' },
        { id: 2, item: 'Fraldinha/Flank Steak', current: 8.24, last: 8.00, unit: 'lb' },
        { id: 3, item: 'Tri-Tip', current: 5.26, last: 5.20, unit: 'lb' },
        { id: 4, item: 'Filet Mignon', current: 9.50, last: 9.30, unit: 'lb' },
        { id: 5, item: 'Beef Ribs', current: 8.36, last: 8.20, unit: 'lb' },
        { id: 6, item: 'Lamb Chops', current: 13.91, last: 13.50, unit: 'lb' },
        { id: 13, item: 'Sausage', current: 3.16, last: 3.10, unit: 'lb' }
    ]);

    const handlePriceChange = (id: number, newVal: string) => {
        setPrices(prices.map(p => p.id === id ? { ...p, current: parseFloat(newVal) || 0 } : p));
    };

    const getWeekRange = (baseDate: Date) => {
        const currentDay = baseDate.getDay();
        const diffToMon = currentDay === 0 ? -6 : 1 - currentDay;
        const monday = new Date(baseDate);
        monday.setDate(baseDate.getDate() + diffToMon);
        monday.setHours(0, 0, 0, 0);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        sunday.setHours(23, 59, 59, 999);
        const format = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return { text: `${format(monday)} - ${format(sunday)}`, start: monday, end: sunday };
    };

    const weekRange = getWeekRange(selectedDate);

    const fetchAverages = async () => {
        try {
            const response = await fetch(`/api/v1/purchases/weighted-averages?start=${weekRange.start.toISOString()}&end=${weekRange.end.toISOString()}`, {
                headers: { 'Authorization': `Bearer ${user?.token}` }
            });
            const data = await response.json();
            if (data.success) {
                const map: Record<string, number> = {};
                data.averages.forEach((a: any) => {
                    map[a.item_name] = a.weighted_average;
                });
                setWeightedAverages(map);

                // Update prices state if data exists
                setPrices(prev => prev.map(p => {
                    if (map[p.item]) return { ...p, current: parseFloat(map[p.item].toFixed(2)) };
                    return p;
                }));
            }
        } catch (error) {
            console.error('Failed to fetch averages', error);
        }
    };

    useEffect(() => {
        fetchAverages();
    }, [selectedDate]);

    const handleInvoiceOCR = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsProcessingOCR(true);
        const formData = new FormData();
        formData.append('invoice', file);

        try {
            const response = await fetch('/api/v1/purchases/process-invoice-ocr', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${user?.token}` },
                body: formData
            });

            const result = await response.json();
            if (result.success) {
                fetchAverages(); // Refresh values
            }
        } catch (error) {
            console.error('OCR Failed', error);
        } finally {
            setIsProcessingOCR(false);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        await new Promise(r => setTimeout(r, 1000));
        setLoading(false);
        alert('Weekly Prices Updated!');
    };

    const isLocked = weekRange.end < new Date();

    const navigateWeek = (direction: 'prev' | 'next') => {
        const newDate = new Date(selectedDate);
        newDate.setDate(selectedDate.getDate() + (direction === 'next' ? 7 : -7));
        setSelectedDate(newDate);
    };

    return (
        <div className="max-w-5xl mx-auto p-4">
            <div className="flex justify-between items-center mb-12">
                <div>
                    <h1 className="text-4xl font-serif font-bold text-white mb-2 flex items-center gap-4">
                        <DollarSign className="w-10 h-10 text-brand-gold bg-brand-gold/10 p-2 rounded-full" />
                        Weighted Protein Pricing
                    </h1>
                    <p className="text-gray-500 font-mono uppercase tracking-widest text-xs italic">
                        v2.5.26-ALPHA Intelligence Engine Active
                    </p>
                </div>
                <div className="flex flex-col items-end gap-3">
                    <div className="bg-[#1a1a1a] px-5 py-3 rounded-sm border border-white/10 text-right flex items-center gap-6 shadow-2xl">
                        <button onClick={() => navigateWeek('prev')} className="p-2 hover:bg-white/5 rounded-full text-gray-400 hover:text-white transition-all">
                            <ChevronLeft className="w-6 h-6" />
                        </button>
                        <div>
                            <div className="text-[10px] text-gray-500 uppercase font-bold tracking-tighter">Effective Week</div>
                            <div className="text-white font-mono text-lg flex items-center gap-2">
                                {weekRange.text}
                                {isLocked && <Lock className="w-4 h-4 text-red-500" />}
                            </div>
                        </div>
                        <button onClick={() => navigateWeek('next')} className="p-2 hover:bg-white/5 rounded-full text-gray-400 hover:text-white transition-all">
                            <ChevronRight className="w-6 h-6" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                {/* OCR Invoice Card */}
                <div className="lg:col-span-1 bg-[#1a1a1a] border border-[#333] rounded-sm p-6 relative group overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <FileText className="w-24 h-24" />
                    </div>
                    <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                        <Camera className="w-5 h-5 text-brand-gold" />
                        Invoice Intelligence (OCR)
                    </h3>
                    <p className="text-gray-500 text-sm mb-6">
                        Upload invoices from multiple deliveries. System detects weights and prices automatically.
                    </p>

                    <label className="w-full flex flex-col items-center justify-center h-32 border-2 border-dashed border-[#333] hover:border-brand-gold/50 transition-all rounded-sm bg-black/40 cursor-pointer group/upload">
                        <input type="file" className="hidden" onChange={handleInvoiceOCR} disabled={isProcessingOCR} />
                        {isProcessingOCR ? (
                            <Loader2 className="w-8 h-8 text-brand-gold animate-spin" />
                        ) : (
                            <>
                                <Plus className="w-8 h-8 text-gray-600 group-hover/upload:text-brand-gold transition-all" />
                                <span className="text-[10px] font-mono text-gray-500 mt-2 uppercase tracking-widest">Scan Invoice (JPG/PDF)</span>
                            </>
                        )}
                    </label>

                    <div className="mt-6 flex flex-col gap-2">
                        <div className="flex justify-between text-[10px] font-mono text-gray-600">
                            <span>Last Sync:</span>
                            <span>{new Date().toLocaleTimeString()}</span>
                        </div>
                    </div>
                </div>

                {/* Market Intelligence Table */}
                <div className="lg:col-span-2 bg-[#1a1a1a] border border-[#333] rounded-sm overflow-hidden flex flex-col shadow-2xl">
                    <div className="p-5 border-b border-[#333] bg-black/40 flex justify-between items-center">
                        <h3 className="font-bold text-white flex items-center gap-2 uppercase tracking-widest text-xs">
                            <TrendingUp className="w-4 h-4 text-green-500" />
                            Protein Market Cost (Weighted Ave)
                        </h3>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                <span className="text-[9px] text-gray-500 uppercase font-mono">Weighted Value</span>
                            </div>
                        </div>
                    </div>

                    <div className="divide-y divide-[#333] overflow-y-auto max-h-[500px]">
                        <div className="grid grid-cols-12 gap-4 p-5 text-[10px] font-bold text-gray-500 uppercase tracking-widest bg-black/20">
                            <div className="col-span-6">Protein Description</div>
                            <div className="col-span-3 text-right">Cost History</div>
                            <div className="col-span-3 text-right">Market Price ($)</div>
                        </div>

                        {prices.map((item) => {
                            const hasWeighted = weightedAverages[item.item] !== undefined;

                            return (
                                <div key={item.id} className="grid grid-cols-12 gap-4 p-5 items-center hover:bg-white/5 transition-colors group">
                                    <div className="col-span-6">
                                        <div className="font-bold text-white group-hover:text-brand-gold transition-colors">{item.item}</div>
                                        <div className="text-[9px] text-gray-500 font-mono mt-1">STANDARD CALCULATION: {item.unit}</div>
                                    </div>
                                    <div className="col-span-3 text-right">
                                        <div className="text-gray-500 font-mono text-xs">${item.last.toFixed(2)}</div>
                                        <div className="text-[9px] text-gray-600 uppercase">Last Week</div>
                                    </div>
                                    <div className="col-span-3 flex flex-col items-end">
                                        <div className="relative mb-1">
                                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-600 text-[10px]">$</span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={item.current}
                                                onChange={(e) => handlePriceChange(item.id, e.target.value)}
                                                disabled={isLocked}
                                                className={`w-28 bg-[#1a1a1a] border border-[#333] rounded-sm py-2 pl-6 pr-2 text-right text-white font-mono text-sm outline-none transition-all ${isLocked ? 'opacity-50 cursor-not-allowed' : 'focus:border-brand-gold focus:ring-1 focus:ring-brand-gold/20'}`}
                                            />
                                        </div>
                                        {hasWeighted && (
                                            <span className="text-[8px] px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded-full font-bold uppercase animate-pulse">
                                                Weighted CPM Applied
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="p-5 border-t border-[#333] bg-black/40 flex justify-end">
                        <button
                            onClick={handleSave}
                            disabled={loading || isLocked}
                            className="bg-brand-gold hover:bg-yellow-500 text-black font-bold py-3 px-10 rounded-sm shadow-xl flex items-center gap-2 transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 uppercase text-xs tracking-widest"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Update Master Ledger
                        </button>
                    </div>
                </div>
            </div>

            {/* Visual Intelligence Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-[#1a1a1a] p-6 border border-[#333] rounded-sm">
                    <h3 className="text-white font-bold mb-4 uppercase tracking-widest text-xs flex items-center gap-2">
                        <TrendingDown className="w-4 h-4 text-green-500" />
                        Cost Impact Summary
                    </h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500">Weekly Price Drift</span>
                            <span className="text-red-400 font-mono">+1.22%</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500">Projected Margin Loss</span>
                            <span className="text-white font-mono">-$2,140</span>
                        </div>
                        <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-red-500" style={{ width: '45%' }}></div>
                        </div>
                    </div>
                </div>

                <div className="bg-[#1a1a1a] p-6 border border-[#333] rounded-sm">
                    <h3 className="text-white font-bold mb-4 uppercase tracking-widest text-xs flex items-center gap-2">
                        <Lock className="w-4 h-4 text-brand-gold" />
                        Accountability Status
                    </h3>
                    <div className="flex items-center gap-4 text-xs">
                        <div className="p-3 bg-[#00FF94]/10 rounded-full">
                            <TrendingUp className="w-5 h-5 text-[#00FF94]" />
                        </div>
                        <div>
                            <p className="text-white font-bold">Ledger Verified</p>
                            <p className="text-gray-500 font-mono italic uppercase text-[9px]">Market prices applied to all waste calculations.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};


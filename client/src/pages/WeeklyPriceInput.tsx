import { useState, useEffect } from 'react';
import { Save, DollarSign, TrendingDown, TrendingUp, Loader2, ChevronLeft, ChevronRight, Lock, FileText, Camera, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';


export const WeeklyPriceInput = () => {
    const { user } = useAuth();
    const { t } = useLanguage();
    const [loading, setLoading] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [isProcessingOCR, setIsProcessingOCR] = useState(false);

    // State for calculated weighted averages
    const [weightedAverages, setWeightedAverages] = useState<Record<string, number>>({});

    // Batch Scan Result State (Duplicate/Success Summary)
    const [scanResult, setScanResult] = useState<{ total: number; successful: number; duplicates: number } | null>(null);

    // Mock Data State - In real app, fetch from DB based on selectedDate
    const [prices, setPrices] = useState([
        { id: 1, item: 'Picanha', current: 9.14, last: 9.00, unit: 'lb' },
        { id: 2, item: 'Fraldinha/Flank Steak', current: 8.24, last: 8.00, unit: 'lb' },
        { id: 3, item: 'Tri-Tip', current: 5.26, last: 5.20, unit: 'lb' },
        { id: 4, item: 'Filet Mignon', current: 9.50, last: 9.30, unit: 'lb' },
        { id: 5, item: 'Beef Ribs', current: 8.36, last: 8.20, unit: 'lb' },
        { id: 6, item: 'Lamb Chops', current: 13.91, last: 13.50, unit: 'lb' },
        { id: 13, item: 'Sausage', current: 3.16, last: 3.10, unit: 'lb' },
        { id: 14, item: 'Bacon', current: 2.50, last: 2.45, unit: 'lb' }
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
        const format = (d: Date) => d.toLocaleDateString(t('nav_dashboard') === 'Painel' ? 'pt-BR' : 'en-US', { month: 'short', day: 'numeric' });
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

    const [pendingInvoices, setPendingInvoices] = useState<any[]>([]);
    const [isReviewOpen, setIsReviewOpen] = useState(false);
    const [isDuplicate, setIsDuplicate] = useState(false);
    const [mapping, setMapping] = useState<Record<string, string>>({});

    // System Item Options for Mapping
    const SYSTEM_ITEMS = [
        'Picanha', 'Fraldinha/Flank Steak', 'Tri-Tip', 'Filet Mignon', 'Beef Ribs',
        'Lamb Chops', 'Leg of Lamb', 'Lamb Picanha', 'Sausage', 'Chicken Drumstick',
        'Chicken Breast', 'Pork Ribs', 'Pork Loin', 'Shrimp', 'Bacon'
    ];

    const handleInvoiceOCR = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        setIsProcessingOCR(true);
        const files = Array.from(e.target.files);
        const allResults: any[] = [];
        let duplicateDetected = false;

        try {
            let skippedCount = 0;

            // Process files sequentially to avoid overriding state too quickly
            for (const file of files) {
                const formData = new FormData();
                formData.append('invoice', file);

                const response = await fetch('/api/v1/purchases/process-invoice-ocr', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${user?.token}`
                    },
                    body: formData
                });

                const result = await response.json();
                if (result.success) {
                    if (result.is_duplicate) {
                        skippedCount++;
                        console.log(`Skipping duplicate invoice: ${result.invoice_number}`);
                    } else {
                        allResults.push(...result.results);
                    }
                }
            }

            if (allResults.length > 0 || skippedCount > 0) {
                // If we have successful results, open the review modal
                if (allResults.length > 0) {
                    setPendingInvoices(allResults);
                    setIsDuplicate(false); // We filtered them out, so what remains is valid
                    setIsReviewOpen(true);

                    // Pre-fill mapping for known items
                    const initialMap: Record<string, string> = {};
                    allResults.forEach((inv: any) => {
                        const match = SYSTEM_ITEMS.find(sys => sys.toLowerCase() === inv.detected_item.toLowerCase())
                            || SYSTEM_ITEMS.find(sys => inv.raw_text.toLowerCase().includes(sys.toLowerCase()));
                        if (match) initialMap[inv.id] = match;
                        else if (inv.detected_item === 'Beef Sirloin Flap') initialMap[inv.id] = 'Fraldinha/Flank Steak';
                    });
                    setMapping(initialMap);
                }

                // If we have duplicates, show the result modal (even if we also opened review)
                if (skippedCount > 0) {
                    setScanResult({
                        total: files.length,
                        successful: allResults.length,
                        duplicates: skippedCount
                    });
                }
            }
        } catch (error) {
            console.error('OCR Batch Failed', error);
        } finally {
            setIsProcessingOCR(false);
            // Reset input so same files can be selected again if needed
            e.target.value = '';
        }
    };

    const handleConfirmInvoices = async () => {
        setLoading(true);
        try {
            // Prepare payload with mapped names
            const payload = pendingInvoices.map(inv => ({
                ...inv,
                detected_item: mapping[inv.id] || inv.detected_item // Use user mapping or fallback
            }));

            const response = await fetch('/api/v1/purchases/confirm', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user?.token}`
                },
                body: JSON.stringify({ invoices: payload })
            });

            const result = await response.json();
            if (result.success) {
                setIsReviewOpen(false);
                setPendingInvoices([]);
                fetchAverages(); // Refresh main table
                alert(t('ocr_success_saved'));
            }
        } catch (error) {
            console.error('Save Failed', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        await new Promise(r => setTimeout(r, 1000));
        setLoading(false);
        alert(t('price_updated_alert'));
    };

    const isLocked = weekRange.end < new Date();

    const navigateWeek = (direction: 'prev' | 'next') => {
        const newDate = new Date(selectedDate);
        newDate.setDate(selectedDate.getDate() + (direction === 'next' ? 7 : -7));
        setSelectedDate(newDate);
    };

    return (
        <div className="max-w-5xl mx-auto p-4 relative">
            {/* Review Modal */}
            {isReviewOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#1a1a1a] border border-brand-gold rounded-sm w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="p-6 border-b border-[#333] flex justify-between items-center sticky top-0 bg-[#1a1a1a] z-10">
                            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                                <FileText className="w-6 h-6 text-brand-gold" />
                                Review Invoice Data
                            </h2>
                            <button onClick={() => setIsReviewOpen(false)} className="text-gray-500 hover:text-white">Close</button>
                        </div>

                        {isDuplicate && (
                            <div className="bg-red-500/10 border border-red-500/50 p-4 mx-6 mt-4 flex items-center gap-3 rounded-sm">
                                <Lock className="w-5 h-5 text-red-500" />
                                <div>
                                    <h4 className="text-red-500 font-bold text-sm uppercase tracking-widest">Duplicate Invoice Detected</h4>
                                    <p className="text-gray-400 text-xs">This invoice number has already been processed for this store. Confirmation is locked.</p>
                                </div>
                            </div>
                        )}

                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-12 gap-4 text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 px-2">
                                <div className="col-span-4">Raw Invoice Text</div>
                                <div className="col-span-3">System Mapping</div>
                                <div className="col-span-2 text-right">Qty (LBS)</div>
                                <div className="col-span-2 text-right">Price/Lb</div>
                                <div className="col-span-1"></div>
                            </div>

                            {pendingInvoices.map((inv) => (
                                <div key={inv.id} className="grid grid-cols-12 gap-4 items-center bg-[#222] p-3 rounded-sm border border-[#333]">
                                    <div className="col-span-4">
                                        <div className="text-white font-mono text-xs truncate" title={inv.raw_text}>{inv.raw_text}</div>
                                        <div className="text-[10px] text-gray-500 mt-1">Detected: {inv.detected_item}</div>
                                    </div>
                                    <div className="col-span-3">
                                        <select
                                            value={mapping[inv.id] || ''}
                                            onChange={(e) => setMapping({ ...mapping, [inv.id]: e.target.value })}
                                            className="w-full bg-[#111] border border-[#444] text-white text-xs p-2 rounded-sm outline-none focus:border-brand-gold"
                                        >
                                            <option value="">-- Select Item --</option>
                                            {SYSTEM_ITEMS.map(item => (
                                                <option key={item} value={item}>{item}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="col-span-2">
                                        <input
                                            type="number"
                                            defaultValue={inv.quantity}
                                            onChange={(e) => {
                                                const val = parseFloat(e.target.value);
                                                setPendingInvoices(prev => prev.map(p => p.id === inv.id ? { ...p, quantity: val } : p));
                                            }}
                                            className="w-full bg-[#111] border border-[#444] text-white text-right text-xs p-2 rounded-sm"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <input
                                            type="number"
                                            defaultValue={inv.price_per_lb}
                                            onChange={(e) => {
                                                const val = parseFloat(e.target.value);
                                                setPendingInvoices(prev => prev.map(p => p.id === inv.id ? { ...p, price_per_lb: val } : p));
                                            }}
                                            className="w-full bg-[#111] border border-[#444] text-white text-right text-xs p-2 rounded-sm"
                                        />
                                    </div>
                                    <div className="col-span-1 flex justify-center">
                                        {mapping[inv.id] ? (
                                            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" title="Mapped"></div>
                                        ) : (
                                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" title="Mapping Required"></div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-6 border-t border-[#333] bg-[#222] flex justify-end gap-3 sticky bottom-0">
                            <button
                                onClick={() => setIsReviewOpen(false)}
                                className="px-6 py-3 rounded-sm border border-[#444] text-gray-300 hover:text-white hover:bg-[#333] transition-all text-xs font-bold uppercase tracking-widest"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmInvoices}
                                disabled={isDuplicate || pendingInvoices.some(inv => !mapping[inv.id]) || loading}
                                className={`px-8 py-3 rounded-sm font-bold text-xs uppercase tracking-widest shadow-lg flex items-center gap-2 transition-all 
                                    ${isDuplicate
                                        ? 'bg-red-900/50 text-red-400 cursor-not-allowed border border-red-900'
                                        : 'bg-brand-gold text-black hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed'
                                    }`}
                            >
                                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                {isDuplicate ? 'Locked' : 'Confirm & Save to Ledger'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex justify-between items-center mb-12">
                <div>
                    <h1 className="text-4xl font-serif font-bold text-white mb-2 flex items-center gap-4">
                        <DollarSign className="w-10 h-10 text-brand-gold bg-brand-gold/10 p-2 rounded-full" />
                        {t('price_title')}
                    </h1>
                    <p className="text-gray-500 font-mono uppercase tracking-widest text-xs italic">
                        v2.6.4-OCR - {t('price_subtitle')}
                    </p>
                </div>
                <div className="flex flex-col items-end gap-3">
                    <div className="bg-[#1a1a1a] px-5 py-3 rounded-sm border border-white/10 text-right flex items-center gap-6 shadow-2xl">
                        <button onClick={() => navigateWeek('prev')} className="p-2 hover:bg-white/5 rounded-full text-gray-400 hover:text-white transition-all">
                            <ChevronLeft className="w-6 h-6" />
                        </button>
                        <div>
                            <div className="text-[10px] text-gray-500 uppercase font-bold tracking-tighter">{t('price_effective_week')}</div>
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
                        {t('price_ocr_title')}
                    </h3>
                    <p className="text-gray-500 text-sm mb-6">
                        {t('price_ocr_desc')}
                    </p>

                    <label className="w-full flex flex-col items-center justify-center h-32 border-2 border-dashed border-[#333] hover:border-brand-gold/50 transition-all rounded-sm bg-black/40 cursor-pointer group/upload">
                        <input type="file" multiple className="hidden" onChange={handleInvoiceOCR} disabled={isProcessingOCR} />
                        {isProcessingOCR ? (
                            <Loader2 className="w-8 h-8 text-brand-gold animate-spin" />
                        ) : (
                            <>
                                <Plus className="w-8 h-8 text-gray-600 group-hover/upload:text-brand-gold transition-all" />
                                <span className="text-[10px] font-mono text-gray-500 mt-2 uppercase tracking-widest">{t('price_scan_invoice')}</span>
                            </>
                        )}
                    </label>

                    <div className="mt-6 flex flex-col gap-2">
                        <div className="flex justify-between text-[10px] font-mono text-gray-600">
                            <span>{t('price_last_sync')}:</span>
                            <span>{new Date().toLocaleTimeString()}</span>
                        </div>
                    </div>
                </div>

                {/* Market Intelligence Table */}
                <div className="lg:col-span-2 bg-[#1a1a1a] border border-[#333] rounded-sm overflow-hidden flex flex-col shadow-2xl">
                    <div className="p-5 border-b border-[#333] bg-black/40 flex justify-between items-center">
                        <h3 className="font-bold text-white flex items-center gap-2 uppercase tracking-widest text-xs">
                            <TrendingUp className="w-4 h-4 text-green-500" />
                            {t('price_market_cost')}
                        </h3>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                <span className="text-[9px] text-gray-500 uppercase font-mono">{t('price_weighted_val')}</span>
                            </div>
                        </div>
                    </div>

                    <div className="divide-y divide-[#333] overflow-y-auto max-h-[500px]">
                        <div className="grid grid-cols-12 gap-4 p-5 text-[10px] font-bold text-gray-500 uppercase tracking-widest bg-black/20">
                            <div className="col-span-6">{t('price_protein_desc')}</div>
                            <div className="col-span-3 text-right">{t('price_cost_history')}</div>
                            <div className="col-span-3 text-right">{t('price_market_price')}</div>
                        </div>

                        {prices.map((item) => {
                            const hasWeighted = weightedAverages[item.item] !== undefined;

                            return (
                                <div key={item.id} className="grid grid-cols-12 gap-4 p-5 items-center hover:bg-white/5 transition-colors group">
                                    <div className="col-span-6">
                                        <div className="font-bold text-white group-hover:text-brand-gold transition-colors">{t(`item_${item.item.toLowerCase().replace(/ /g, '_').split('/')[0]}`)}</div>
                                        <div className="text-[9px] text-gray-500 font-mono mt-1">{t('price_standard_calc')}: {item.unit}</div>
                                    </div>
                                    <div className="col-span-3 text-right">
                                        <div className="text-gray-500 font-mono text-xs">${item.last.toFixed(2)}</div>
                                        <div className="text-[9px] text-gray-600 uppercase">{t('price_last_week')}</div>
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
                                                {t('price_weighted_applied')}
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
                            {t('price_update_ledger')}
                        </button>
                    </div>
                </div>
            </div>

            {/* Visual Intelligence Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-[#1a1a1a] p-6 border border-[#333] rounded-sm">
                    <h3 className="text-white font-bold mb-4 uppercase tracking-widest text-xs flex items-center gap-2">
                        <TrendingDown className="w-4 h-4 text-green-500" />
                        {t('price_cost_impact')}
                    </h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500">{t('price_weekly_drift')}</span>
                            <span className="text-red-400 font-mono">+1.22%</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500">{t('price_proj_margin_loss')}</span>
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
                        {t('price_accountability')}
                    </h3>
                    <div className="flex items-center gap-4 text-xs">
                        <div className="p-3 bg-[#00FF94]/10 rounded-full">
                            <TrendingUp className="w-5 h-5 text-[#00FF94]" />
                        </div>
                        <div>
                            <p className="text-white font-bold">{t('price_ledger_verified')}</p>
                            <p className="text-gray-500 font-mono italic uppercase text-[9px]">{t('price_market_verified_desc')}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
            </div >

    {/* Duplicate/Batch Result Modal */ }
{
    scanResult && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="bg-[#1a1a1a] border border-[#333] rounded-lg shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
                <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-brand-gold/20 flex items-center justify-center">
                        <FileText className="w-6 h-6 text-brand-gold" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white">Upload Complete</h3>
                        <p className="text-gray-400 text-sm">Batch processing summary</p>
                    </div>
                </div>

                <div className="space-y-3 mb-6">
                    <div className="flex justify-between items-center p-3 bg-[#252525] rounded border border-[#333]">
                        <span className="text-gray-300">Total Files</span>
                        <span className="font-mono font-bold text-white">{scanResult.total}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-[#252525] rounded border border-[#333]">
                        <span className="text-[#00FF94]">Processed Successfully</span>
                        <span className="font-mono font-bold text-[#00FF94]">{scanResult.successful}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-[#252525] rounded border border-red-500/30">
                        <span className="text-red-400">Duplicates Skipped</span>
                        <span className="font-mono font-bold text-red-400">{scanResult.duplicates}</span>
                    </div>
                </div>

                <button
                    onClick={() => setScanResult(null)}
                    className="w-full py-3 bg-brand-gold hover:bg-yellow-500 text-black font-bold rounded shadow-lg transition-all active:scale-95 uppercase tracking-widest text-sm"
                >
                    Acknowledge
                </button>
            </div>
        </div>
    )
}
        </div >
    );
};


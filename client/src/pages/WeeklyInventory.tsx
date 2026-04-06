import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ShieldAlert, CheckCircle2, AlertTriangle, Scale, ArrowRight, Lock, Wifi, WifiOff, RefreshCw, ScanLine, Scan, Camera, X, Maximize, AlertCircle } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { useOfflineInventory } from '../hooks/useOfflineInventory';
import { useAuth } from '../context/AuthContext';

interface ProteinItem {
    id: string;
    name: string;
    expected: number;
    unit: string;
}

// Global fallback if offline and no cache
const DEFAULT_PROTEIN_LIST: ProteinItem[] = [
    { id: 'Picanha', name: 'Picanha', expected: 156.5, unit: 'Lbs' },
    { id: 'Filet Mignon', name: 'Filet Mignon', expected: 70.2, unit: 'Lbs' },
    { id: 'Beef Ribs', name: 'Beef Ribs', expected: 30.5, unit: 'Lbs' },
    { id: 'Pork Ribs', name: 'Pork Ribs', expected: 42.0, unit: 'Lbs' },
    { id: 'Pork Loin', name: 'Pork Loin', expected: 25.0, unit: 'Lbs' },
    { id: 'Chicken Drumstick', name: 'Chicken Drumstick', expected: 55.0, unit: 'Lbs' },
    { id: 'Chicken Breast', name: 'Chicken Breast', expected: 60.0, unit: 'Lbs' },
    { id: 'Lamb Chops', name: 'Lamb Chops', expected: 12.5, unit: 'Lbs' },
    { id: 'Sausage', name: 'Sausage', expected: 22.0, unit: 'Lbs' }
];

// --- Web Audio API Beep System ---
// Unlocks on first user interaction to ensure iOS Safari playback
let audioCtx: AudioContext | null = null;
const initAudio = () => {
    if (!audioCtx) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
            audioCtx = new AudioContextClass();
            if (audioCtx.state === 'suspended') {
                audioCtx.resume().catch(() => { });
            }
        }
    }
};

if (typeof window !== 'undefined') {
    window.addEventListener('touchstart', initAudio, { once: true });
    window.addEventListener('click', initAudio, { once: true });
}

export const playBeep = (type: 'success' | 'warning' | 'error') => {
    if (!audioCtx) return;
    try {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        const now = audioCtx.currentTime;
        if (type === 'success') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, now);
            osc.frequency.exponentialRampToValueAtTime(1760, now + 0.1);
            gain.gain.setValueAtTime(1, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
            osc.start(now);
            osc.stop(now + 0.15);
        } else if (type === 'error') {
            osc.type = 'sawtooth';
            // Low buzz
            osc.frequency.setValueAtTime(300, now);
            osc.frequency.setValueAtTime(250, now + 0.1);
            gain.gain.setValueAtTime(1, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            osc.start(now);
            osc.stop(now + 0.3);
        } else if (type === 'warning') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(500, now);
            gain.gain.setValueAtTime(1, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
            osc.start(now);
            osc.stop(now + 0.2);
        }
    } catch (e) { console.error('Beep sound error:', e); }
};


export const WeeklyInventory = () => {

    const { user, selectedCompany } = useAuth();
    const { isOnline, hasPendingSync, isSyncing, queueForSync } = useOfflineInventory();
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [dynamicProteinList, setDynamicProteinList] = useState<ProteinItem[]>(DEFAULT_PROTEIN_LIST);
    const [lastScanned, setLastScanned] = useState<{ name: string, weight: number, status: string } | null>(null);

    // Cart System
    const [scannedItems, setScannedItems] = useState<{ id: string, name: string, weight: number, isManual: boolean }[]>([]);
    const [showManualMenu, setShowManualMenu] = useState(false);
    const [manualProtein, setManualProtein] = useState('');
    const [manualWeight, setManualWeight] = useState('');
    
    // Scanner UI States
    const [barcode, setBarcode] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const fetchProteins = async () => {
            try {
                const headers: HeadersInit = { 'Authorization': `Bearer ${user?.token}` };
                if (selectedCompany) {
                    headers['X-Company-Id'] = selectedCompany;
                }

                const res = await fetch(`${(import.meta as any).env?.VITE_API_URL || ''}/api/v1/dashboard/settings/company-products`, { headers });

                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data) && data.length > 0) {
                        const list = data.map((p: any) => ({
                            id: p.name,
                            name: p.name,
                            expected: p.name.includes('Picanha') ? 150.5 : (p.name.includes('Filet') ? 70.2 : 50.0), // Rough mock target generator
                            unit: p.unit_of_measure || 'Lbs'
                        }));
                        setDynamicProteinList(list);
                    }
                }
            } catch (error) {
                console.error('Failed to load dynamic proteins for inventory', error);
            }
        };
        fetchProteins();
    }, [user, selectedCompany]);


    const handleBarcodeScanned = useCallback((barcodeString: string) => {
        // Minimal anti-bounce / anti-duplication
        if (!window.sessionStorage.getItem('scannedBarcodes')) {
            window.sessionStorage.setItem('scannedBarcodes', JSON.stringify([]));
        }
        const scannedList = JSON.parse(window.sessionStorage.getItem('scannedBarcodes') || '[]');

        if (scannedList.includes(barcodeString)) {
            // Already scanned in this session
            if (lastScanned?.status !== 'duplicate') {
                setLastScanned({ name: 'Unknown', weight: 0, status: 'duplicate' });
                if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
                playBeep('warning');
                setTimeout(() => setLastScanned(null), 3000);
            }
            return;
        }

        scannedList.push(barcodeString);
        window.sessionStorage.setItem('scannedBarcodes', JSON.stringify(scannedList));

        // GS1-128 Parsing Logic for Brasa Meat Tracker
        // Remove parens, spaces, and FNC1 invisible chars from raw scanner output
        const cleanBarcode = barcodeString.replace(/[\(\)\s\u001D]/g, '');

        let parsedWeight = 0;
        let matchedProtein = null;

        // Extract weight using GS1 Application Identifiers
        // 310n (Net Weight in Kg) or 320n (Net Weight in Lbs)
        // Group 1: 310 or 320 | Group 2: decimals (0-5) | Group 3: 6 digits raw weight
        const weightMatch = cleanBarcode.match(/(310|320)(\d)(\d{6})/);
        if (weightMatch) {
            const isLbs = weightMatch[1] === '320';
            const decimals = parseInt(weightMatch[2], 10);
            const rawWeight = parseInt(weightMatch[3], 10);

            let weight = rawWeight / Math.pow(10, decimals);

            if (!isLbs) {
                // System runs entirely on Lbs -> dynamically convert Kg to Lbs
                weight = weight * 2.20462;
            }
            // Round to 2 decimal places to match operational scale accuracy
            parsedWeight = parseFloat(weight.toFixed(2));
        } else {
            // Fallback for pitch demo barcodes
            const demoWeightMatch = cleanBarcode.match(/W(\d{4})/);
            if (demoWeightMatch) {
                parsedWeight = parseInt(demoWeightMatch[1], 10) / 100;
            } else {
                // New Zealand Lamb Rack (Taylor Preston) specific fixed-length pattern
                const customSyscoMatch = cleanBarcode.match(/^(\d{8})(\d{4})(\d{10})(.+)$/);
                const nzProprietaryMatch = cleanBarcode.match(/^(\d{8})(\d{4})(00\d{2})(\d{6})$/);
                const weightMatchGroup = customSyscoMatch || nzProprietaryMatch;
                
                if (weightMatchGroup) {
                    const rawKg = parseInt(weightMatchGroup[2], 10) / 100;
                    const lbs = rawKg * 2.20462;
                    parsedWeight = parseFloat(lbs.toFixed(2));
                }
            }
        }

        // Map GTIN to Protein List (Simulating actual product DB lookup)
        // Including real GTINs from actual US Foods/JBS boxes
        if (cleanBarcode.includes('PICANHA') || cleanBarcode.includes('01900001') || cleanBarcode.includes('90079338217464') || cleanBarcode.includes('90076338888477')) {
            // JBS Top Sirloin Butt Cap => Picanha
            matchedProtein = dynamicProteinList.find(p => p.name.includes('Picanha'));
        } else if (cleanBarcode.includes('FRALDINHA') || cleanBarcode.includes('01900003') || cleanBarcode.includes('90076338888514') || cleanBarcode.includes('90627577091328')) {
            matchedProtein = dynamicProteinList.find(p => p.name.includes('Fraldinha') || p.name.includes('Flap'));
        } else if (cleanBarcode.includes('TRITIP') || cleanBarcode.includes('01900004')) {
            matchedProtein = dynamicProteinList.find(p => p.name.includes('Tri-Tip'));
        } else if (cleanBarcode.includes('90758188398912')) {
            // US Foods Beef Tenderloin PSMO => Filet Mignon
            matchedProtein = dynamicProteinList.find(p => p.name.includes('Filet Mignon') || p.name.includes('Tenderloin'));
        } else if (cleanBarcode.includes('90627577078145')) {
            // Clear River Farms Beef Rib Bone In => Beef Ribs
            matchedProtein = dynamicProteinList.find(p => p.name.includes('Beef Ribs'));
        } else if ((cleanBarcode.length === 22 || cleanBarcode.match(/^(\d{8})(\d{4})(00\d{2})/)) && parsedWeight > 0) {
            // The Taylor Preston Lamb Racks (based on length and generic Lamb Chops grouping)
            matchedProtein = dynamicProteinList.find(p => p.name.includes('Lamb')); // Lamb Chops
        } else if (parsedWeight > 0) {
            // Unmapped product scanned
            matchedProtein = null;
        }

        if (!matchedProtein || parsedWeight === 0) {
            setLastScanned({ name: 'Unknown', weight: 0, status: 'unknown' });
            if (navigator.vibrate) navigator.vibrate([500]);
            playBeep('error');
            setTimeout(() => setLastScanned(null), 3000);
            return;
        }

        setLastScanned({ name: matchedProtein.name, weight: parsedWeight, status: 'success' });

        setScannedItems(prev => [...prev, {
            id: Math.random().toString(36).substring(7),
            name: matchedProtein.name || 'Unknown',
            weight: parsedWeight,
            isManual: false
        }]);

        if (navigator.vibrate) navigator.vibrate([100]);
        playBeep('success');

        setTimeout(() => setLastScanned(null), 3000);
    }, [lastScanned, dynamicProteinList]);

    // Invisible Bluetooth HID Keyboard Listener
    // Maps physical hardware scanners acting as keyboards seamlessly into the App
    useEffect(() => {
        let barcodeBuffer = '';
        let lastKeyTime = Date.now();

        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore events if user is typing in an actual input field (we don't have inputs on this specific view, but safety first)
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
                return;
            }

            const currentTime = Date.now();

            // If more than 50ms has passed since the last keystroke, it's likely a human typing slowly or accidental press.
            // Hardware scanners usually 'type' characters with less than 20ms between them.
            // Reset the buffer to avoid false positives.
            if (currentTime - lastKeyTime > 50) {
                barcodeBuffer = '';
            }

            if (e.key === 'Enter') {
                if (barcodeBuffer.length > 5) { // GS1 codes are at least 14+ chars, safety threshold
                    e.preventDefault();
                    handleBarcodeScanned(barcodeBuffer);
                }
                barcodeBuffer = '';
            } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
                // Only capture printable characters (numbers, letters, parentheses) representing the GS1 string
                barcodeBuffer += e.key;
            }

            lastKeyTime = currentTime;
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleBarcodeScanned]);


    const handleManualEntry = (e: React.FormEvent) => {
        e.preventDefault();
        if (!manualProtein || !manualWeight) return;
        
        const weight = parseFloat(manualWeight);
        if (weight <= 0) return;

        setScannedItems(prev => [...prev, {
            id: Math.random().toString(36).substring(7),
            name: manualProtein,
            weight: weight,
            isManual: true
        }]);
        setManualProtein('');
        setManualWeight('');
        setShowManualMenu(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (scannedItems.length === 0) return;

        // Consolidate scanned items into the counts dictionary format for offline queue
        const compiledCounts: Record<string, string> = {};
        for (const item of scannedItems) {
            const proteinObj = dynamicProteinList.find(p => p.name === item.name);
            const proteinId = proteinObj ? proteinObj.id : item.name;
            const currentRaw = String(compiledCounts[proteinId] || '');
            compiledCounts[proteinId] = currentRaw.trim() === '' ? String(item.weight) : `${currentRaw}+${item.weight}`;
        }

        // Add 0 for any uncounted proteins to ensure the payload is complete
        for (const p of dynamicProteinList) {
            if (!compiledCounts[p.id]) compiledCounts[p.id] = '0';
        }

        await queueForSync(compiledCounts);
        setIsSubmitted(true);
    };
    const handleManualBarcodeSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (barcode.trim()) {
            handleBarcodeScanned(barcode.trim());
            setBarcode('');
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <header className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <ShieldAlert className="w-8 h-8 text-[#C5A059]" />
                    <h1 className="text-3xl font-bold tracking-tight text-white">Period End Inventory</h1>
                </div>
                <p className="text-gray-400">
                    Mandatory cycle count for All Network Proteins to enforce <span className="text-[#C5A059] font-mono">The Garcia Rule</span>.
                </p>

                {/* Offline PWA Connectivity Badge */}
                <div className="mt-4 flex items-center justify-between bg-[#1a1a1a] p-3 rounded border border-[#333]">
                    <div className="flex items-center gap-3">
                        {isOnline ? (
                            <Wifi className="w-5 h-5 text-[#00FF94]" />
                        ) : (
                            <WifiOff className="w-5 h-5 text-[#FF2A6D] animate-pulse" />
                        )}
                        <div className="text-sm font-bold">
                            {isOnline ? (
                                <span className="text-white">System <span className="text-[#00FF94]">Online</span></span>
                            ) : (
                                <span className="text-[#FF2A6D]">Offline Mode (Cold Storage)</span>
                            )}
                            {isOnline && !hasPendingSync && (
                                <span className="ml-3 text-xs font-mono text-gray-500 font-normal border-l border-[#333] pl-3">
                                    Last synced: Just now
                                </span>
                            )}
                        </div>
                    </div>
                    {hasPendingSync && isOnline && (
                        <div className="flex items-center gap-2 text-xs font-mono text-[#C5A059] bg-[#C5A059]/10 px-2 py-1 rounded">
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            SYNCING...
                        </div>
                    )}
                    {hasPendingSync && !isOnline && (
                        <div className="text-xs font-mono text-gray-500">
                            1 Payload Pending (Awaiting Wi-Fi)
                        </div>
                    )}
                </div>
            </header >

            {
                isSubmitted ? (
                    <div className="bg-[#00FF94]/10 border border-[#00FF94]/20 rounded-lg p-8 text-center space-y-4" >
                        <CheckCircle2 className="w-16 h-16 text-[#00FF94] mx-auto" />
                        <h2 className="text-2xl font-bold text-white">Inventory Locked</h2>
                        <p className="text-gray-400">Inventory count submitted successfully. The operational dashboard is unlocked.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-[#1a1a1a] border border-[#333] rounded-lg overflow-hidden">
                                <div className="bg-[#121212] border-b border-[#333] p-8 flex flex-col items-center justify-center text-center relative overflow-hidden group hover:border-[#C5A059]/50 transition-colors">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#C5A059]/5 rounded-bl-full pointer-events-none"></div>
                                    
                                    <Scan className="w-16 h-16 text-[#C5A059] mb-4 group-hover:scale-110 transition-transform duration-300" />
                                    <h2 className="text-2xl font-black text-white uppercase tracking-widest mb-2">Ready to Scan Boxes</h2>
                                    <p className="text-gray-400 text-sm max-w-md mb-6">
                                        Use your paired Bluetooth Scanner on the Sysco GS1-128 box labels to instantly add precise netting to the inventory cart.
                                    </p>
                                    
                                    <form onSubmit={handleManualBarcodeSubmit} className="w-full max-w-sm relative">
                                        <input 
                                            ref={inputRef}
                                            type="text" 
                                            value={barcode}
                                            onChange={(e) => setBarcode(e.target.value)}
                                            placeholder="Awaiting Barcode Input..."
                                            className="w-full bg-[#1a1a1a] border-2 border-[#C5A059]/30 text-[#C5A059] font-mono text-center text-xl rounded-xl px-4 py-4 pr-14 focus:ring-[#C5A059] focus:border-[#C5A059] outline-none transition-all shadow-[0_0_15px_rgba(197,160,89,0.15)] placeholder:text-gray-600"
                                            autoFocus
                                            autoComplete="off"
                                        />
                                        <button 
                                            type="submit"
                                            disabled={!barcode}
                                            title="Submit Barcode Manually"
                                            className="absolute right-2 top-1/2 -translate-y-1/2 bg-[#C5A059] hover:bg-[#D4AF37] disabled:bg-[#333] disabled:opacity-50 p-2 text-black rounded-lg transition-colors"
                                        >
                                            <ArrowRight className="w-5 h-5" />
                                        </button>
                                    </form>
                                </div>

                                <div className="p-4 border-b border-[#333] flex justify-between items-center bg-[#252525]">
                                    <h2 className="font-bold text-white flex items-center gap-2 uppercase tracking-widest text-sm">
                                        <Scale className="w-4 h-4 text-[#C5A059]" />
                                        Cart & Manual Entry
                                    </h2>
                                    <button 
                                        type="button"
                                        onClick={() => setShowManualMenu(true)}
                                        className="text-xs font-bold text-black uppercase tracking-widest bg-[#C5A059] hover:bg-[#D4AF37] px-4 py-2 rounded transition-colors"
                                    >
                                        + Add Loose Meat
                                    </button>
                                </div>

                                <form onSubmit={handleSubmit} className="p-4">
                                     {scannedItems.length === 0 ? (
                                         <div className="text-center py-12 px-4 border-2 border-dashed border-[#333] rounded-xl flex flex-col items-center justify-center opacity-60 mb-6">
                                            <ScanLine className="w-16 h-16 text-gray-500 mb-4" />
                                            <h3 className="text-white font-bold text-xl uppercase tracking-widest mb-2">Cart is Empty</h3>
                                            <p className="text-gray-400 max-w-sm text-sm">
                                                Activate the Physical Scanner or tap 'Add Loose Meat' to begin counting. Items will stack here.
                                            </p>
                                         </div>
                                     ) : (
                                        <div className="bg-black/50 border border-[#C5A059]/30 rounded-xl p-4 shadow-xl mb-6">
                                            <div className="flex justify-between items-center mb-4 border-b border-[#333] pb-4">
                                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                                    <span className="bg-[#C5A059] text-black px-2 py-1 rounded text-sm font-black">{scannedItems.length}</span> Items Counted
                                                </h3>
                                                <h3 className="text-xl font-bold text-[#C5A059]">
                                                    {scannedItems.reduce((acc, item) => acc + item.weight, 0).toFixed(2)} LBS TOTAL
                                                </h3>
                                            </div>
                                            
                                            <div className="max-h-64 overflow-y-auto rounded-lg border border-[#333]">
                                                <table className="w-full text-sm text-left text-gray-300">
                                                    <thead className="text-xs text-gray-400 uppercase bg-[#1a1a1a] border-b border-[#333] sticky top-0">
                                                        <tr>
                                                            <th className="px-4 py-3 font-bold">Protein</th>
                                                            <th className="px-4 py-3 font-bold">Weight</th>
                                                            <th className="px-4 py-3 font-bold text-right">Target</th>
                                                            <th className="px-4 py-3 font-bold text-right">Action</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {scannedItems.slice().reverse().map((item) => {
                                                            const expected = dynamicProteinList.find(p => p.name === item.name)?.expected || 0;
                                                            return (
                                                            <tr key={item.id} className="border-b border-[#333]/50 bg-[#121212] hover:bg-[#252525] transition-colors">
                                                                <td className="px-4 py-3 font-bold text-white flex items-center gap-2">
                                                                    {item.isManual ? <span title="Manual Weighing"><Scale className="w-3 h-3 text-blue-400" /></span> : <span title="Scanned Box"><ScanLine className="w-3 h-3 text-emerald-400" /></span>}
                                                                    {item.name}
                                                                </td>
                                                                <td className="px-4 py-3 text-[#C5A059] font-mono font-bold tracking-widest">{item.weight.toFixed(2)} LBS</td>
                                                                <td className="px-4 py-3 text-right text-gray-500 font-mono text-xs">{expected} LBS</td>
                                                                <td className="px-4 py-3 text-right">
                                                                    <button 
                                                                        type="button"
                                                                        onClick={() => setScannedItems(prev => prev.filter(i => i.id !== item.id))}
                                                                        className="text-[#FF2A6D] hover:text-white p-1 transition-colors"
                                                                        title="Remove"
                                                                    >
                                                                        <X className="w-5 h-5 mx-auto" />
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        )})}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                     )}

                                    <div className="pt-4 mt-2 border-t border-[#333]">
                                        <button
                                            type="submit"
                                            disabled={isSyncing || scannedItems.length === 0}
                                            className={`w-full font-bold py-5 px-4 rounded-xl transition-all flex justify-center items-center gap-3 uppercase tracking-widest text-base shadow-xl active:scale-95 touch-manipulation disabled:opacity-50 ${isOnline ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-gray-700 border border-gray-600 text-white'}`}
                                        >
                                            {!isOnline ? (
                                                <>
                                                    <WifiOff className="w-6 h-6" />
                                                    SAVE OFFLINE TO DEVICE
                                                </>
                                            ) : isSyncing ? (
                                                <>
                                                    <RefreshCw className="w-6 h-6 animate-spin" />
                                                    SYNCING TO CLOUD...
                                                </>
                                            ) : (
                                                <>
                                                    <Lock className="w-6 h-6" />
                                                    FINALIZE INVENTORY CYCLE
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>

                        <div className="space-y-6">
                            {/* Manual Entry Modal */}
                            {showManualMenu && (
                                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                                    <div className="bg-[#1a1a1a] border-2 border-[#C5A059] rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95">
                                        <div className="flex justify-between items-center mb-6">
                                            <h3 className="text-xl font-bold text-white uppercase tracking-widest flex items-center gap-2">
                                                <Scale className="w-5 h-5 text-[#C5A059]" /> Add Loose Meat
                                            </h3>
                                            <button type="button" onClick={() => setShowManualMenu(false)} className="text-gray-400 hover:text-white"><X className="w-6 h-6" /></button>
                                        </div>
                                        
                                        <form onSubmit={handleManualEntry} className="space-y-6">
                                            <div>
                                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Protein Type</label>
                                                <select 
                                                    value={manualProtein} 
                                                    onChange={e => setManualProtein(e.target.value)}
                                                    className="w-full bg-[#121212] border-2 border-[#333] rounded-lg p-4 text-white font-bold focus:border-[#C5A059] outline-none"
                                                    required
                                                >
                                                    <option value="">-- Choose Protein --</option>
                                                    {dynamicProteinList.map(p => (
                                                        <option key={p.id} value={p.name}>{p.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Exact Weight in LBS</label>
                                                <input 
                                                    type="number" 
                                                    step="0.01"
                                                    value={manualWeight}
                                                    onChange={e => setManualWeight(e.target.value)}
                                                    className="w-full bg-[#121212] border-2 border-[#333] rounded-lg p-4 text-white font-mono text-2xl text-center focus:border-[#C5A059] outline-none"
                                                    placeholder="0.00"
                                                    required
                                                />
                                            </div>
                                            <button 
                                                type="submit"
                                                title="Add to Cart"
                                                disabled={!manualProtein || !manualWeight}
                                                className="w-full bg-[#C5A059] hover:bg-[#D4AF37] text-black font-bold uppercase tracking-widest py-4 rounded-xl disabled:opacity-50"
                                            >
                                                ADD TO CART
                                            </button>
                                        </form>
                                    </div>
                                </div>
                            )}
                            <div className="bg-[#1a1a1a] border-2 border-[#FF2A6D]/50 p-4 rounded-lg shadow-[0_0_15px_rgba(255,42,109,0.15)]">
                                <h3 className="text-[#FF2A6D] font-bold text-sm tracking-widest uppercase mb-3 flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5 animate-pulse" />
                                    The Garcia Rule
                                </h3>
                                <p className="text-sm text-gray-400 mb-4 leading-relaxed">
                                    Failure to submit this inventory cycle by <strong>Monday at 11:00 AM</strong> will trigger an automated lockout of the Manager Dashboard.
                                </p>
                                <div className="bg-[#121212] p-3 rounded border border-[#333] text-xs font-mono text-gray-500">
                                    Unexplained variances &gt; 5 Lbs trigger an immediate alert to Area Management.
                                </div>
                            </div>
                        </div>
                    </div>
                )}
        </div>
    );
};

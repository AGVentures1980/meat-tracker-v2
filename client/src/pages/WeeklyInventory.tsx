import React, { useState, useEffect, useCallback } from 'react';
import { ShieldAlert, CheckCircle2, AlertTriangle, Scale, ArrowRight, Lock, Wifi, WifiOff, RefreshCw, ScanLine, Camera, X, Maximize, AlertCircle } from 'lucide-react';
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

const ScannerComponent = ({ onScan }: { onScan: (text: string) => void }) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        setIsProcessing(true);
        setCameraError(null);
        const file = e.target.files[0];
        const html5QrCode = new Html5Qrcode("reader");

        try {
            // Using the new scanFile API
            const decodedText = await html5QrCode.scanFile(file, true);
            onScan(decodedText);
        } catch (err: any) {
            console.error("File scanning error", err);
            setCameraError("Nenhum código encontrado na imagem. Tente chegar mais perto ou focar na barra GS1.");
            // We only play error beep via the parent component usually, but this is a specific image fail
        } finally {
            setIsProcessing(false);
            html5QrCode.clear();
        }
    };

    return (
        <div className="relative w-full rounded-xl overflow-hidden shadow-2xl bg-black border-4 border-[#C5A059] shadow-[0_0_30px_rgba(197,160,89,0.2)] flex flex-col items-center justify-center min-h-[300px] p-6 text-center">

            {/* Hidden div needed to instantiate Html5Qrcode temporarily */}
            <div id="reader" style={{ display: 'none' }}></div>

            <Camera className="w-16 h-16 text-[#C5A059] mb-4 opacity-50" />
            <h3 className="text-[#C5A059] font-bold text-lg mb-2 tracking-widest">HIGH-RES PHOTO SCAN</h3>
            <p className="text-gray-400 text-sm mb-6 max-w-[250px]">
                Capture a clear, focused photo of the barcode for analysis.
            </p>

            <label className="relative cursor-pointer group">
                <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={isProcessing}
                />
                <div className={`px-8 py-4 bg-[#C5A059]/10 border-2 border-[#C5A059] rounded-lg font-mono tracking-widest text-[#C5A059] transition-all flex items-center gap-3 ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#C5A059]/20'}`}>
                    {isProcessing ? (
                        <>
                            <RefreshCw className="w-5 h-5 animate-spin" />
                            PROCESSING...
                        </>
                    ) : (
                        <>
                            <ScanLine className="w-5 h-5" />
                            TAKE PHOTO
                        </>
                    )}
                </div>
            </label>

            {cameraError && (
                <div className="mt-6 flex items-start gap-2 text-left bg-[#FF2A6D]/10 p-3 rounded border border-[#FF2A6D]/30">
                    <AlertCircle className="w-5 h-5 text-[#FF2A6D] shrink-0 mt-0.5" />
                    <p className="text-[#FF2A6D] text-xs leading-relaxed">{cameraError}</p>
                </div>
            )}
        </div>
    );
};

export const WeeklyInventory = () => {
    const { user, selectedCompany } = useAuth();
    const { counts, updateCount, isOnline, hasPendingSync, isSyncing, queueForSync } = useOfflineInventory();
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [dynamicProteinList, setDynamicProteinList] = useState<ProteinItem[]>(DEFAULT_PROTEIN_LIST);
    const [lastScanned, setLastScanned] = useState<{ name: string, weight: number, status: string } | null>(null);

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

    const handleCountChange = (id: string, value: string) => {
        updateCount(id, value);
    };

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
                // Example: 19065337 0864 0086353360 (22 digits, weight in kg at indices 8-11)
                const lambMatch = cleanBarcode.match(/^(\d{8})(\d{4})(\d{10})$/);
                // Also safety check some known patterns or lengths
                if (lambMatch && cleanBarcode.length === 22) {
                    const rawKg = parseInt(lambMatch[2], 10) / 100;
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
        } else if (cleanBarcode.length === 22 && parsedWeight > 0) {
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

        // Save to offline storage instantly
        updateCount(matchedProtein.id, String(parsedWeight));

        if (navigator.vibrate) navigator.vibrate([100]);
        playBeep('success');

        setTimeout(() => setLastScanned(null), 3000);
    }, [updateCount, lastScanned]);

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

    const simulateContinuousScan = () => {
        if (!window.sessionStorage.getItem('scannedBarcodes')) {
            window.sessionStorage.setItem('scannedBarcodes', JSON.stringify([]));
        }
        const scannedList = JSON.parse(window.sessionStorage.getItem('scannedBarcodes') || '[]');

        const isDuplicate = Math.random() > 0.85 && scannedList.length > 0;
        const mockBarcodeId = isDuplicate ? scannedList[0] : `BOX-${Math.floor(Math.random() * 10000)}`;

        if (scannedList.includes(mockBarcodeId)) {
            setLastScanned({ name: 'Unknown', weight: 0, status: 'duplicate' });
            if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
            setTimeout(() => setLastScanned(null), 3000);
            return;
        }

        scannedList.push(mockBarcodeId);
        window.sessionStorage.setItem('scannedBarcodes', JSON.stringify(scannedList));

        const isUnknown = Math.random() > 0.9;
        if (isUnknown) {
            setLastScanned({ name: 'Unknown', weight: 0, status: 'unknown' });
            if (navigator.vibrate) navigator.vibrate([500]);
            setTimeout(() => setLastScanned(null), 3500);
            return;
        }

        const randomProtein = dynamicProteinList[Math.floor(Math.random() * dynamicProteinList.length)];
        const weight = parseFloat((Math.random() * (45 - 20) + 20).toFixed(1));

        const currentRaw = String(counts[randomProtein.id] || '');
        const newRaw = currentRaw.trim() === '' ? String(weight) : `${currentRaw}+${weight}`;

        updateCount(randomProtein.id, newRaw);

        setLastScanned({ name: randomProtein.name, weight, status: 'success' });
        if (navigator.vibrate) navigator.vibrate(100);
        setTimeout(() => setLastScanned(null), 2500);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await queueForSync(counts);
        setIsSubmitted(true);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <header className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <ShieldAlert className="w-8 h-8 text-[#C5A059]" />
                    <h1 className="text-3xl font-bold tracking-tight text-white">Weekly Pulse: Smart Inventory</h1>
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
                        <p className="text-gray-400">Weekly pulse submitted successfully. The operational dashboard is unlocked.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-[#1a1a1a] border border-[#333] rounded-lg overflow-hidden">
                                <div className="p-5 bg-gradient-to-r from-[#121212] to-[#1a1a1a] border-b border-[#333] flex flex-col md:flex-row items-center gap-4 justify-between">
                                    <div className="flex-1">
                                        <h3 className="text-[#00FF94] font-bold tracking-widest uppercase mb-1 flex items-center gap-2">
                                            <ScanLine className="w-5 h-5" />
                                            1. Scan Sealed Boxes
                                        </h3>
                                        <p className="text-gray-400 text-sm leading-relaxed max-w-lg">
                                            Bluetooth scanner active. Scan GS1-128 barcodes directly to accumulate exact net weights automatically.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setIsCameraOpen(true)}
                                        className="shrink-0 w-full md:w-auto bg-[#1a1a1a] hover:bg-[#252525] text-gray-300 border border-[#333] font-bold uppercase tracking-widest py-3 px-6 rounded-lg flex items-center justify-center gap-3 active:scale-95 transition-all text-xs shadow-inner"
                                    >
                                        <Camera className="w-4 h-4 text-gray-400" />
                                        iPad Camera Fallback
                                    </button>
                                </div>

                                <div className="p-4 border-b border-[#333] flex justify-between items-center bg-[#252525]">
                                    <h2 className="font-bold text-white flex items-center gap-2 uppercase tracking-widest text-sm">
                                        <Scale className="w-4 h-4 text-[#C5A059]" />
                                        2. Manual Entry (Prep Weighing)
                                    </h2>
                                    <div className="flex items-center gap-3 hidden sm:flex">
                                        <span className="text-xs font-mono text-[#C5A059] bg-[#C5A059]/10 border border-[#C5A059]/20 px-3 py-1 rounded">
                                            Loose Meats Only
                                        </span>
                                    </div>
                                </div>

                                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                                    {dynamicProteinList.map((item) => {
                                        const rawVal = counts[item.id] || '';
                                        const expressionStr = String(rawVal);
                                        // Calculate actual evaluated sum
                                        const actual = expressionStr.split('+').reduce((sum, curr) => sum + (parseFloat(curr) || 0), 0);
                                        const variance = actual - item.expected;
                                        const isNegative = variance < 0;

                                        return (
                                            <div key={item.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center p-3 bg-[#121212] rounded border border-[#333]">
                                                {/* Meta */}
                                                <div className="md:col-span-3">
                                                    <div className="font-bold text-white truncate" title={item.name}>{item.name}</div>
                                                    <div className="text-xs text-gray-500 font-mono">Target: {item.expected} {item.unit}</div>
                                                </div>

                                                {/* Input Column (Scans or Manual) */}
                                                <div className="md:col-span-5 flex items-center gap-2">
                                                    <div className="relative flex-1">
                                                        <input
                                                            type="text"
                                                            inputMode="decimal"
                                                            placeholder="Lbs"
                                                            className="w-full bg-[#1a1a1a] border-2 border-[#333] rounded-lg pl-3 pr-3 py-3 text-white focus:outline-none focus:border-[#C5A059] font-mono text-sm touch-manipulation shadow-inner transition-colors"
                                                            value={counts[item.id] ?? ''}
                                                            onChange={(e) => {
                                                                const val = e.target.value.replace(',', '.').replace(/[^0-9.+]/g, '');
                                                                handleCountChange(item.id, val);
                                                            }}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Calculated Total Column */}
                                                <div className="md:col-span-2 text-center md:text-right flex flex-col justify-center">
                                                    <div className="text-[10px] text-gray-500 uppercase tracking-widest hidden md:block mb-1">Total</div>
                                                    <div className="font-mono text-white text-lg md:text-xl font-bold">
                                                        {actual > 0 ? actual.toFixed(1) : '-'} <span className="text-xs text-gray-500 font-normal">{item.unit}</span>
                                                    </div>
                                                </div>

                                                {/* Variance Column */}
                                                <div className="md:col-span-2 text-right flex flex-col justify-center items-end mt-2 md:mt-0">
                                                    {(actual > 0 || String(rawVal) !== '') && (
                                                        <div className={`font-mono font-bold text-sm px-2 py-1 rounded inline-block ${isNegative ? 'bg-[#FF2A6D]/10 text-[#FF2A6D]' : 'bg-[#00FF94]/10 text-[#00FF94]'}`}>
                                                            {isNegative ? '' : '+'}{variance.toFixed(1)} <span className="text-[10px] uppercase">VAR</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}

                                    <div className="pt-4 mt-6 border-t border-[#333]">
                                        <button
                                            type="submit"
                                            disabled={isSyncing}
                                            className={`w-full font-bold py-4 px-4 rounded transition-all flex justify-center items-center gap-2 uppercase tracking-widest text-sm shadow-xl active:scale-95 touch-manipulation ${isOnline ? 'bg-[#C5A059] hover:bg-[#D4AF37] text-black' : 'bg-[#333] border border-gray-600 text-white'}`}
                                        >
                                            {!isOnline ? (
                                                <>
                                                    <WifiOff className="w-5 h-5" />
                                                    Save to Device (Offline Sync)
                                                </>
                                            ) : isSyncing ? (
                                                <>
                                                    <RefreshCw className="w-5 h-5 animate-spin" />
                                                    Syncing...
                                                </>
                                            ) : (
                                                <>
                                                    <Lock className="w-5 h-5" />
                                                    Submit Pulse & Lock
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>

                        <div className="space-y-6">
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

                            <div className="bg-[#1a1a1a] border border-[#333] p-4 rounded-lg">
                                <h3 className="text-white font-bold text-sm tracking-widest uppercase mb-3 flex items-center gap-2">
                                    <ArrowRight className="w-4 h-4 text-[#C5A059]" />
                                    Next Steps
                                </h3>
                                <ol className="text-sm text-gray-400 space-y-2 list-decimal list-inside mb-4">
                                    <li>Count items physically in cooler</li>
                                    <li>Enter precise weight in Lbs, or</li>
                                    <li>Tap <ScanLine className="w-3 h-3 inline text-[#C5A059]" /> to **Scan Box Barcode**</li>
                                    <li>Review generated variances</li>
                                    <li>Submit to unlock shift center</li>
                                </ol>

                                <div className="bg-[#121212] p-3 rounded border border-[#333] text-xs font-mono text-[#C5A059] flex items-start gap-2">
                                    <Camera className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <span className="font-bold uppercase block mb-1">New: GS1-128 Scanner</span>
                                        Point device camera at meat boxes to auto-accumulate exact weights. Works fully offline.
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            {/* Global Continuous Camera Overlay */}
            {isCameraOpen && (
                <div className="fixed inset-0 bg-black/95 z-[999] flex flex-col backdrop-blur-sm">
                    <div className="p-4 flex justify-between items-center border-b border-[#333]/50 bg-black">
                        <div className="flex items-center gap-2 text-[#C5A059]">
                            <div className="w-2 h-2 rounded-full bg-[#C5A059] animate-pulse" />
                            <span className="font-mono tracking-widest text-sm uppercase">PMA Active Scanner</span>
                        </div>
                        <button type="button" title="Close scanner" aria-label="Close scanner" onClick={() => setIsCameraOpen(false)} className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition-colors">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="flex-1 relative flex flex-col justify-center w-full px-4 overflow-hidden pt-12">
                        <div className="w-full max-w-md mx-auto relative z-10 box-border rounded-xl border-4 border-[#C5A059] shadow-[0_0_30px_rgba(197,160,89,0.2)] bg-black">
                            <ScannerComponent onScan={handleBarcodeScanned} />
                        </div>

                        {/* Status Toasts */}
                        {lastScanned && (
                            <div className={`absolute top-4 left-1/2 -translate-x-1/2 w-11/12 max-w-sm px-4 py-3 rounded text-sm font-bold shadow-2xl flex items-center gap-3 transition-all transform animate-in slide-in-from-top-4 z-50 ${lastScanned.status === 'success' ? 'bg-[#00FF94] text-black' :
                                lastScanned.status === 'duplicate' ? 'bg-[#FF2A6D] text-white' :
                                    'bg-[#C5A059] text-black'
                                }`}>
                                {lastScanned.status === 'success' && <CheckCircle2 className="w-5 h-5 flex-shrink-0" />}
                                {lastScanned.status === 'duplicate' && <ShieldAlert className="w-5 h-5 flex-shrink-0" />}
                                {lastScanned.status === 'unknown' && <AlertTriangle className="w-5 h-5 flex-shrink-0" />}

                                <span className="font-mono leading-tight">
                                    {lastScanned.status === 'success' ? `ALLOCATED: ${lastScanned.weight} LBS ➔ ${lastScanned.name.toUpperCase()}` :
                                        lastScanned.status === 'duplicate' ? `ERROR: BOX ALREADY SCANNED` :
                                            `UNKNOWN BARCODE: REQUIRES MANUAL MATCH`}
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="p-8 pb-12 bg-black border-t border-[#333]/50 mt-auto shadow-[0_-20px_50px_rgba(0,0,0,0.8)]">
                        <div className="text-center text-xs text-gray-500 font-mono tracking-widest uppercase mb-4">
                            ALIGN BOX BARCODE WITHIN CAMERA VIEW
                        </div>
                        <button
                            type="button"
                            onClick={simulateContinuousScan}
                            className="w-full bg-white/5 hover:bg-white/10 border border-[#333] text-white font-mono tracking-widest py-5 rounded-lg flex items-center justify-center gap-3 active:scale-95 transition-all text-sm"
                        >
                            <Maximize className="w-5 h-5 text-[#C5A059]" />
                            SIMULATE SCAN [PITCH DEMO]
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

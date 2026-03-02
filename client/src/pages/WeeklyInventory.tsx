import React, { useState } from 'react';
import { ShieldAlert, CheckCircle2, AlertTriangle, Scale, ArrowRight, Lock, Wifi, WifiOff, RefreshCw, ScanLine, Camera, X, Maximize } from 'lucide-react';
import { useOfflineInventory } from '../hooks/useOfflineInventory';

const FULL_PROTEIN_LIST = [
    { id: '1', name: 'Picanha', expected: 156.5, unit: 'Lbs' },
    { id: '3', name: 'Fraldinha/Flank Steak', expected: 88.0, unit: 'Lbs' },
    { id: '4', name: 'Tri-Tip', expected: 65.0, unit: 'Lbs' },
    { id: '6', name: 'Filet Mignon', expected: 70.2, unit: 'Lbs' },
    { id: '8', name: 'Beef Ribs', expected: 30.5, unit: 'Lbs' },
    { id: '9', name: 'Pork Ribs', expected: 42.0, unit: 'Lbs' },
    { id: '10', name: 'Pork Loin', expected: 25.0, unit: 'Lbs' },
    { id: '11', name: 'Chicken Drumstick', expected: 55.0, unit: 'Lbs' },
    { id: '12', name: 'Chicken Breast', expected: 60.0, unit: 'Lbs' },
    { id: '13', name: 'Lamb Chops', expected: 12.5, unit: 'Lbs' },
    { id: '14', name: 'Leg of Lamb', expected: 28.0, unit: 'Lbs' },
    { id: '15', name: 'Lamb Picanha', expected: 35.0, unit: 'Lbs' },
    { id: '16', name: 'Sausage', expected: 22.0, unit: 'Lbs' }
];

export const WeeklyInventory = () => {
    const { counts, updateCount, isOnline, hasPendingSync, isSyncing, queueForSync } = useOfflineInventory();
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [lastScanned, setLastScanned] = useState<{ name: string, weight: number, status: 'success' | 'unknown' | 'duplicate' } | null>(null);

    const handleCountChange = (id: string, value: string) => {
        updateCount(id, value);
    };

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

        const randomProtein = FULL_PROTEIN_LIST[Math.floor(Math.random() * FULL_PROTEIN_LIST.length)];
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
                                <div className="p-4 border-b border-[#333] flex justify-between items-center bg-[#252525]">
                                    <h2 className="font-bold text-white flex items-center gap-2">
                                        <Scale className="w-4 h-4 text-[#C5A059]" />
                                        Physical Count Entry
                                    </h2>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs font-mono text-gray-500 bg-[#121212] px-2 py-1 rounded hidden sm:inline-block">
                                            Due: Mon 11AM
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setIsCameraOpen(true)}
                                            className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest bg-[#C5A059] text-black px-3 py-1.5 rounded active:scale-95 transition-transform shadow-lg"
                                        >
                                            <Camera className="w-4 h-4" />
                                            Scanner
                                        </button>
                                    </div>
                                </div>

                                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                                    {FULL_PROTEIN_LIST.map((item) => {
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
                                                            inputMode="text"
                                                            placeholder="Scan or type ex: 40.5+30.2"
                                                            className="w-full bg-[#1a1a1a] border-2 border-[#333] rounded-lg pl-3 pr-10 py-3 text-white focus:outline-none focus:border-[#C5A059] font-mono text-sm touch-manipulation shadow-inner transition-colors"
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
                        <div className="flex items-center gap-2 text-[#00FF94]">
                            <div className="w-2 h-2 rounded-full bg-[#00FF94] animate-pulse" />
                            <span className="font-mono tracking-widest text-sm uppercase">AI Vision Active</span>
                        </div>
                        <button type="button" onClick={() => setIsCameraOpen(false)} className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition-colors">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="flex-1 relative flex items-center justify-center overflow-hidden">
                        {/* Camera Viewfinder UI */}
                        <div className="w-72 h-72 relative">
                            {/* Brackets */}
                            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-[#C5A059] rounded-tl-lg" />
                            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-[#C5A059] rounded-tr-lg" />
                            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-[#C5A059] rounded-bl-lg" />
                            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-[#C5A059] rounded-br-lg" />

                            {/* Scanning Laser */}
                            <div className="absolute left-4 right-4 h-[2px] bg-[#FF2A6D] top-1/2 -translate-y-1/2 shadow-[0_0_15px_#FF2A6D] animate-pulse" />

                            <div className="absolute -bottom-8 left-0 right-0 text-center text-xs text-gray-400 font-mono tracking-widest uppercase">
                                Point at Box Barcode
                            </div>
                        </div>

                        {/* Status Toasts */}
                        {lastScanned && (
                            <div className={`absolute top-10 left-1/2 -translate-x-1/2 w-11/12 max-w-sm px-4 py-3 rounded text-sm font-bold shadow-2xl flex items-center gap-3 transition-all transform animate-in slide-in-from-top-4 ${lastScanned.status === 'success' ? 'bg-[#00FF94] text-black' :
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

                    <div className="p-8 pb-12 bg-black border-t border-[#333]/50">
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

import React, { useState } from 'react';
import { ShieldAlert, CheckCircle2, AlertTriangle, Scale, ArrowRight, Lock, Wifi, WifiOff, RefreshCw, ScanLine, Camera } from 'lucide-react';
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

    const handleCountChange = (id: string, value: string) => {
        updateCount(id, value);
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
                                    <span className="text-xs font-mono text-gray-500 bg-[#121212] px-2 py-1 rounded">
                                        Due: Monday, 11:00 AM
                                    </span>
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
                                                        {/* Mobile-Only Barcode Scanner Simulation with Deduplication */}
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.preventDefault();

                                                                // Simulated Session Store for Anti-Duplication
                                                                if (!window.sessionStorage.getItem('scannedBarcodes')) {
                                                                    window.sessionStorage.setItem('scannedBarcodes', JSON.stringify([]));
                                                                }
                                                                const scannedList = JSON.parse(window.sessionStorage.getItem('scannedBarcodes') || '[]');

                                                                const isDuplicateSim = Math.random() > 0.9 && scannedList.length > 0;
                                                                const mockBarcodeId = isDuplicateSim ? scannedList[0] : `BOX-${Math.floor(Math.random() * 10000)}`;

                                                                const inputEl = e.currentTarget.previousElementSibling as HTMLInputElement;

                                                                if (scannedList.includes(mockBarcodeId)) {
                                                                    if (inputEl) {
                                                                        inputEl.style.borderColor = '#FF2A6D';
                                                                        inputEl.style.backgroundColor = 'rgba(255, 42, 109, 0.1)';
                                                                        alert("Bloqueio Anti-Duplicidade: Esta caixa já foi lida nesta sessão.");
                                                                        setTimeout(() => {
                                                                            inputEl.style.borderColor = '';
                                                                            inputEl.style.backgroundColor = '';
                                                                        }, 800);
                                                                    }
                                                                    return;
                                                                }

                                                                scannedList.push(mockBarcodeId);
                                                                window.sessionStorage.setItem('scannedBarcodes', JSON.stringify(scannedList));

                                                                // Simulated Box Weight
                                                                const simulatedBoxWeight = parseFloat((Math.random() * (45 - 35) + 35).toFixed(1));

                                                                // Append to current expression
                                                                const currentRaw = String(counts[item.id] || '');
                                                                const newRaw = currentRaw.trim() === '' ? String(simulatedBoxWeight) : `${currentRaw}+${simulatedBoxWeight}`;

                                                                if (inputEl) {
                                                                    inputEl.style.borderColor = '#00FF94';
                                                                    inputEl.style.backgroundColor = 'rgba(0, 255, 148, 0.1)';
                                                                    setTimeout(() => {
                                                                        inputEl.style.borderColor = '';
                                                                        inputEl.style.backgroundColor = '';
                                                                    }, 500);
                                                                }

                                                                handleCountChange(item.id, newRaw);
                                                            }}
                                                            className="absolute right-1 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-[#C5A059] hover:bg-[#C5A059]/10 rounded transition-colors lg:hidden"
                                                            title="Scan Barcode ( Mobile Only)"
                                                        >
                                                            <ScanLine className="w-5 h-5" />
                                                        </button>
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
        </div >
    );
};

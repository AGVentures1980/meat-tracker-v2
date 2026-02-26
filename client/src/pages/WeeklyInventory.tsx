import React, { useState } from 'react';
import { ShieldAlert, CheckCircle2, AlertTriangle, Scale, ArrowRight, Lock, Wifi, WifiOff, RefreshCw } from 'lucide-react';
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
                                        const rawVal = counts[item.id];
                                        const actual = typeof rawVal === 'string' ? parseFloat(rawVal) : rawVal;
                                        const parsedActual = isNaN(actual as number) ? 0 : actual as number;
                                        const variance = parsedActual - item.expected;
                                        const isNegative = variance < 0;

                                        return (
                                            <div key={item.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center p-3 bg-[#121212] rounded border border-[#333]">
                                                <div className="md:col-span-1">
                                                    <div className="font-bold text-white">{item.name}</div>
                                                    <div className="text-xs text-gray-500 font-mono">Theoretical: {item.expected} {item.unit}</div>
                                                </div>
                                                <div className="md:col-span-2 flex items-center gap-3">
                                                    <input
                                                        type="text"
                                                        inputMode="decimal"
                                                        placeholder="Lbs..."
                                                        className="w-full bg-[#1a1a1a] border-2 border-[#333] rounded-lg px-4 py-4 md:py-3 text-white focus:outline-none focus:border-[#C5A059] font-mono text-xl md:text-lg touch-manipulation shadow-inner"
                                                        value={counts[item.id] ?? ''}
                                                        onChange={(e) => {
                                                            const val = e.target.value.replace(',', '.').replace(/[^0-9.]/g, '');
                                                            handleCountChange(item.id, val);
                                                        }}
                                                        required
                                                    />
                                                    <span className="text-gray-500 font-mono text-sm uppercase">{item.unit}</span>
                                                </div>
                                                <div className="md:col-span-1 text-right mt-2 md:mt-0">
                                                    {counts[item.id] !== undefined && counts[item.id] !== '' && (
                                                        <div className={`font-mono font-bold text-sm md:text-base bg-black/40 px-3 py-2 rounded border border-[#333] inline-block ${isNegative ? 'text-[#FF2A6D]' : 'text-[#00FF94]'}`}>
                                                            {isNegative ? '' : '+'}{variance.toFixed(1)} <span className="text-[10px] text-gray-500 uppercase tracking-wider">VAR</span>
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
                            <div className="bg-[#1a1a1a] border border-[#FF2A6D]/30 p-4 rounded-lg">
                                <h3 className="text-[#FF2A6D] font-bold text-sm tracking-widest uppercase mb-3 flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4" />
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
                                <ol className="text-sm text-gray-400 space-y-2 list-decimal list-inside">
                                    <li>Count items physically in cooler</li>
                                    <li>Enter precise weight in Lbs</li>
                                    <li>Review generated variances</li>
                                    <li>Submit to unlock shift center</li>
                                </ol>
                            </div>
                        </div>
                    </div>
                )}
        </div >
    );
};

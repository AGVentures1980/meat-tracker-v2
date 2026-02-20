import React, { useState } from 'react';
import { ShieldAlert, CheckCircle2, AlertTriangle, Scale, ArrowRight, Lock } from 'lucide-react';

const WEEKLY_VILLAINS = [
    { id: '1', name: 'Picanha', expected: 124.5, unit: 'Lbs' },
    { id: '2', name: 'Filet Mignon', expected: 45.2, unit: 'Lbs' },
    { id: '3', name: 'Fraldinha/Flank', expected: 88.0, unit: 'Lbs' },
    { id: '4', name: 'Lamb Chops', expected: 12.5, unit: 'Lbs' },
];

export const WeeklyInventory = () => {
    const [counts, setCounts] = useState<Record<string, number>>({});
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleCountChange = (id: string, value: string) => {
        setCounts(prev => ({
            ...prev,
            [id]: parseFloat(value) || 0
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
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
                    Mandatory cycle count for Core Proteins (Vilões) to enforce <span className="text-[#C5A059] font-mono">The Garcia Rule</span>.
                </p>
            </header>

            {isSubmitted ? (
                <div className="bg-[#00FF94]/10 border border-[#00FF94]/20 rounded-lg p-8 text-center space-y-4">
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
                                {WEEKLY_VILLAINS.map((item) => {
                                    const actual = counts[item.id] || 0;
                                    const variance = actual - item.expected;
                                    const isNegative = variance < 0;

                                    return (
                                        <div key={item.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center p-3 bg-[#121212] rounded border border-[#333]">
                                            <div className="md:col-span-1">
                                                <div className="font-bold text-white">{item.name}</div>
                                                <div className="text-xs text-gray-500 font-mono">Theoretical: {item.expected} {item.unit}</div>
                                            </div>
                                            <div className="md:col-span-2 flex items-center gap-3">
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    min="0"
                                                    placeholder="Enter Lbs..."
                                                    className="w-full bg-[#1a1a1a] border border-[#333] rounded px-3 py-2 text-white focus:outline-none focus:border-[#C5A059] font-mono text-lg"
                                                    value={counts[item.id] || ''}
                                                    onChange={(e) => handleCountChange(item.id, e.target.value)}
                                                    required
                                                />
                                                <span className="text-gray-500 font-mono text-sm">{item.unit}</span>
                                            </div>
                                            <div className="md:col-span-1 text-right">
                                                {counts[item.id] !== undefined && (
                                                    <div className={`font-mono font-bold ${isNegative ? 'text-[#FF2A6D]' : 'text-[#00FF94]'}`}>
                                                        {isNegative ? '' : '+'}{variance.toFixed(1)} <span className="text-[10px] text-gray-500">VAR</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}

                                <div className="pt-4 mt-6 border-t border-[#333]">
                                    <button
                                        type="submit"
                                        className="w-full bg-[#C5A059] hover:bg-[#D4AF37] text-black font-bold py-3 px-4 rounded transition-colors flex justify-center items-center gap-2"
                                    >
                                        <Lock className="w-4 h-4" />
                                        Submit Weekly Pulse & Lock
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
        </div>
    );
};

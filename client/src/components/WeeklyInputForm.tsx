import React, { useState } from 'react';
import { Save, Plus, Trash2, Calendar } from 'lucide-react';

interface WeeklyInputFormProps {
    onSubmit: () => void;
    onClose: () => void;
    storeId: number;
}

export const WeeklyInputForm = ({ onSubmit, onClose, storeId }: WeeklyInputFormProps) => {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [guests, setGuests] = useState<number | ''>('');

    // Inventory State (Focused on Picanha for V2, extensible)
    const [inventoryQty, setInventoryQty] = useState<number | ''>('');

    // Purchases State
    const [purchases, setPurchases] = useState<{ id: number; date: string; item: string; qty: number; cost: number }[]>([]);

    const addPurchase = () => {
        setPurchases([...purchases, {
            id: Date.now(),
            date: date, // Default to closing date
            item: 'Picanha',
            qty: 0,
            cost: 0
        }]);
    };

    const removePurchase = (id: number) => {
        setPurchases(purchases.filter(p => p.id !== id));
    };

    const updatePurchase = (id: number, field: string, value: any) => {
        setPurchases(purchases.map(p => p.id === id ? { ...p, [field]: value } : p));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const payload = {
                store_id: storeId,
                date,
                guests: Number(guests),
                inventory: [
                    { item: 'Picanha', qty: Number(inventoryQty) }
                ],
                purchases: purchases.map(p => ({
                    date: p.date,
                    item: p.item,
                    qty: Number(p.qty),
                    cost: Number(p.cost)
                }))
            };

            const baseUrl = import.meta.env.PROD ? '/api/v1' : 'http://localhost:3000/api/v1';
            const res = await fetch(`${baseUrl}/inventory/weekly-close`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                alert('Weekly Close Successful!');
                onSubmit();
                onClose();
            } else {
                alert('Failed to save.');
            }
        } catch (err) {
            console.error(err);
            alert('Error submitting form.');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="p-6 bg-[#1a1a1a] text-white rounded-xl shadow-2xl border border-white/5 max-h-[90vh] overflow-y-auto w-full max-w-2xl">
            <div className="border-b border-white/10 pb-4 mb-6">
                <h2 className="text-2xl font-serif text-brand-gold">Manager Weekly Close</h2>
                <p className="text-gray-400 text-sm">Input Sunday Counts & Weekly Invoices</p>
            </div>

            {/* Section 1: General Info */}
            <div className="grid grid-cols-2 gap-6 mb-8">
                <div>
                    <label className="block text-xs uppercase text-gray-500 mb-1">Closing Date (Sunday)</label>
                    <input
                        type="date"
                        required
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full bg-black/50 border border-white/10 rounded p-2 text-white focus:border-brand-gold outline-none"
                    />
                </div>
                <div>
                    <label className="block text-xs uppercase text-gray-500 mb-1">Week Guest Count</label>
                    <input
                        type="number"
                        required
                        placeholder="e.g. 1200"
                        value={guests}
                        onChange={(e) => setGuests(Number(e.target.value))}
                        className="w-full bg-black/50 border border-white/10 rounded p-2 text-white focus:border-brand-gold outline-none"
                    />
                </div>
            </div>

            {/* Section 2: Inventory Count */}
            <div className="mb-8 bg-white/5 p-4 rounded-lg border border-white/5">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                    <Calendar className="w-4 h-4 mr-2 text-blue-400" />
                    Physical Inventory
                </h3>
                <div className="grid grid-cols-2 gap-4 items-end">
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Picanha (lbs)</label>
                        <input
                            type="number"
                            step="0.1"
                            required
                            placeholder="Counted Lbs"
                            value={inventoryQty}
                            onChange={(e) => setInventoryQty(Number(e.target.value))}
                            className="w-full bg-black border border-white/10 rounded p-2 text-white font-mono text-lg"
                        />
                    </div>
                    <div className="text-xs text-gray-500 pb-3">
                        * Enter the final weight counted on Sunday night.
                    </div>
                </div>
            </div>

            {/* Section 3: Purchases */}
            <div className="mb-8">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-white">Weekly Invoices</h3>
                    <button type="button" onClick={addPurchase} className="text-xs bg-brand-gold text-black px-2 py-1 rounded font-bold flex items-center hover:bg-yellow-500">
                        <Plus className="w-3 h-3 mr-1" /> Add Invoice
                    </button>
                </div>

                {purchases.length === 0 && (
                    <div className="text-center p-4 border border-dashed border-white/10 rounded text-gray-500 text-sm">
                        No purchases recorded this week.
                    </div>
                )}

                <div className="space-y-3">
                    {purchases.map((p) => (
                        <div key={p.id} className="grid grid-cols-12 gap-2 items-center bg-black/30 p-2 rounded border border-white/5">
                            <div className="col-span-3">
                                <input
                                    type="date"
                                    value={p.date}
                                    onChange={(e) => updatePurchase(p.id, 'date', e.target.value)}
                                    className="w-full bg-transparent text-xs text-gray-300 border-none focus:ring-0"
                                />
                            </div>
                            <div className="col-span-3">
                                <input
                                    type="text"
                                    value={p.item}
                                    readOnly // Locked to Picanha for V2
                                    className="w-full bg-transparent text-sm text-white font-bold border-none focus:ring-0"
                                />
                            </div>
                            <div className="col-span-2">
                                <input
                                    type="number"
                                    placeholder="Lbs"
                                    value={p.qty}
                                    onChange={(e) => updatePurchase(p.id, 'qty', e.target.value)}
                                    className="w-full bg-white/5 rounded px-2 py-1 text-sm text-white border border-white/10"
                                />
                            </div>
                            <div className="col-span-3">
                                <input
                                    type="number"
                                    placeholder="Total $"
                                    value={p.cost}
                                    onChange={(e) => updatePurchase(p.id, 'cost', e.target.value)}
                                    className="w-full bg-white/5 rounded px-2 py-1 text-sm text-brand-gold border border-white/10"
                                />
                            </div>
                            <div className="col-span-1 text-right">
                                <button type="button" onClick={() => removePurchase(p.id)} className="text-red-500 hover:text-red-400">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end space-x-4 pt-4 border-t border-white/10">
                <button type="button" onClick={onClose} className="px-4 py-2 text-gray-400 hover:text-white transition-colors">
                    Cancel
                </button>
                <button type="submit" className="px-6 py-2 bg-brand-red hover:bg-red-700 text-white font-bold rounded flex items-center shadow-lg shadow-red-900/20 transition-all">
                    <Save className="w-4 h-4 mr-2" />
                    Submit Close
                </button>
            </div>
        </form>
    );
};

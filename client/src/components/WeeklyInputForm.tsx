import { Save, Plus, Trash2, Calendar, DownloadCloud, Upload, Loader2, FileText, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import React, { useState } from 'react';
import { PROTEIN_MAP } from '../lib/constants';

// Derive unique categories from PROTEIN_MAP
const INVENTORY_CATEGORIES = Array.from(new Set(Object.values(PROTEIN_MAP))).filter(c => c !== 'Combo');

interface WeeklyInputFormProps {
    onSubmit: () => void;
    onClose: () => void;
    storeId: number;
}

export const WeeklyInputForm = ({ onSubmit, onClose, storeId }: WeeklyInputFormProps) => {
    const { user } = useAuth();
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [dineInGuests, setDineInGuests] = useState<number | ''>('');
    const [oloGuests, setOloGuests] = useState<number | ''>('');

    // Automation Loading States
    const [loadingOlo, setLoadingOlo] = useState(false);
    const [loadingOCR, setLoadingOCR] = useState(false);

    // Inventory State (Multi-Category)
    const [inventory, setInventory] = useState<Record<string, number | ''>>({});

    const handleInventoryChange = (category: string, value: string) => {
        setInventory(prev => ({
            ...prev,
            [category]: value === '' ? '' : Number(value)
        }));
    };

    // Purchases State
    const [purchases, setPurchases] = useState<{ id: number; date: string; item: string; qty: number; cost: number }[]>([]);

    const totalGuests = (Number(dineInGuests || 0) + Number(oloGuests || 0));

    const addPurchase = () => {
        setPurchases([...purchases, {
            id: Date.now(),
            date: date, // Default to closing date
            item: 'Picanha', // Default
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

    // --- AUTOMATION HANDLERS ---

    const handleOloSync = async () => {
        if (!user) return;
        setLoadingOlo(true);
        try {
            const baseUrl = import.meta.env.PROD ? '/api/v1' : 'http://localhost:3001/api/v1';
            const token = user.role === 'admin'
                ? 'Bearer mock-token'
                : `Bearer store-${user.id}-${user.role || 'manager'}`;

            const res = await fetch(`${baseUrl}/automation/olo-sales?week=10`, {
                headers: { 'Authorization': token }
            });
            const data = await res.json();

            if (data.success) {
                setOloGuests(data.data.guests);
                alert(`OLO Sync Complete: Found ${data.data.guests} guests.`);
            } else {
                alert('OLO Sync Failed.');
            }
        } catch (err) {
            console.error(err);
            alert('Network Error during OLO Sync');
        } finally {
            setLoadingOlo(false);
        }
    };

    const handleInvoiceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        setLoadingOCR(true);
        const file = e.target.files[0];
        const formData = new FormData();
        formData.append('invoice', file);

        try {
            const baseUrl = import.meta.env.PROD ? '/api/v1' : 'http://localhost:3001/api/v1';
            const token = user.role === 'admin'
                ? 'Bearer mock-token'
                : `Bearer store-${user.id}-${user.role || 'manager'}`;

            const res = await fetch(`${baseUrl}/automation/ocr-invoice`, {
                method: 'POST',
                headers: { 'Authorization': token },
                body: formData
            });
            const data = await res.json();

            if (data.success) {
                // Map OCR items to Purchases state
                const newPurchases = data.data.items.map((item: any, idx: number) => ({
                    id: Date.now() + idx,
                    date: data.data.date,
                    item: item.item,
                    qty: item.qty,
                    cost: item.cost
                }));

                setPurchases([...purchases, ...newPurchases]);
                alert(`OCR Complete: Extracted ${newPurchases.length} items from ${data.data.vendor} invoice.`);
            } else {
                alert('OCR Failed to read invoice.');
            }
        } catch (err) {
            console.error(err);
            alert('Network Error during OCR');
        } finally {
            setLoadingOCR(false);
            e.target.value = ''; // Reset input
        }
    };

    // ---------------------------

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            // Convert inventory record to array
            const inventoryArray = Object.entries(inventory).map(([item, qty]) => ({
                item,
                qty: Number(qty)
            })).filter(i => i.qty > 0);

            const payload = {
                store_id: storeId,
                date,
                dineInGuests: Number(dineInGuests),
                oloGuests: Number(oloGuests),
                inventory: inventoryArray,
                purchases: purchases.map(p => ({
                    date: p.date,
                    item: p.item,
                    qty: Number(p.qty),
                    cost: Number(p.cost)
                }))
            };

            const baseUrl = import.meta.env.PROD ? '/api/v1' : 'http://localhost:3001/api/v1';
            const token = user.role === 'admin'
                ? 'Bearer mock-token'
                : `Bearer store-${user.id}-${user.role || 'manager'}`;

            const res = await fetch(`${baseUrl}/inventory/weekly-close`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token
                },
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
        <form onSubmit={handleSubmit} className="p-4 md:p-6 bg-[#1a1a1a] text-white rounded-xl shadow-2xl border border-white/5 max-h-[90vh] overflow-y-auto w-full max-w-2xl mx-auto">
            {/* Header */}
            <div className="border-b border-white/10 pb-4 mb-6 sticky top-0 bg-[#1a1a1a] z-10 pt-2">
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-xl md:text-2xl font-serif text-brand-gold">Manager Weekly Close</h2>
                        <p className="text-gray-400 text-xs md:text-sm">Input Sunday Counts & Weekly Invoices</p>
                    </div>
                    <div className="bg-blue-900/20 text-blue-300 text-xs px-2 py-1 rounded border border-blue-800/50 flex items-center">
                        <FileText className="w-3 h-3 mr-1" />
                        <span className="hidden md:inline">Week 10 (Active)</span>
                        <span className="md:hidden">Wk 10</span>
                    </div>
                </div>
            </div>

            {/* Section 1: Guest Counts & Automation */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* Date & Guests */}
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs uppercase text-gray-500 mb-1">Closing Date (Sunday)</label>
                        <input
                            type="date"
                            required
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full bg-black/50 border border-white/10 rounded p-3 text-white focus:border-brand-gold outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-xs uppercase text-gray-500 mb-1">Dine-In Guests (Manual)</label>
                        <input
                            type="number"
                            required
                            placeholder="e.g. 800"
                            value={dineInGuests}
                            onChange={(e) => setDineInGuests(Number(e.target.value))}
                            className="w-full bg-black/50 border border-white/10 rounded p-3 text-white focus:border-brand-gold outline-none text-lg font-mono"
                        />
                    </div>
                </div>

                {/* Automation Tools */}
                <div className="bg-white/5 p-4 rounded-lg border border-white/5 space-y-4">
                    <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-2 border-b border-white/10 pb-2">
                        Data Automation
                    </h3>

                    {/* OLO Sync */}
                    <div className="flex justify-between items-center">
                        <div>
                            <span className="block text-sm text-white font-bold">OLO Sales Integration</span>
                            <span className="text-xs text-gray-500">Syncs guest counts via API</span>
                        </div>
                        <button
                            type="button"
                            onClick={handleOloSync}
                            disabled={loadingOlo}
                            className={`px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider flex items-center transition-all ${loadingOlo ? 'bg-gray-800 text-gray-500' : 'bg-blue-900/30 text-blue-400 border border-blue-500/30 hover:bg-blue-900/50'
                                }`}
                        >
                            {loadingOlo ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <DownloadCloud className="w-3 h-3 mr-1" />}
                            MY OLO
                        </button>
                    </div>
                    {/* OLO Result Display */}
                    {Number(oloGuests) > 0 && (
                        <div className="bg-black/30 p-2 rounded flex justify-between items-center border border-white/5">
                            <span className="text-xs text-gray-400">Synced OLO Guests:</span>
                            <span className="text-sm font-mono text-brand-gold font-bold">{oloGuests}</span>
                        </div>
                    )}

                    {/* Invoice OCR */}
                    <div className="flex justify-between items-center pt-2 border-t border-white/5">
                        <div>
                            <span className="block text-sm text-white font-bold">Invoice Scanner</span>
                            <span className="text-xs text-gray-500">Auto-extract items from PDF</span>
                        </div>
                        <label className={`cursor-pointer px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider flex items-center transition-all ${loadingOCR ? 'bg-gray-800 text-gray-500' : 'bg-green-900/30 text-green-400 border border-green-500/30 hover:bg-green-900/50'
                            }`}>
                            {loadingOCR ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Upload className="w-3 h-3 mr-1" />}
                            SCAN PDF
                            <input
                                type="file"
                                accept=".pdf,.png,.jpg,.jpeg"
                                className="hidden"
                                onChange={handleInvoiceUpload}
                                disabled={loadingOCR}
                            />
                        </label>
                    </div>
                </div>
            </div>

            {/* Total Impact Bar */}
            <div className="mb-8 p-3 bg-brand-gold/10 border border-brand-gold/20 rounded flex justify-between items-center">
                <span className="text-sm font-bold text-brand-gold uppercase tracking-wider">Total Guest Count</span>
                <span className="text-2xl font-mono font-bold text-white">{totalGuests}</span>
            </div>

            {/* Section 2: Physical Inventory */}
            <div className="mb-8">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center border-b border-white/10 pb-2">
                    <Calendar className="w-4 h-4 mr-2 text-brand-gold" />
                    Physical Inventory (Lbs)
                </h3>
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                    {INVENTORY_CATEGORIES.map((cat) => (
                        <div key={cat} className="bg-white/5 p-3 rounded border border-white/5">
                            <label className="block text-xs uppercase text-gray-400 mb-1 font-bold">{cat}</label>
                            <input
                                type="number"
                                step="0.1"
                                placeholder="0.0"
                                value={inventory[cat] ?? ''}
                                onChange={(e) => handleInventoryChange(cat, e.target.value)}
                                className="w-full bg-black border border-white/10 rounded p-2 text-white font-mono text-lg focus:border-brand-gold outline-none"
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* Section 3: Purchases Table */}
            <div className="mb-8">
                <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
                    <h3 className="text-lg font-bold text-white">Weekly Invoices</h3>
                    <button type="button" onClick={addPurchase} className="text-xs bg-gray-800 text-gray-300 px-3 py-1 rounded font-bold flex items-center hover:bg-gray-700 transition-colors border border-white/10">
                        <Plus className="w-3 h-3 mr-1" /> Manual Add
                    </button>
                </div>

                {purchases.length === 0 && (
                    <div className="text-center p-6 border border-dashed border-white/10 rounded bg-white/5">
                        <p className="text-gray-400 text-sm mb-2">No invoices uploaded yet.</p>
                        <p className="text-gray-600 text-xs">Use the <span className="text-green-400 font-bold">SCAN PDF</span> button above or add manually.</p>
                    </div>
                )}

                <div className="space-y-2">
                    {purchases.map((p) => (
                        <div key={p.id} className="grid grid-cols-12 gap-1 items-center bg-black/30 p-2 rounded border border-white/5 text-xs md:text-sm">
                            <div className="col-span-3">
                                <input
                                    type="date"
                                    value={p.date}
                                    onChange={(e) => updatePurchase(p.id, 'date', e.target.value)}
                                    className="w-full bg-transparent text-gray-400 border-none focus:ring-0 p-0"
                                />
                            </div>
                            <div className="col-span-4">
                                <input
                                    type="text"
                                    value={p.item}
                                    onChange={(e) => updatePurchase(p.id, 'item', e.target.value)}
                                    className="w-full bg-transparent font-bold text-white border-none focus:ring-0 p-0"
                                />
                            </div>
                            <div className="col-span-2">
                                <input
                                    type="number"
                                    placeholder="#"
                                    value={p.qty}
                                    onChange={(e) => updatePurchase(p.id, 'qty', e.target.value)}
                                    className="w-full bg-white/5 rounded px-1 py-1 text-white border border-white/10 text-center"
                                />
                            </div>
                            <div className="col-span-2">
                                <input
                                    type="number"
                                    placeholder="$"
                                    value={p.cost}
                                    onChange={(e) => updatePurchase(p.id, 'cost', e.target.value)}
                                    className="w-full bg-white/5 rounded px-1 py-1 text-brand-gold border border-white/10 text-center"
                                />
                            </div>
                            <div className="col-span-1 text-right">
                                <button type="button" onClick={() => removePurchase(p.id)} className="text-red-500 hover:text-red-400 p-1">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Footer Actions */}
            <div className="sticky bottom-0 bg-[#1a1a1a] pt-4 pb-2 border-t border-white/10 flex flex-col md:flex-row justify-end space-y-3 md:space-y-0 md:space-x-4">
                <button type="button" onClick={onClose} className="w-full md:w-auto px-4 py-3 md:py-2 text-gray-400 hover:text-white transition-colors border border-transparent hover:border-white/10 rounded">
                    Cancel
                </button>
                <button type="submit" className="w-full md:w-auto px-6 py-3 md:py-2 bg-brand-red hover:bg-red-700 text-white font-bold rounded flex justify-center items-center shadow-lg shadow-red-900/20 transition-all uppercase tracking-wider text-sm">
                    <Save className="w-4 h-4 mr-2" />
                    Submit Weekly Close
                </button>
            </div>
        </form>
    );
};


import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
    Plus,
    Trash2,
    ShoppingBag,
    Store as StoreIcon,
    Check,
    X,
    Truck,
    UtensilsCrossed,
    Flame
} from 'lucide-react';

export const CompanySettings = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'products' | 'stores'>('products');

    // Data State
    const [products, setProducts] = useState<any[]>([]);
    const [stores, setStores] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Form State
    const [isAdding, setIsAdding] = useState(false);
    const [newItemName, setNewItemName] = useState('');
    const [newItemLocation, setNewItemLocation] = useState(''); // For store
    const [newItemCategory, setNewItemCategory] = useState('Beef'); // For product
    const [isVillain, setIsVillain] = useState(false);
    const [isDinnerOnly, setIsDinnerOnly] = useState(false);
    const [includeInDelivery, setIncludeInDelivery] = useState(false);

    const API_URL = (import.meta as any).env.VITE_API_URL || '';

    const fetchData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'products') {
                const res = await fetch(`${API_URL}/api/v1/dashboard/company/products`, {
                    headers: { 'Authorization': `Bearer ${user?.token}` }
                });
                if (res.ok) setProducts(await res.json());
            } else {
                const res = await fetch(`${API_URL}/api/v1/dashboard/company/stores`, {
                    headers: { 'Authorization': `Bearer ${user?.token}` }
                });
                if (res.ok) setStores(await res.json());
            }
        } catch (error) {
            console.error('Fetch Error:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user?.token) fetchData();
    }, [user?.token, activeTab]);

    const handleAdd = async () => {
        if (!newItemName) return;

        try {
            const endpoint = activeTab === 'products' ? '/company/products' : '/company/stores';
            const body = activeTab === 'products' ? {
                name: newItemName,
                category: newItemCategory,
                is_villain: isVillain,
                is_dinner_only: isDinnerOnly,
                include_in_delivery: includeInDelivery
            } : {
                store_name: newItemName,
                location: newItemLocation || newItemName
            };

            const res = await fetch(`${API_URL}/api/v1/dashboard${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user?.token}`
                },
                body: JSON.stringify(body)
            });

            if (res.ok) {
                setIsAdding(false);
                setNewItemName('');
                setNewItemLocation('');
                fetchData();
            } else {
                alert('Failed to add item');
            }
        } catch (error) {
            console.error('Add Error:', error);
        }
    };

    const handleDelete = async (id: string | number) => {
        if (!window.confirm('Are you sure you want to delete this item? This action is logged.')) return;

        try {
            const endpoint = activeTab === 'products' ? `/company/products/${id}` : `/company/stores/${id}`;
            const res = await fetch(`${API_URL}/api/v1/dashboard${endpoint}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${user?.token}` }
            });

            if (res.ok) {
                fetchData();
            } else {
                alert('Failed to delete item');
            }
        } catch (error) {
            console.error('Delete Error:', error);
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-black text-white uppercase tracking-tighter">Company Settings</h1>
                    <p className="text-gray-500 text-sm">Manage Master Ledger & Network Topology</p>
                </div>
                <div className="flex bg-[#1a1a1a] rounded-lg p-1 border border-white/10">
                    <button
                        onClick={() => setActiveTab('products')}
                        className={`px-4 py-2 rounded text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'products' ? 'bg-[#C5A059] text-black shadow-lg' : 'text-gray-500 hover:text-white'}`}
                    >
                        <UtensilsCrossed className="w-4 h-4" /> products
                    </button>
                    <button
                        onClick={() => setActiveTab('stores')}
                        className={`px-4 py-2 rounded text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'stores' ? 'bg-[#C5A059] text-black shadow-lg' : 'text-gray-500 hover:text-white'}`}
                    >
                        <StoreIcon className="w-4 h-4" /> stores
                    </button>
                </div>
            </div>

            {/* ACTION BAR */}
            <div className="flex justify-end">
                <button
                    onClick={() => setIsAdding(true)}
                    className="px-6 py-3 bg-[#0F0F0F] border border-[#C5A059]/30 text-[#C5A059] rounded hover:bg-[#C5A059] hover:text-black transition-all text-xs font-bold uppercase tracking-widest flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" /> Add {activeTab === 'products' ? 'Product' : 'Store'}
                </button>
            </div>

            {/* ADD MODAL / FORM OVERLAY */}
            {isAdding && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#1a1a1a] border border-[#C5A059]/30 rounded-xl p-8 max-w-lg w-full shadow-2xl relative">
                        <button onClick={() => setIsAdding(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white">
                            <X className="w-6 h-6" />
                        </button>
                        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                            <Plus className="w-6 h-6 text-[#C5A059]" />
                            Add New {activeTab === 'products' ? 'Product' : 'Store'}
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest block mb-1">Name</label>
                                <input
                                    type="text"
                                    className="w-full bg-black border border-white/10 rounded p-3 text-white focus:border-[#C5A059] outline-none"
                                    placeholder={activeTab === 'products' ? "e.g., Wagyu Ribeye" : "e.g., Miami Beach"}
                                    value={newItemName}
                                    onChange={(e) => setNewItemName(e.target.value)}
                                />
                            </div>

                            {activeTab === 'stores' && (
                                <div>
                                    <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest block mb-1">Location / State</label>
                                    <input
                                        type="text"
                                        className="w-full bg-black border border-white/10 rounded p-3 text-white focus:border-[#C5A059] outline-none"
                                        placeholder="e.g., FL"
                                        value={newItemLocation}
                                        onChange={(e) => setNewItemLocation(e.target.value)}
                                    />
                                </div>
                            )}

                            {activeTab === 'products' && (
                                <>
                                    <div>
                                        <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest block mb-1">Category</label>
                                        <select
                                            className="w-full bg-black border border-white/10 rounded p-3 text-white focus:border-[#C5A059] outline-none"
                                            value={newItemCategory}
                                            onChange={(e) => setNewItemCategory(e.target.value)}
                                        >
                                            <option value="Beef">Beef</option>
                                            <option value="Pork">Pork</option>
                                            <option value="Lamb">Lamb</option>
                                            <option value="Chicken">Chicken</option>
                                            <option value="Sausage">Sausage</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <label className="flex items-center gap-3 p-3 bg-black border border-white/10 rounded cursor-pointer hover:border-white/30 transition-colors">
                                            <input type="checkbox" checked={isVillain} onChange={(e) => setIsVillain(e.target.checked)} className="accent-[#C5A059]" />
                                            <span className="text-xs font-bold text-gray-300">Is Villain (High Cost)</span>
                                        </label>
                                        <label className="flex items-center gap-3 p-3 bg-black border border-white/10 rounded cursor-pointer hover:border-white/30 transition-colors">
                                            <input type="checkbox" checked={isDinnerOnly} onChange={(e) => setIsDinnerOnly(e.target.checked)} className="accent-[#C5A059]" />
                                            <span className="text-xs font-bold text-gray-300">Dinner Only</span>
                                        </label>
                                        <label className="col-span-2 flex items-center gap-3 p-3 bg-black border border-[#00FF94]/20 rounded cursor-pointer hover:border-[#00FF94]/50 transition-colors">
                                            <input type="checkbox" checked={includeInDelivery} onChange={(e) => setIncludeInDelivery(e.target.checked)} className="accent-[#00FF94]" />
                                            <div>
                                                <span className="text-xs font-bold text-[#00FF94] block">Include in Delivery (OLO Auto-Track)</span>
                                                <span className="text-[10px] text-gray-500">Automatically scans invoices & delivery sales for this item.</span>
                                            </div>
                                        </label>
                                    </div>
                                </>
                            )}

                            <button
                                onClick={handleAdd}
                                className="w-full py-4 bg-[#C5A059] text-black font-black uppercase tracking-widest rounded hover:bg-[#d6b579] transition-all mt-4"
                            >
                                Create Item
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* LIST */}
            <div className="bg-[#1a1a1a] border border-white/5 rounded-xl overflow-hidden shadow-2xl">
                {activeTab === 'products' ? (
                    <table className="w-full">
                        <thead className="bg-black text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                            <tr>
                                <th className="p-4 text-left">Name</th>
                                <th className="p-4 text-left">Category</th>
                                <th className="p-4 text-center">Attributes</th>
                                <th className="p-4 text-center">Automation</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {products.map((p: any) => (
                                <tr key={p.id} className="hover:bg-white/5 transition-colors group">
                                    <td className="p-4 font-bold text-white">{p.name}</td>
                                    <td className="p-4 text-gray-400 text-xs">{p.category || '-'}</td>
                                    <td className="p-4 flex gap-2 justify-center">
                                        {p.is_villain && <span className="px-2 py-1 bg-red-500/20 text-red-500 text-[9px] font-bold uppercase rounded border border-red-500/30">Villain</span>}
                                        {p.is_dinner_only && <span className="px-2 py-1 bg-blue-500/20 text-blue-500 text-[9px] font-bold uppercase rounded border border-blue-500/30">Dinner Only</span>}
                                    </td>
                                    <td className="p-4 text-center">
                                        {p.include_in_delivery ? (
                                            <span className="flex items-center justify-center gap-1 text-[#00FF94] text-[10px] font-bold uppercase tracking-wider">
                                                <Truck className="w-3 h-3" /> Auto-Track
                                            </span>
                                        ) : (
                                            <span className="text-gray-700 text-[10px] uppercase font-bold">-</span>
                                        )}
                                    </td>
                                    <td className="p-4 text-right">
                                        <button onClick={() => handleDelete(p.id)} className="text-gray-600 hover:text-red-500 transition-colors p-2">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <table className="w-full">
                        <thead className="bg-black text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                            <tr>
                                <th className="p-4 text-left">Store Name</th>
                                <th className="p-4 text-left">Location</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {stores.map((s: any) => (
                                <tr key={s.id} className="hover:bg-white/5 transition-colors group">
                                    <td className="p-4 font-bold text-white">{s.store_name}</td>
                                    <td className="p-4 text-gray-400 text-xs">{s.location}</td>
                                    <td className="p-4 text-right">
                                        <button onClick={() => handleDelete(s.id)} className="text-gray-600 hover:text-red-500 transition-colors p-2">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {loading && (
                    <div className="p-12 text-center text-gray-500 text-xs uppercase tracking-widest animate-pulse">
                        Loading Ledger Data...
                    </div>
                )}
            </div>
        </div>
    );
};

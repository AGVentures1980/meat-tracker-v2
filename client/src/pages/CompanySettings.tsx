
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
    Plus,
    Trash2,
    Store as StoreIcon,
    X,
    Truck,
    UtensilsCrossed
} from 'lucide-react';

export const CompanySettings = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'products' | 'stores' | 'templates'>('products');

    // Data State
    const [products, setProducts] = useState<any[]>([]);
    const [stores, setStores] = useState<any[]>([]);
    const [templates, setTemplates] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Form State
    const [isAdding, setIsAdding] = useState(false);
    const [newItemName, setNewItemName] = useState('');
    const [newItemLocation, setNewItemLocation] = useState(''); // For store
    const [newItemCategory, setNewItemCategory] = useState('Beef'); // For product
    const [isVillain, setIsVillain] = useState(false);
    const [isDinnerOnly, setIsDinnerOnly] = useState(false);
    const [includeInDelivery, setIncludeInDelivery] = useState(false);
    const [newProteinGroup, setNewProteinGroup] = useState('');

    // Template Form State
    const [tplLbs, setTplLbs] = useState('1.76');
    const [tplCost, setTplCost] = useState('9.94');
    const [tplDinner, setTplDinner] = useState('58.90');
    const [tplLunch, setTplLunch] = useState('29.90');
    const [tplLamb, setTplLamb] = useState(false);

    const API_URL = (import.meta as any).env.VITE_API_URL || '';

    const fetchData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'products') {
                const res = await fetch(`${API_URL}/api/v1/dashboard/company/products`, {
                    headers: { 'Authorization': `Bearer ${user?.token}` }
                });
                if (res.ok) setProducts(await res.json());
            } else if (activeTab === 'stores') {
                const res = await fetch(`${API_URL}/api/v1/dashboard/company/stores`, {
                    headers: { 'Authorization': `Bearer ${user?.token}` }
                });
                if (res.ok) setStores(await res.json());
            } else {
                const res = await fetch(`${API_URL}/api/v1/dashboard/company/templates`, {
                    headers: { 'Authorization': `Bearer ${user?.token}` }
                });
                if (res.ok) setTemplates(await res.json());
            }
        } catch (error) {
            console.error('Fetch Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApplyTemplate = async (storeId: number, templateId: string) => {
        if (!window.confirm('Apply this template? This will overwrite store targets and prices.')) return;
        try {
            const res = await fetch(`${API_URL}/api/v1/dashboard/company/stores/${storeId}/apply-template`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user?.token}`
                },
                body: JSON.stringify({ template_id: templateId })
            });
            if (res.ok) {
                alert('Template applied successfully!');
                fetchData();
            } else {
                alert('Failed to apply template');
            }
        } catch (error) {
            console.error('Apply Template Error:', error);
        }
    };

    useEffect(() => {
        if (user?.token) fetchData();
    }, [user?.token, activeTab]);

    const handleAdd = async () => {
        if (!newItemName) return;

        try {
            const endpointBase = activeTab === 'products' ? '/company/products' : '/company/stores';
            const body = activeTab === 'products' ? {
                name: newItemName,
                protein_group: newProteinGroup || null,
                category: newItemCategory,
                is_villain: isVillain,
                is_dinner_only: isDinnerOnly,
                include_in_delivery: includeInDelivery
            } : activeTab === 'stores' ? {
                store_name: newItemName,
                location: newItemLocation || newItemName
            } : {
                name: newItemName,
                description: newItemLocation, // Reuse location field for desc
                config: {
                    target_lbs_guest: parseFloat(tplLbs),
                    target_cost_guest: parseFloat(tplCost),
                    dinner_price: parseFloat(tplDinner),
                    lunch_price: parseFloat(tplLunch),
                    serves_lamb_chops_rodizio: tplLamb,
                    protein_targets: {} // Default empty for now, or copy from constraints?
                }
            };

            const endpoint = activeTab === 'templates' ? '/company/templates' : endpointBase;

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
                setNewProteinGroup('');
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
                    <button
                        onClick={() => setActiveTab('templates')}
                        className={`px-4 py-2 rounded text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'templates' ? 'bg-[#C5A059] text-black shadow-lg' : 'text-gray-500 hover:text-white'}`}
                    >
                        <Plus className="w-4 h-4" /> templates
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
                                    <div>
                                        <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest block mb-1">Protein Group <span className="text-gray-600 normal-case">(for reporting aggregation)</span></label>
                                        <input
                                            type="text"
                                            className="w-full bg-black border border-white/10 rounded p-3 text-white focus:border-[#C5A059] outline-none"
                                            placeholder="e.g., Filet Mignon, Picanha, Fraldinha..."
                                            value={newProteinGroup}
                                            onChange={(e) => setNewProteinGroup(e.target.value)}
                                        />
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

                            {activeTab === 'templates' && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest block mb-1">Description</label>
                                        <input
                                            type="text"
                                            className="w-full bg-black border border-white/10 rounded p-3 text-white focus:border-[#C5A059] outline-none"
                                            placeholder="e.g., Standard 2024 Operation Model"
                                            value={newItemLocation}
                                            onChange={(e) => setNewItemLocation(e.target.value)}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest block mb-1">Target LBS/Guest</label>
                                            <input type="number" step="0.01" value={tplLbs} onChange={(e) => setTplLbs(e.target.value)} className="w-full bg-black border border-white/10 rounded p-3 text-white focus:border-[#C5A059] outline-none" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest block mb-1">Target Cost/Guest</label>
                                            <input type="number" step="0.01" value={tplCost} onChange={(e) => setTplCost(e.target.value)} className="w-full bg-black border border-white/10 rounded p-3 text-white focus:border-[#C5A059] outline-none" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest block mb-1">Dinner Price</label>
                                            <input type="number" step="0.01" value={tplDinner} onChange={(e) => setTplDinner(e.target.value)} className="w-full bg-black border border-white/10 rounded p-3 text-white focus:border-[#C5A059] outline-none" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest block mb-1">Lunch Price</label>
                                            <input type="number" step="0.01" value={tplLunch} onChange={(e) => setTplLunch(e.target.value)} className="w-full bg-black border border-white/10 rounded p-3 text-white focus:border-[#C5A059] outline-none" />
                                        </div>
                                    </div>
                                    <label className="flex items-center gap-3 p-3 bg-black border border-white/10 rounded cursor-pointer hover:border-white/30 transition-colors">
                                        <input type="checkbox" checked={tplLamb} onChange={(e) => setTplLamb(e.target.checked)} className="accent-[#C5A059]" />
                                        <span className="text-xs font-bold text-gray-300">Serves Lamb Chops in Rodizio?</span>
                                    </label>
                                </div>
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
                                <th className="p-4 text-left">Group</th>
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
                                    <td className="p-4">
                                        {p.protein_group ? (
                                            <span className="px-2 py-1 bg-[#C5A059]/10 text-[#C5A059] text-[9px] font-bold uppercase rounded border border-[#C5A059]/30">
                                                {p.protein_group}
                                            </span>
                                        ) : (
                                            <span className="text-gray-700 text-[10px]">—</span>
                                        )}
                                    </td>
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
                ) : activeTab === 'stores' ? (
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
                                    <td className="p-4 text-right flex items-center justify-end gap-2">
                                        <select
                                            className="bg-[#111] border border-white/10 text-white text-[10px] p-1 rounded outline-none w-24"
                                            onChange={(e) => {
                                                if (e.target.value) handleApplyTemplate(s.id, e.target.value);
                                                e.target.value = ''; // Reset
                                            }}
                                        >
                                            <option value="">Apply Template...</option>
                                            {templates.map(t => (
                                                <option key={t.id} value={t.id}>{t.name}</option>
                                            ))}
                                        </select>
                                        <button onClick={() => handleDelete(s.id)} className="text-gray-600 hover:text-red-500 transition-colors p-2">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    /* Templates Tab */
                    <div className="p-6 space-y-4">
                        <div className="flex justify-between items-center mb-2">
                            <p className="text-gray-500 text-xs">Templates de operação pré-configurados. Aplique a qualquer loja via Settings → Lojas.</p>
                            {(user?.role === 'admin' || user?.role === 'director') && (
                                <button onClick={() => setIsAdding(true)} className="px-4 py-2 bg-[#C5A059]/10 border border-[#C5A059]/30 text-[#C5A059] text-xs font-bold uppercase tracking-widest rounded hover:bg-[#C5A059] hover:text-black transition-all flex items-center gap-2">
                                    <Plus className="w-3 h-3" /> Começar do Zero
                                </button>
                            )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {templates.map((t: any) => {
                                const cfg = t.config || {};
                                const proteins = Object.entries(cfg.protein_targets || {}).slice(0, 3);
                                return (
                                    <div key={t.id} className="bg-black border border-white/10 rounded-xl p-5 hover:border-[#C5A059]/40 transition-all">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <h3 className="text-white font-bold text-sm">{t.name}</h3>
                                                <p className="text-gray-500 text-xs mt-0.5">{t.description}</p>
                                            </div>
                                            {t.is_system && (
                                                <span className="text-[8px] font-bold uppercase tracking-widest bg-[#C5A059]/10 text-[#C5A059] border border-[#C5A059]/30 px-2 py-1 rounded">Sistema</span>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 mb-3">
                                            <div className="bg-[#111] rounded p-2">
                                                <p className="text-[9px] text-gray-600 uppercase tracking-widest">LBS/Guest</p>
                                                <p className="text-white font-mono font-bold text-sm">{cfg.target_lbs_guest ?? '—'}</p>
                                            </div>
                                            <div className="bg-[#111] rounded p-2">
                                                <p className="text-[9px] text-gray-600 uppercase tracking-widest">Cost/Guest</p>
                                                <p className="text-white font-mono font-bold text-sm">{cfg.target_cost_guest ? `$${cfg.target_cost_guest}` : '—'}</p>
                                            </div>
                                            <div className="bg-[#111] rounded p-2">
                                                <p className="text-[9px] text-gray-600 uppercase tracking-widest">Dinner</p>
                                                <p className="text-white font-mono font-bold text-sm">{cfg.dinner_price ? `$${cfg.dinner_price}` : '—'}</p>
                                            </div>
                                            <div className="bg-[#111] rounded p-2">
                                                <p className="text-[9px] text-gray-600 uppercase tracking-widest">Lamb Chops</p>
                                                <p className={`font-mono font-bold text-sm ${cfg.serves_lamb_chops_rodizio ? 'text-[#C5A059]' : 'text-gray-600'}`}>
                                                    {cfg.serves_lamb_chops_rodizio ? 'Incluso' : 'Não'}
                                                </p>
                                            </div>
                                        </div>
                                        {proteins.length > 0 && (
                                            <div className="flex gap-1 flex-wrap">
                                                {proteins.map(([name, val]: any) => (
                                                    <span key={name} className="text-[9px] bg-white/5 text-gray-400 px-2 py-0.5 rounded font-mono">
                                                        {name}: {(val * 100).toFixed(0)}%
                                                    </span>
                                                ))}
                                                {Object.keys(cfg.protein_targets || {}).length > 3 && (
                                                    <span className="text-[9px] text-gray-600 px-2 py-0.5">+{Object.keys(cfg.protein_targets).length - 3} more</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
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

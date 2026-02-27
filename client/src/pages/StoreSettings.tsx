import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    Save,
    Store,
    Clock,
    Ban,
    Beef,
    AlertCircle
} from 'lucide-react';

interface StoreSetting {
    id: number;
    store_name: string;
    is_lunch_enabled: boolean;
    lunch_start_time: string | null;
    lunch_end_time: string | null;
    dinner_start_time: string | null;
    dinner_end_time: string | null;
    lunch_price: number;
    dinner_price: number;
    target_lbs_guest: number;
    lunch_target_lbs_guest: number | null;
    lunch_excluded_proteins: string[];
    serves_lamb_chops_rodizio: boolean;
}

export default function StoreSettings() {
    const { user } = useAuth();
    const location = useLocation();

    const [networkStores, setNetworkStores] = useState<any[]>([]);
    const [selectedStoreId, setSelectedStoreId] = useState<number | null>(location.state?.storeId || null);
    const [settings, setSettings] = useState<StoreSetting | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Standard proteins that are always excluded from lunch
    const LUNCH_EXCLUDED = [
        "Filet Mignon", "Filet with Bacon", "Beef Ribs", "Lamb Chops"
    ];

    useEffect(() => {
        if (['admin', 'director', 'owner'].includes(user?.role || '')) {
            fetchNetworkStores();
        } else {
            setError("Access denied. Admin or Owner privileges required.");
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (selectedStoreId) {
            fetchStoreSettings(selectedStoreId);
        }
    }, [selectedStoreId]);

    const fetchNetworkStores = async () => {
        try {
            const res = await fetch('/api/v1/dashboard/smart-prep/network-status', {
                headers: { 'Authorization': `Bearer ${user?.token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setNetworkStores(data.locations || []);

                // If a store wasn't passed via navigation state, select the first one
                if (data.locations && data.locations.length > 0 && !location.state?.storeId) {
                    setSelectedStoreId(data.locations[0].store_id);
                }
            }
        } catch (err) {
            console.error("Failed to fetch stores", err);
        }
    };

    const fetchStoreSettings = async (storeId: number) => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/v1/dashboard/store-settings/${storeId}`, {
                headers: { 'Authorization': `Bearer ${user?.token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setSettings(data);
            } else {
                setError("Failed to load store settings.");
            }
        } catch (err) {
            setError("Network error fetching store settings.");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!settings || !selectedStoreId) return;
        setSaving(true);
        setError(null);
        setSuccess(null);

        try {
            const res = await fetch(`/api/v1/dashboard/store-settings/${selectedStoreId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${user?.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(settings)
            });

            if (res.ok) {
                setSuccess("Store operations settings saved successfully.");
                setTimeout(() => setSuccess(null), 3000);
            } else {
                const data = await res.json();
                setError(data.error || "Failed to save settings.");
            }
        } catch (err) {
            setError("Network error formatting the request.");
        } finally {
            setSaving(false);
        }
    };

    const applyDefaultExclusions = () => {
        if (!settings) return;
        setSettings({ ...settings, lunch_excluded_proteins: LUNCH_EXCLUDED });
    };

    if (error && !settings) {
        return (
            <div className="p-8 text-center text-red-500 font-bold">{error}</div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6 p-6">

            {/* Header & Store Selector */}
            <div className="bg-[#1a1a1a] p-6 rounded-xl border border-white/5 shadow-2xl flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                        <Store className="w-8 h-8 text-[#C5A059]" />
                        Store Operations Configuration
                    </h1>
                    <p className="text-sm text-gray-400 mt-1">Manage shift hours, target metrics, and menu exclusions per store.</p>
                </div>

                <div className="relative">
                    <select
                        value={selectedStoreId || ''}
                        onChange={(e) => setSelectedStoreId(Number(e.target.value))}
                        className="appearance-none w-full min-w-[250px] bg-[#252525] border border-white/10 rounded-lg px-4 py-3 pr-10 text-white font-bold cursor-pointer hover:bg-[#333] transition-colors focus:outline-none focus:border-[#C5A059]"
                    >
                        {networkStores.map(store => (
                            <option key={store.store_id} value={store.store_id}>
                                {store.store_name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-lg flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <p className="text-sm font-medium">{error}</p>
                </div>
            )}
            {success && (
                <div className="bg-[#00FF94]/10 border border-[#00FF94]/30 text-[#00FF94] p-4 rounded-lg flex items-center gap-3">
                    <Save className="w-5 h-5 flex-shrink-0" />
                    <p className="text-sm font-medium">{success}</p>
                </div>
            )}

            {loading || !settings ? (
                <div className="flex justify-center p-20">
                    <div className="w-8 h-8 border-4 border-[#C5A059] border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    {/* GENERAL CONFIG */}
                    <div className="bg-[#1a1a1a] p-6 rounded-xl border border-white/5 shadow-xl space-y-6">
                        <h2 className="text-lg font-bold text-[#C5A059] uppercase tracking-widest border-b border-white/10 pb-2 mb-4">Shift Setup</h2>

                        <label className="flex items-center justify-between p-4 bg-[#252525] rounded-xl border border-white/5 cursor-pointer hover:bg-white/5 transition-colors">
                            <div>
                                <span className="text-sm font-bold text-white block">Dinner Only?</span>
                                <span className="text-xs text-gray-500">If checked, this store does not serve lunch.</span>
                            </div>
                            <div className={`w-12 h-6 rounded-full p-1 transition-colors ${!settings.is_lunch_enabled ? 'bg-[#C5A059]' : 'bg-gray-700'}`}>
                                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${!settings.is_lunch_enabled ? 'translate-x-6' : 'translate-x-0'}`}></div>
                            </div>
                            {/* Hidden input for accessibility/state binding */}
                            <input
                                type="checkbox"
                                className="hidden"
                                checked={!settings.is_lunch_enabled}
                                onChange={(e) => setSettings({ ...settings, is_lunch_enabled: !e.target.checked })}
                            />
                        </label>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> Lunch Starts
                                </label>
                                <input
                                    type="time"
                                    value={settings.lunch_start_time || '11:00'}
                                    onChange={e => setSettings({ ...settings, lunch_start_time: e.target.value })}
                                    className="w-full bg-[#252525] text-white p-3 border border-white/10 rounded-lg focus:outline-none focus:border-[#C5A059]"
                                    disabled={!settings.is_lunch_enabled}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> Lunch Ends
                                </label>
                                <input
                                    type="time"
                                    value={settings.lunch_end_time || '15:00'}
                                    onChange={e => setSettings({ ...settings, lunch_end_time: e.target.value })}
                                    className="w-full bg-[#252525] text-white p-3 border border-white/10 rounded-lg focus:outline-none focus:border-[#C5A059]"
                                    disabled={!settings.is_lunch_enabled}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> Dinner Starts
                                </label>
                                <input
                                    type="time"
                                    value={settings.dinner_start_time || '15:00'}
                                    onChange={e => setSettings({ ...settings, dinner_start_time: e.target.value })}
                                    className="w-full bg-[#252525] text-white p-3 border border-white/10 rounded-lg focus:outline-none focus:border-[#C5A059]"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> Dinner Ends
                                </label>
                                <input
                                    type="time"
                                    value={settings.dinner_end_time || '22:00'}
                                    onChange={e => setSettings({ ...settings, dinner_end_time: e.target.value })}
                                    className="w-full bg-[#252525] text-white p-3 border border-white/10 rounded-lg focus:outline-none focus:border-[#C5A059]"
                                />
                            </div>
                        </div>

                        <h2 className="text-lg font-bold text-[#C5A059] uppercase tracking-widest border-b border-white/10 pb-2 mb-4 mt-8">Financial Targets</h2>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Lunch Target Lbs/Guest</label>
                                <input
                                    type="number" step="0.01"
                                    value={settings.lunch_target_lbs_guest || ''}
                                    onChange={e => setSettings({ ...settings, lunch_target_lbs_guest: parseFloat(e.target.value) })}
                                    placeholder="Optional (e.g. 1.45)"
                                    className="w-full bg-[#252525] text-white p-3 border border-white/10 rounded-lg focus:outline-none focus:border-[#C5A059]"
                                    disabled={!settings.is_lunch_enabled}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Dinner Target Lbs/Guest</label>
                                <input
                                    type="number" step="0.01"
                                    value={settings.target_lbs_guest || 1.76}
                                    onChange={e => setSettings({ ...settings, target_lbs_guest: parseFloat(e.target.value) })}
                                    className="w-full bg-[#252525] text-white p-3 border border-white/10 rounded-lg focus:outline-none focus:border-[#C5A059]"
                                />
                            </div>
                        </div>
                    </div>

                    {/* EXCLUSIONS */}
                    <div className="bg-[#1a1a1a] p-6 rounded-xl border border-white/5 shadow-xl space-y-6 flex flex-col">
                        <h2 className="text-lg font-bold text-[#C5A059] uppercase tracking-widest border-b border-white/10 pb-2 mb-4">Menu Exclusions</h2>

                        <label className="flex items-center justify-between p-4 bg-[#252525] rounded-xl border border-white/5 cursor-pointer hover:bg-white/5 transition-colors mb-4">
                            <div>
                                <span className="text-sm font-bold text-white block">Serves Lamb Chops in Rodizio?</span>
                                <span className="text-xs text-gray-500">Enable if Lamb Chops is a standard item on the dinner menu (Not just a VIP request).</span>
                            </div>
                            <div className={`w-12 h-6 rounded-full p-1 transition-colors ${settings.serves_lamb_chops_rodizio ? 'bg-[#C5A059]' : 'bg-gray-700'}`}>
                                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${settings.serves_lamb_chops_rodizio ? 'translate-x-6' : 'translate-x-0'}`}></div>
                            </div>
                            <input
                                type="checkbox"
                                className="hidden"
                                checked={settings.serves_lamb_chops_rodizio}
                                onChange={(e) => setSettings({ ...settings, serves_lamb_chops_rodizio: e.target.checked })}
                            />
                        </label>

                        <div className={`flex-1 ${!settings.is_lunch_enabled ? 'opacity-50 pointer-events-none' : ''}`}>
                            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
                                <Ban className="w-4 h-4 text-red-500" /> Lunch Excluded Proteins
                            </h3>
                            <p className="text-xs text-gray-400 mb-4">The following premium meats are <strong className="text-white">always</strong> auto-removed from the Lunch Smart Prep List across all stores (Corporate Standard).</p>

                            <div className="bg-[#111] border border-white/5 rounded-lg p-2 max-h-[300px] overflow-y-auto">
                                {LUNCH_EXCLUDED.map(protein => (
                                    <div
                                        key={protein}
                                        className="w-full text-left px-4 py-2 rounded-md text-sm font-bold text-gray-500 flex items-center justify-between mb-1"
                                    >
                                        <span className="flex items-center gap-2">
                                            <Beef className="w-4 h-4 text-gray-600" /> {protein}
                                        </span>
                                        <Ban className="w-3 h-3 text-red-500/50" />
                                    </div>
                                ))}
                            </div>

                            {/* Hidden helper button to ensure the DB state matches the UI visual if they ever saved a different array in the past */}
                            {settings.lunch_excluded_proteins?.length !== LUNCH_EXCLUDED.length && (
                                <button onClick={applyDefaultExclusions} className="mt-4 w-full bg-red-500/10 text-red-500 text-xs p-2 rounded border border-red-500/20 font-bold uppercase hover:bg-red-500/20 transition-colors">
                                    Sync Corporate Exclusions to DB
                                </button>
                            )}
                        </div>

                    </div>
                </div>
            )}

            {/* Save Button */}
            {!loading && settings && (
                <div className="flex justify-end pt-4">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className={`flex items-center justify-center gap-2 bg-[#C5A059] hover:bg-[#D4AF37] text-white px-8 py-4 rounded-xl font-bold uppercase tracking-widest transition-all ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {saving ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="w-5 h-5" /> Save Configuration
                            </>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
}

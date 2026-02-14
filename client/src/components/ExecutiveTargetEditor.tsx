import React, { useState, useEffect } from 'react';
import { X, Save, AlertTriangle, Loader2, CheckCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

interface StoreTarget {
    id: number;
    name: string;
    location: string;
    target_lbs_guest: number;
    target_cost_guest: number;
    guests?: number;
}

interface ExecutiveTargetEditorProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
}

export const ExecutiveTargetEditor = ({ isOpen, onClose, onSave }: ExecutiveTargetEditorProps) => {
    const { user } = useAuth();
    const { t } = useLanguage();
    const [stores, setStores] = useState<StoreTarget[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [showResetConfirm, setShowResetConfirm] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchStores();
            setSuccessMsg(null);
            setError(null);
        }
    }, [isOpen]);

    const handleSync = async () => {
        setSyncing(true);
        try {
            const response = await fetch('/api/v1/dashboard/targets/sync', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${user?.token}` }
            });

            if (!response.ok) throw new Error("Failed to sync targets");

            await fetchStores();
            setSuccessMsg(t('targets_reset_success') || "Targets reset successfully to standards.");
            setShowResetConfirm(false);

            // Clear success message after 3 seconds
            setTimeout(() => setSuccessMsg(null), 3000);
        } catch (err) {
            setError(t('error_sync_targets') || "Failed to sync targets.");
        } finally {
            setSyncing(false);
        }
    };

    const fetchStores = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/v1/dashboard/company-stats', {
                headers: { 'Authorization': `Bearer ${user?.token}` }
            });
            const data = await response.json();

            // Consolidate store lists
            const sourceList = data.performance || [
                ...data.top_savers,
                ...data.top_spenders,
                ...data.middle_tier
            ];

            const uniqueStores = Array.from(new Map(sourceList.map((s: any) => [s.id, s])).values());

            const allStoresLists = uniqueStores.map((s: any) => ({
                id: s.id,
                name: s.name,
                location: s.location,
                target_lbs_guest: s.target_lbs_guest || 1.76,
                target_cost_guest: s.target_cost_guest || 9.94,
                guests: s.guests || 0
            }));

            allStoresLists.sort((a: any, b: any) => a.name.localeCompare(b.name));
            setStores(allStoresLists as StoreTarget[]);

        } catch (err) {
            setError(t('error_load_stores') || "Failed to load store list.");
        } finally {
            setLoading(false);
        }
    };

    const handleTargetChange = (id: number, field: 'target_lbs_guest' | 'target_cost_guest', newValue: string) => {
        setStores(prev => prev.map(s =>
            s.id === id ? { ...s, [field]: parseFloat(newValue) || 0 } : s
        ));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const targetsToUpdate = stores.map(s => ({
                storeId: s.id,
                target_lbs_guest: s.target_lbs_guest,
                target_cost_guest: s.target_cost_guest
            }));

            const response = await fetch('/api/v1/dashboard/targets', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user?.token}`
                },
                body: JSON.stringify({ targets: targetsToUpdate })
            });

            if (!response.ok) throw new Error("Failed to save");

            onSave();
            onClose();
        } catch (err) {
            setError(t('error_save_changes') || "Failed to save changes.");
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-center items-center p-4">
            <div className="bg-[#1a1a1a] border border-[#333] rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl relative">

                {/* Reset Confirmation Overlay */}
                {showResetConfirm && (
                    <div className="absolute inset-0 bg-black/90 z-10 flex items-center justify-center rounded-lg backdrop-blur-sm animate-in fade-in">
                        <div className="bg-[#222] border border-red-900/50 p-6 rounded-lg max-w-sm text-center shadow-2xl">
                            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                            <h3 className="text-white font-bold text-lg mb-2">{t('confirm_reset') || "Confirm Reset"}</h3>
                            <p className="text-gray-400 text-sm mb-6">
                                {t('reset_warning') || "Are you sure you want to reset all store targets to the standard defaults? This will overwrite manual changes."}
                            </p>
                            <div className="flex gap-3 justify-center">
                                <button
                                    onClick={() => setShowResetConfirm(false)}
                                    className="px-4 py-2 rounded border border-[#444] text-gray-300 hover:bg-[#333]"
                                >
                                    {t('cancel') || "Cancel"}
                                </button>
                                <button
                                    onClick={handleSync}
                                    disabled={syncing}
                                    className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white font-bold flex items-center gap-2"
                                >
                                    {syncing && <Loader2 className="w-4 h-4 animate-spin" />}
                                    {t('confirm') || "Yes, Reset All"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Header */}
                <div className="p-4 border-b border-[#333] flex justify-between items-center bg-[#222]">
                    <div>
                        <h2 className="text-white font-bold text-lg flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-[#C5A059]" />
                            {t('target_config_title') || "Governance: Target Configuration"}
                        </h2>
                        <p className="text-xs text-gray-400">{t('target_config_subtitle') || "Set specific LBS/Guest and Cost goals per store"}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded text-gray-400 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-4">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-4">
                            <Loader2 className="w-8 h-8 text-[#C5A059] animate-spin" />
                            <span className="text-gray-500 text-sm font-mono uppercase tracking-widest">{t('loading_stores') || "Loading stores..."}</span>
                        </div>
                    ) : (
                        <table className="w-full text-sm border-collapse">
                            <thead className="text-xs text-gray-500 uppercase font-mono border-b border-[#333] bg-[#1a1a1a] sticky top-0 z-0 text-left">
                                <tr>
                                    <th className="px-4 py-3">{t('store') || "Store"}</th>
                                    <th className="px-4 py-3 text-right">Size (Guests/mo)</th>
                                    <th className="px-4 py-3 text-right">Efficiency (LBS/G)</th>
                                    <th className="px-4 py-3 text-right">Financial ($/G)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#333]">
                                {stores.map(store => (
                                    <tr key={store.id} className="hover:bg-white/5 transition-colors">
                                        <td className="px-4 py-2 text-white font-medium">
                                            {store.name}
                                            <span className="text-xs text-gray-500 ml-2 block font-mono">{store.location}</span>
                                        </td>
                                        <td className="px-4 py-2 text-right text-gray-400 font-mono">
                                            {store.guests?.toLocaleString()}
                                        </td>
                                        <td className="px-4 py-2 text-right">
                                            <div className="flex flex-col items-end gap-1">
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    className="bg-[#111] border border-[#444] text-white px-3 py-1.5 rounded-sm w-24 text-right focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059]/50 outline-none transition-all font-mono"
                                                    value={store.target_lbs_guest}
                                                    onChange={(e) => handleTargetChange(store.id, 'target_lbs_guest', e.target.value)}
                                                />
                                            </div>
                                        </td>
                                        <td className="px-4 py-2 text-right">
                                            <div className="flex flex-col items-end gap-1">
                                                <div className="relative">
                                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-600 font-mono">$</span>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        className="bg-[#111] border border-[#444] text-white pl-6 pr-3 py-1.5 rounded-sm w-24 text-right focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059]/50 outline-none transition-all font-mono"
                                                        value={store.target_cost_guest}
                                                        onChange={(e) => handleTargetChange(store.id, 'target_cost_guest', e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                    {error && (
                        <div className="mt-4 p-3 bg-red-900/20 border border-red-900/50 text-red-400 text-xs rounded text-center flex items-center justify-center gap-2 animate-in fade-in">
                            <AlertTriangle className="w-4 h-4" />
                            {error}
                        </div>
                    )}

                    {successMsg && (
                        <div className="mt-4 p-3 bg-green-900/20 border border-green-900/50 text-green-400 text-xs rounded text-center flex items-center justify-center gap-2 animate-in fade-in">
                            <CheckCircle className="w-4 h-4" />
                            {successMsg}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-[#333] bg-[#222] flex justify-end gap-3">
                    <button
                        onClick={() => setShowResetConfirm(true)}
                        disabled={syncing || loading}
                        className="px-4 py-2 rounded text-blue-400 hover:bg-blue-500/10 hover:text-blue-300 disabled:opacity-50 flex items-center gap-2 text-xs font-bold uppercase tracking-wider mr-auto transition-colors"
                    >
                        <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
                        {t('reset_standards') || "Reset to Standards"}
                    </button>

                    <button onClick={onClose} className="px-5 py-2 rounded text-gray-400 hover:text-white hover:bg-white/5 text-xs font-bold uppercase tracking-wider transition-colors">
                        {t('cancel') || "Cancel"}
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving || loading}
                        className="px-6 py-2 rounded-sm bg-[#C5A059] text-black font-bold text-xs hover:bg-[#D4AF37] disabled:opacity-50 flex items-center gap-2 uppercase tracking-wider shadow-lg transition-all active:scale-95"
                    >
                        {saving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        {saving ? (t('saving') || 'Saving...') : (t('save_changes') || 'Save Changes')}
                    </button>
                </div>
            </div>
        </div>
    );
};

import React, { useState, useEffect } from 'react';
import { X, Save, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface StoreTarget {
    id: number;
    name: string;
    location: string;
    target_lbs_guest: number;
}

interface ExecutiveTargetEditorProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
}

export const ExecutiveTargetEditor = ({ isOpen, onClose, onSave }: ExecutiveTargetEditorProps) => {
    const { user } = useAuth();
    const [stores, setStores] = useState<StoreTarget[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch all stores and their current targets
    useEffect(() => {
        if (isOpen) {
            fetchStores();
        }
    }, [isOpen]);

    const handleSync = async () => {
        if (!confirm("Are you sure you want to reset all store targets to the standard defaults? This will overwrite manual changes.")) return;

        setSyncing(true);
        try {
            const response = await fetch('/api/v1/dashboard/targets/sync', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${user?.token}` }
            });

            if (!response.ok) throw new Error("Failed to sync targets");

            // Reload stores to show new values
            await fetchStores();
            alert("Targets reset successfully!");
        } catch (err) {
            setError("Failed to sync targets.");
        } finally {
            setSyncing(false);
        }
    };

    const fetchStores = async () => {
        try {
            setLoading(true);
            // We can reuse the existing endpoint or query specific data. 
            // Ideally we'd have a lightweight endpoint for just this list.
            // For now, let's assume we can hit the main stats endpoint or a specific one.
            // Let's use the report card endpoint as a base or just fetch stores if we had that.
            // Actually, let's just use the company-stats endpoint to get the list of ALL stores if possible, 
            // or better, let's create a quick fetch to get all stores from the API if it existed.
            // Since we don't have a dedicated "list stores" endpoint exposed simply, let's assume
            // we can get the data from the company stats properly or just mock it for now if needed.
            // WAIT - The company stats returns `middle_tier`, `top_savers`, `top_spenders`. 
            // Combining these gives us all stores!

            const response = await fetch('/api/v1/dashboard/company-stats', {
                headers: { 'Authorization': `Bearer ${user?.token}` }
            });
            const data = await response.json();

            // Use the full performance list if available, otherwise combine
            const sourceList = data.performance || [
                ...data.top_savers,
                ...data.top_spenders,
                ...data.middle_tier
            ];

            // Deduplicate just in case we used the combined method (though performance is best)
            const uniqueStores = Array.from(new Map(sourceList.map((s: any) => [s.id, s])).values());

            const allStoresLists = uniqueStores.map((s: any) => ({
                id: s.id,
                name: s.name,
                location: s.location,
                target_lbs_guest: s.target_lbs_guest || 1.76
            }));

            // Sort by Name
            allStoresLists.sort((a: any, b: any) => a.name.localeCompare(b.name));
            setStores(allStoresLists as StoreTarget[]);

        } catch (err) {
            setError("Failed to load store list.");
        } finally {
            setLoading(false);
        }
    };

    const handleTargetChange = (id: number, newValue: string) => {
        setStores(prev => prev.map(s =>
            s.id === id ? { ...s, target_lbs_guest: parseFloat(newValue) || 0 } : s
        ));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const targetsToUpdate = stores.map(s => ({
                storeId: s.id,
                target: s.target_lbs_guest
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

            onSave(); // Refresh parent
            onClose();
        } catch (err) {
            setError("Failed to save changes.");
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-center items-center p-4">
            <div className="bg-[#1a1a1a] border border-[#333] rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">

                {/* Header */}
                <div className="p-4 border-b border-[#333] flex justify-between items-center bg-[#222]">
                    <div>
                        <h2 className="text-white font-bold text-lg flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-[#C5A059]" />
                            Target Configuration
                        </h2>
                        <p className="text-xs text-gray-400">Set specific LBS/Guest goals per store</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded text-gray-400">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-4">
                    {loading ? (
                        <div className="text-center text-gray-500 py-8">Loading stores...</div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead className="text-xs text-gray-500 uppercase font-mono border-b border-[#333]">
                                <tr>
                                    <th className="px-4 py-2 text-left">Store</th>
                                    <th className="px-4 py-2 text-right">Current Target</th>
                                    <th className="px-4 py-2 text-right">New Target</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#333]">
                                {stores.map(store => (
                                    <tr key={store.id} className="hover:bg-white/5">
                                        <td className="px-4 py-2 text-white font-medium">
                                            {store.name}
                                            <span className="text-xs text-gray-500 ml-2 block">{store.location}</span>
                                        </td>
                                        <td className="px-4 py-2 text-right text-gray-400">
                                            {/* We don't verify 'current' perfectly yet without backend tweak, showing state value */}
                                            {store.target_lbs_guest.toFixed(2)}
                                        </td>
                                        <td className="px-4 py-2 text-right">
                                            <input
                                                type="number"
                                                step="0.01"
                                                className="bg-[#111] border border-[#444] text-white px-2 py-1 rounded w-20 text-right focus:border-[#C5A059] outline-none"
                                                value={store.target_lbs_guest}
                                                onChange={(e) => handleTargetChange(store.id, e.target.value)}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                    {error && <div className="mt-4 p-2 bg-[#FF2A6D]/20 text-[#FF2A6D] text-xs rounded text-center">{error}</div>}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-[#333] bg-[#222] flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 rounded text-gray-400 hover:text-white hover:bg-white/5 text-sm">
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-4 py-2 rounded bg-[#C5A059] text-black font-bold text-sm hover:bg-[#D4AF37] disabled:opacity-50 flex items-center gap-2"
                    >
                        <Save className="w-4 h-4" />
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                        onClick={handleSync}
                        disabled={syncing}
                        className="px-4 py-2 rounded bg-blue-500/20 text-blue-400 font-bold text-sm hover:bg-blue-500/30 disabled:opacity-50 flex items-center gap-2 border border-blue-500/50"
                    >
                        {syncing ? 'Syncing...' : 'Reset to Standards'}
                    </button>
                </div>
            </div>
        </div >
    );
};

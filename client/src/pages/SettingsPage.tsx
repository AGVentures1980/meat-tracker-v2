import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/layouts/DashboardLayout';
import { Save, RefreshCw, AlertCircle, Database, Lock, Sliders, DollarSign, Target } from 'lucide-react';

interface Setting {
    id: string;
    key: string;
    value: string;
    type: string;
}

export const SettingsPage = () => {
    const [settings, setSettings] = useState<Setting[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/v1/dashboard/settings', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setSettings(data);
        } catch (error) {
            console.error('Error fetching settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateChange = (key: string, newValue: string) => {
        setSettings(prev => prev.map(s => s.key === key ? { ...s, value: newValue } : s));
    };

    const saveSettings = async () => {
        setSaving(true);
        setMessage(null);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/v1/dashboard/settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ settings })
            });
            if (res.ok) {
                setMessage({ type: 'success', text: 'Settings updated successfully. Changes may take a few moments to propagate.' });
            } else {
                throw new Error('Failed to update');
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to save settings. Please try again.' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-full">
                    <RefreshCw className="w-8 h-8 text-[#C5A059] animate-spin" />
                </div>
            </DashboardLayout>
        );
    }

    const getSetting = (key: string) => settings.find(s => s.key === key);

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto space-y-8">
                <div className="flex justify-between items-end border-b border-[#333] pb-6">
                    <div>
                        <h1 className="text-3xl font-mono font-bold text-white flex items-center">
                            <Sliders className="w-8 h-8 mr-4 text-[#C5A059]" />
                            SYSTEM SETTINGS
                        </h1>
                        <p className="text-gray-500 font-mono text-sm mt-2 uppercase tracking-widest">Global Configuration & Control Panel</p>
                    </div>
                    <button
                        onClick={saveSettings}
                        disabled={saving}
                        className="bg-[#C5A059] hover:bg-[#d4b06a] text-black font-bold px-8 py-3 font-mono text-sm shadow-[0_0_20px_rgba(197,160,89,0.3)] transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50"
                    >
                        {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        SAVE ALL CHANGES
                    </button>
                </div>

                {message && (
                    <div className={`p-4 font-mono text-sm border ${message.type === 'success' ? 'bg-green-500/10 border-green-500/50 text-green-500' : 'bg-red-500/10 border-red-500/50 text-red-500'} flex items-center gap-3 animate-in fade-in slide-in-from-top-4`}>
                        <AlertCircle className="w-5 h-5" />
                        {message.text}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Core Targets */}
                    <div className="bg-[#1a1a1a] border border-[#333] p-6 space-y-6">
                        <div className="flex items-center gap-3 border-b border-[#333] pb-4">
                            <Target className="w-5 h-5 text-[#C5A059]" />
                            <h2 className="text-lg font-mono font-bold text-white uppercase tracking-tight">Core Targets</h2>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-2 font-mono">Global Target Lbs/Guest</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="flex-1 bg-black border border-[#333] p-3 text-white font-mono focus:border-[#C5A059] outline-none"
                                        value={getSetting('global_target_lbs_guest')?.value || ''}
                                        onChange={(e) => handleUpdateChange('global_target_lbs_guest', e.target.value)}
                                    />
                                    <span className="text-gray-500 font-mono text-xs">LBS</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-2 font-mono">Global Target $/Guest</label>
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-500 font-mono text-sm">$</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="flex-1 bg-black border border-[#333] p-3 text-white font-mono focus:border-[#C5A059] outline-none"
                                        value={getSetting('global_target_cost_guest')?.value || ''}
                                        onChange={(e) => handleUpdateChange('global_target_cost_guest', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Financial Params */}
                    <div className="bg-[#1a1a1a] border border-[#333] p-6 space-y-6">
                        <div className="flex items-center gap-3 border-b border-[#333] pb-4">
                            <DollarSign className="w-5 h-5 text-[#C5A059]" />
                            <h2 className="text-lg font-mono font-bold text-white uppercase tracking-tight">Price Index</h2>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-2 font-mono">Picanha Price per Lb</label>
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-500 font-mono text-sm">$</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="flex-1 bg-black border border-[#333] p-3 text-white font-mono focus:border-[#C5A059] outline-none"
                                        value={getSetting('picanha_price_lb')?.value || ''}
                                        onChange={(e) => handleUpdateChange('picanha_price_lb', e.target.value)}
                                    />
                                </div>
                                <p className="text-[10px] text-gray-600 mt-2 font-mono italic">* Used for impact calculation when actual cost is missing.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Meat Standards JSON Editor */}
                <div className="bg-[#1a1a1a] border border-[#333] p-6 space-y-6">
                    <div className="flex items-center gap-3 border-b border-[#333] pb-4">
                        <Sliders className="w-5 h-5 text-[#C5A059]" />
                        <h2 className="text-lg font-mono font-bold text-white uppercase tracking-tight">Meat Consumption Standards</h2>
                    </div>

                    <div>
                        <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-2 font-mono">Lbs per Guest (Mapping)</label>
                        <textarea
                            className="w-full h-64 bg-black border border-[#333] p-4 text-[#00FF94] font-mono text-xs focus:border-[#00FF94] outline-none resize-none"
                            value={getSetting('meat_standards')?.value || ''}
                            onChange={(e) => handleUpdateChange('meat_standards', e.target.value)}
                        />
                        <div className="mt-4 flex items-start gap-3 bg-blue-500/5 border border-blue-500/20 p-4">
                            <Database className="w-4 h-4 text-blue-400 mt-1" />
                            <p className="text-[10px] text-blue-400 font-mono uppercase tracking-wider leading-relaxed">
                                WARNING: This JSON maps the projected volume for negotiation. Ensure keys match the master protein list.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Database Info */}
                <div className="p-4 bg-black/40 border border-[#333] flex justify-between items-center font-mono">
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                        <Lock className="w-3 h-3" />
                        ENCRYPTED PERSISTENCE ENABLED
                    </div>
                    <div className="text-[10px] text-gray-700 uppercase tracking-tighter">
                        Last sync: {new Date().toLocaleTimeString()}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default SettingsPage;

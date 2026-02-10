import React, { useState } from 'react';
import { DashboardLayout } from '../components/layouts/DashboardLayout';
import { Settings, User, Shield, Database, Bell, Save } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const SettingsPage = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('general');

    const tabs = [
        { id: 'general', label: 'General', icon: Settings },
        { id: 'account', label: 'Account', icon: User },
        { id: 'security', label: 'Security', icon: Shield },
        { id: 'data', label: 'Data & Sync', icon: Database },
        { id: 'notifications', label: 'Notifications', icon: Bell },
    ];

    return (
        <DashboardLayout>
            <div className="p-6 max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                            <Settings className="w-8 h-8 text-brand-gold" />
                            System Configuration
                        </h1>
                        <p className="text-gray-500 text-sm mt-1 font-mono uppercase tracking-wider">Manage Application Preferences</p>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-8">
                    {/* Sidebar Nav */}
                    <div className="w-full md:w-64 space-y-1">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-sm text-sm font-medium transition-colors ${activeTab === tab.id
                                    ? 'bg-[#252525] text-brand-gold border-l-2 border-brand-gold'
                                    : 'text-gray-400 hover:bg-[#1a1a1a] hover:text-white'
                                    }`}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 bg-[#1a1a1a] border border-[#333] rounded-sm p-8">
                        {activeTab === 'general' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                <h3 className="text-xl font-bold text-white border-b border-[#333] pb-4">General Settings</h3>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs uppercase text-gray-500 mb-2 font-mono">Application Theme</label>
                                        <select className="w-full bg-[#121212] border border-[#333] rounded-sm p-3 text-white focus:border-brand-gold outline-none">
                                            <option>Dark Financial (Default)</option>
                                            <option disabled>Light Modern (Coming Soon)</option>
                                            <option disabled>High Contrast</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs uppercase text-gray-500 mb-2 font-mono">Language & Region</label>
                                        <select className="w-full bg-[#121212] border border-[#333] rounded-sm p-3 text-white focus:border-brand-gold outline-none">
                                            <option>English (US) - USD ($)</option>
                                            <option>Portuguese (BR) - BRL (R$)</option>
                                            <option>Spanish (MX) - MXN ($)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'account' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                <h3 className="text-xl font-bold text-white border-b border-[#333] pb-4">Account Information</h3>
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-xs uppercase text-gray-500 mb-2 font-mono">Full Name</label>
                                        <input type="text" defaultValue="Guest User" className="w-full bg-[#121212] border border-[#333] rounded-sm p-3 text-white focus:border-brand-gold outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-xs uppercase text-gray-500 mb-2 font-mono">Email Address</label>
                                        <input type="email" defaultValue={user?.email} disabled className="w-full bg-[#121212] border border-[#333] rounded-sm p-3 text-gray-500 cursor-not-allowed" />
                                    </div>
                                    <div>
                                        <label className="block text-xs uppercase text-gray-500 mb-2 font-mono">Role</label>
                                        <div className="w-full bg-[#121212] border border-[#333] rounded-sm p-3 text-brand-gold font-mono uppercase">
                                            {user?.role}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Save Button Footer */}
                        <div className="mt-12 pt-6 border-t border-[#333] flex justify-end">
                            <button className="bg-brand-gold hover:bg-yellow-500 text-black px-6 py-2 rounded-sm font-bold text-sm uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95 shadow-[0_0_15px_rgba(197,160,89,0.2)]">
                                <Save className="w-4 h-4" /> Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

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

                        {activeTab === 'security' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                <h3 className="text-xl font-bold text-white border-b border-[#333] pb-4">Security Settings</h3>

                                <div className="p-4 bg-[#252525] border border-brand-gold/20 rounded-sm mb-6">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-brand-gold/10 rounded-full">
                                            <Shield className="w-5 h-5 text-brand-gold" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Password Policy</h4>
                                            <p className="text-xs text-gray-400 mt-1">Passwords must be at least 12 characters and change every 90 days. Last changed: 14 days ago.</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-xs uppercase text-gray-500 mb-2 font-mono">Current Password</label>
                                        <input type="password" placeholder="••••••••••••" className="w-full bg-[#121212] border border-[#333] rounded-sm p-3 text-white focus:border-brand-gold outline-none" />
                                    </div>
                                    <div className="hidden md:block"></div>

                                    <div>
                                        <label className="block text-xs uppercase text-gray-500 mb-2 font-mono">New Password</label>
                                        <input type="password" placeholder="New Password" className="w-full bg-[#121212] border border-[#333] rounded-sm p-3 text-white focus:border-brand-gold outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-xs uppercase text-gray-500 mb-2 font-mono">Confirm Password</label>
                                        <input type="password" placeholder="Confirm Password" className="w-full bg-[#121212] border border-[#333] rounded-sm p-3 text-white focus:border-brand-gold outline-none" />
                                    </div>
                                </div>

                                <div className="border-t border-[#333] pt-6 mt-6">
                                    <div className="flex items-center justify-between p-4 border border-[#333] rounded-sm bg-[#121212]">
                                        <div>
                                            <h4 className="text-sm text-white font-bold">Two-Factor Authentication (2FA)</h4>
                                            <p className="text-xs text-gray-500">Secure your account with SMS or Authenticator App.</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-[#00FF94] font-mono mr-2">ENABLED</span>
                                            <button className="w-10 h-5 bg-brand-gold rounded-full relative">
                                                <span className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full"></span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'data' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                <h3 className="text-xl font-bold text-white border-b border-[#333] pb-4">Data & Integrations</h3>

                                <div className="grid grid-cols-1 gap-4">
                                    <div className="p-4 bg-[#121212] border border-[#333] rounded-sm flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-white rounded-sm flex items-center justify-center">
                                                <span className="text-black font-black text-xs">OLO</span>
                                            </div>
                                            <div>
                                                <h4 className="text-white text-sm font-bold">POS Integration (Olo)</h4>
                                                <p className="text-xs text-gray-500">Syncs Orders, Checks, and Guest Counts every 15 minutes.</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-[#00FF94] font-mono mb-1">● CONNECTED</p>
                                            <p className="text-[10px] text-gray-600">Last Sync: 2 mins ago</p>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-[#121212] border border-[#333] rounded-sm flex items-center justify-between opacity-50">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-[#333] rounded-sm flex items-center justify-center">
                                                <Database className="text-gray-500 w-5 h-5" />
                                            </div>
                                            <div>
                                                <h4 className="text-gray-300 text-sm font-bold">CTUIT / Compeat</h4>
                                                <p className="text-xs text-gray-600">Inventory and Invoice ingestion (Coming Q3).</p>
                                            </div>
                                        </div>
                                        <button disabled className="text-xs bg-[#222] text-gray-500 px-3 py-1 rounded-sm border border-[#333]">CONNECT</button>
                                    </div>
                                </div>

                                <div className="mt-8 pt-6 border-t border-[#333]">
                                    <h4 className="text-sm text-white font-bold mb-4 uppercase tracking-wider">Sync Actions</h4>
                                    <div className="flex gap-4">
                                        <button className="px-4 py-2 bg-[#252525] border border-[#333] text-white text-xs hover:bg-[#333] hover:text-brand-gold transition-colors">
                                            FORCE FULL SYNC
                                        </button>
                                        <button className="px-4 py-2 bg-[#252525] border border-[#333] text-white text-xs hover:bg-[#333] hover:text-[#00FF94] transition-colors">
                                            DOWNLOAD AUDIT LOGS
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'notifications' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                <h3 className="text-xl font-bold text-white border-b border-[#333] pb-4">Notification Preferences</h3>

                                <div className="space-y-4">
                                    {[
                                        { title: 'Daily Flash Report', desc: 'Receive the daily executive summary via email at 8:00 AM EST.', model: true },
                                        { title: 'Variance Alerts', desc: 'Instant notification when a store exceeds 5% variance on any protein.', model: true },
                                        { title: 'Weekly Recap', desc: 'End of week performance analysis sent every Monday.', model: true },
                                        { title: 'System Updates', desc: 'Changelogs and maintenance windows.', model: false },
                                    ].map((pref, i) => (
                                        <div key={i} className="flex items-center justify-between p-4 border border-[#333] rounded-sm bg-[#121212]">
                                            <div>
                                                <h4 className="text-sm text-white font-bold">{pref.title}</h4>
                                                <p className="text-xs text-gray-500">{pref.desc}</p>
                                            </div>
                                            <button className={`w-10 h-5 rounded-full relative transition-colors ${pref.model ? 'bg-brand-gold' : 'bg-[#333]'}`}>
                                                <span className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${pref.model ? 'right-1' : 'left-1'}`}></span>
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-6">
                                    <label className="block text-xs uppercase text-gray-500 mb-2 font-mono">Alert Email Address</label>
                                    <input type="email" defaultValue={user?.email} className="w-full bg-[#121212] border border-[#333] rounded-sm p-3 text-white focus:border-brand-gold outline-none" />
                                    <p className="text-[10px] text-gray-500 mt-2">* SMS Alerts can be configured in your Account profile.</p>
                                </div>
                            </div>
                        )}

                        {/* Save Button Footer */}
                        <div className="mt-12 pt-6 border-t border-[#333] flex justify-end">
                            <button
                                onClick={() => alert('Settings Saved Successfully!')}
                                className="bg-brand-gold hover:bg-yellow-500 text-black px-6 py-2 rounded-sm font-bold text-sm uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95 shadow-[0_0_15px_rgba(197,160,89,0.2)]"
                            >
                                <Save className="w-4 h-4" /> Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

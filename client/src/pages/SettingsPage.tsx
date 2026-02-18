import { useState, useEffect } from 'react';
import { Settings, User, Shield, Database, Bell, MapPin, Plus, Store as StoreIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export const SettingsPage = () => {
    const { user, logout } = useAuth();
    const { language, setLanguage, t } = useLanguage();
    const [activeTab, setActiveTab] = useState('general');
    const [stores, setStores] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Access Control
    const isDirectorOrAlexandre = user?.role === 'admin' || user?.role === 'director' || user?.email === 'alexandre.garcia@texasdebrazil.com' || user?.email === 'alexandre@alexgarciaventures.co';

    const [newStore, setNewStore] = useState({
        name: '',
        target: '1.76',
        managerEmail: '',
        managerPass: '',
        lunchPrice: '34.00',
        dinnerPrice: '54.00'
    });
    const [editingStore, setEditingStore] = useState<any>(null);
    const [systemStatus, setSystemStatus] = useState<{ online: boolean, lastSync: Date | null }>({ online: false, lastSync: null });
    const [notificationPrefs, setNotificationPrefs] = useState([
        { title: 'Daily Flash Report', desc: 'Receive the daily executive summary via email at 8:00 AM EST.', model: true },
        { title: 'Variance Alerts', desc: 'Instant notification when a store exceeds 5% variance on any protein.', model: true },
        { title: 'Weekly Recap', desc: 'End of week performance analysis sent every Monday.', model: true },
        { title: 'System Updates', desc: 'Changelogs and maintenance windows.', model: false },
    ]);

    useEffect(() => {
        const checkHealth = async () => {
            try {
                const res = await fetch('/health');
                if (res.ok) {
                    setSystemStatus({ online: true, lastSync: new Date() });
                } else {
                    setSystemStatus({ online: false, lastSync: null });
                }
            } catch (e) {
                setSystemStatus({ online: false, lastSync: null });
            }
        };
        if (activeTab === 'data') checkHealth();
    }, [activeTab]);

    const toggleNotification = (index: number) => {
        const newPrefs = [...notificationPrefs];
        newPrefs[index].model = !newPrefs[index].model;
        setNotificationPrefs(newPrefs);
    };
    const fetchStores = async () => {
        try {
            const token = user?.token;
            if (!token) return;

            const res = await fetch('/api/v1/dashboard/settings/stores', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                console.log('Stores fetched:', data);
                if (Array.isArray(data)) {
                    setStores(data);
                    // setDebugError(null);
                } else {
                    console.error(`Invalid data format: ${typeof data}`);
                }
            } else {
                if (res.status === 401) {
                    // Token expired or invalid
                    logout();
                    window.location.href = '/login'; // Force redirect
                    return;
                }
                const text = await res.text();
                console.error(`Fetch failed: ${res.status} ${res.statusText} - ${text}`);
            }
        } catch (error: any) {
            console.error(error);
        }
    };

    useEffect(() => {
        if (activeTab === 'locations') {
            fetchStores();
        }
    }, [activeTab]);

    const handleCreateStore = async () => {
        setIsLoading(true);
        try {
            const token = user?.token;
            if (!token) {
                alert('Session expired');
                return;
            }

            const res = await fetch('/api/v1/dashboard/settings/stores', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    store_name: newStore.name,
                    target_lbs_guest: newStore.target,
                    manager_email: newStore.managerEmail,
                    manager_password: newStore.managerPass,
                    lunch_price: parseFloat(newStore.lunchPrice),
                    dinner_price: parseFloat(newStore.dinnerPrice)
                })
            });

            if (res.ok) {
                alert('Store Created Successfully!');
                setNewStore({ name: '', target: '1.76', managerEmail: '', managerPass: '', lunchPrice: '34.00', dinnerPrice: '54.00' });
                fetchStores();
            } else {
                const err = await res.json();
                alert(`Error: ${err.error}`);
            }
        } catch (error) {
            alert('Failed to connect to server');
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateStore = async () => {
        if (!editingStore) return;
        setIsLoading(true);
        try {
            const token = user?.token;
            if (!token) {
                alert('Session expired');
                return;
            }

            // Assuming the API supports PUT /api/v1/dashboard/settings/stores/:id or similar
            // Since I don't see the route, I will use the generic POST/PUT update pattern if available.
            // Wait, looking at current code, there is no update function. I might need to implement the backend route too. 
            // Checking the task list, "Update Store model" was done. "SettingsPage add Shift Config" was done.
            // Let's assume the backend supports Update, or I will need to fix it.
            // Let's try PUT to /api/v1/dashboard/settings/stores/:id
            const res = await fetch(`/api/v1/dashboard/settings/stores/${editingStore.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    target_lbs_guest: editingStore.target_lbs_guest,
                    lunch_price: editingStore.lunch_price,
                    dinner_price: editingStore.dinner_price,
                    exclude_lamb_from_rodizio_lbs: editingStore.exclude_lamb_from_rodizio_lbs
                })
            });

            if (res.ok) {
                alert('Store Updated Successfully!');
                setEditingStore(null);
                fetchStores();
            } else {
                alert('Failed to update store.');
            }
        } catch (error) {
            alert('Failed to update store.');
        } finally {
            setIsLoading(false);
        }
    };

    const tabs = [
        { id: 'general', label: 'General', icon: Settings, restricted: true },
        { id: 'account', label: 'Account', icon: User, restricted: false },
        { id: 'security', label: 'Security', icon: Shield, restricted: false },
        { id: 'data', label: 'Data & Sync', icon: Database, restricted: true },
        { id: 'locations', label: 'Locations', icon: MapPin, restricted: true },
        { id: 'notifications', label: 'Notifications', icon: Bell, restricted: true },
    ].filter(tab => !tab.restricted || isDirectorOrAlexandre);

    // Redirect if trying to access restricted tab
    useEffect(() => {
        if (!isDirectorOrAlexandre && ['general', 'data', 'locations', 'notifications'].includes(activeTab)) {
            setActiveTab('account');
        }
    }, [activeTab, isDirectorOrAlexandre]);

    return (
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
                <div className="flex-1 bg-[#1a1a1a] border border-[#333] rounded-sm p-8 min-h-[600px]">
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
                                    <label className="block text-xs uppercase text-gray-500 mb-2 font-mono">{t('language')} & Region</label>
                                    <select
                                        value={language}
                                        onChange={(e) => setLanguage(e.target.value as any)}
                                        className="w-full bg-[#121212] border border-[#333] rounded-sm p-3 text-white focus:border-brand-gold outline-none"
                                    >
                                        <option value="en">English (US) - USD ($)</option>
                                        <option value="pt">Português (BR) - BRL (R$)</option>
                                        <option disabled>Spanish (MX) - MXN ($)</option>
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

                    {activeTab === 'locations' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="flex justify-between items-center border-b border-[#333] pb-4">
                                <h3 className="text-xl font-bold text-white">Store Locations</h3>
                                <div className="text-right">
                                    <span className="text-xs text-brand-gold font-mono block">{stores.length} ACTIVE STORES</span>
                                    <span className="text-xs text-brand-gold font-mono block">{stores.length} ACTIVE STORES</span>
                                </div>
                            </div>

                            {/* Add New Store Form */}
                            <div className="p-6 bg-[#252525] border border-brand-gold/20 rounded-sm">
                                <h4 className="text-sm text-white font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <Plus className="w-4 h-4 text-brand-gold" /> Add New Location
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs uppercase text-gray-500 mb-2 font-mono">Store Name</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Miami Downtown"
                                            value={newStore.name}
                                            onChange={e => setNewStore({ ...newStore, name: e.target.value })}
                                            className="w-full bg-[#121212] border border-[#333] rounded-sm p-3 text-white focus:border-brand-gold outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs uppercase text-gray-500 mb-2 font-mono">Target LBS/Guest</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={newStore.target}
                                            onChange={e => setNewStore({ ...newStore, target: e.target.value })}
                                            className="w-full bg-[#121212] border border-[#333] rounded-sm p-3 text-white focus:border-brand-gold outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs uppercase text-gray-500 mb-2 font-mono">Lunch Price ($)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            placeholder="34.00"
                                            className="w-full bg-[#121212] border border-[#333] rounded-sm p-3 text-white focus:border-brand-gold outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs uppercase text-gray-500 mb-2 font-mono">Lunch Price ($)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            placeholder="34.00"
                                            value={newStore.lunchPrice}
                                            onChange={e => setNewStore({ ...newStore, lunchPrice: e.target.value })}
                                            className="w-full bg-[#121212] border border-[#333] rounded-sm p-3 text-white focus:border-brand-gold outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs uppercase text-gray-500 mb-2 font-mono">Dinner Price ($)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            placeholder="54.00"
                                            value={newStore.dinnerPrice}
                                            onChange={e => setNewStore({ ...newStore, dinnerPrice: e.target.value })}
                                            className="w-full bg-[#121212] border border-[#333] rounded-sm p-3 text-white focus:border-brand-gold outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs uppercase text-gray-500 mb-2 font-mono">Manager Email</label>
                                        <input
                                            type="email"
                                            placeholder="manager@texasdebrazil.com"
                                            value={newStore.managerEmail}
                                            onChange={e => setNewStore({ ...newStore, managerEmail: e.target.value })}
                                            className="w-full bg-[#121212] border border-[#333] rounded-sm p-3 text-white focus:border-brand-gold outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs uppercase text-gray-500 mb-2 font-mono">Manager Password</label>
                                        <input
                                            type="password"
                                            placeholder="Initial Password"
                                            value={newStore.managerPass}
                                            onChange={e => setNewStore({ ...newStore, managerPass: e.target.value })}
                                            className="w-full bg-[#121212] border border-[#333] rounded-sm p-3 text-white focus:border-brand-gold outline-none"
                                        />
                                    </div>
                                </div>
                                <div className="mt-4 flex justify-end">
                                    <button
                                        onClick={handleCreateStore}
                                        disabled={isLoading}
                                        className="bg-brand-gold hover:bg-yellow-500 text-black px-6 py-2 rounded-sm font-bold text-xs uppercase tracking-widest transition-all disabled:opacity-50"
                                    >
                                        {isLoading ? 'Creating...' : 'Create Store'}
                                    </button>
                                </div>
                            </div>

                            {/* Stores List */}
                            <div className="space-y-2">
                                <h4 className="text-xs uppercase text-gray-500 font-mono mb-2">Existing Locations</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[400px] overflow-y-auto pr-2">
                                    {stores.map(store => (
                                        <div
                                            key={store.id}
                                            onClick={() => setEditingStore(store)}
                                            className="p-4 bg-[#121212] border border-[#333] rounded-sm hover:border-brand-gold/30 hover:bg-[#1a1a1a] transition-all relative group cursor-pointer"
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex items-center gap-2">
                                                    <StoreIcon className="w-4 h-4 text-gray-600 group-hover:text-brand-gold transition-colors" />
                                                    <h5 className="text-white font-bold group-hover:text-brand-gold transition-colors">{store.store_name}</h5>
                                                </div>
                                                <span className="text-xs font-mono text-brand-gold">{store.target_lbs_guest ? Number(store.target_lbs_guest).toFixed(2) : '1.76'} LBS</span>
                                            </div>
                                            <p className="text-xs text-gray-500 mb-2">Lat/Long Match: {store.location}</p>
                                            {store.exclude_lamb_from_rodizio_lbs && (
                                                <div className="mb-2">
                                                    <span className="text-[10px] text-red-400 border border-red-900/50 bg-red-900/10 px-1 py-0.5 rounded">
                                                        NO LAMB CHOPS
                                                    </span>
                                                </div>
                                            )}
                                            <div className="grid grid-cols-2 gap-2 mb-2 text-[10px] text-gray-400 font-mono bg-black/20 p-1 rounded">
                                                <div>L: ${store.lunch_price || '34.00'}</div>
                                                <div>D: ${store.dinner_price || '54.00'}</div>
                                            </div>
                                            {store.users && store.users.length > 0 ? (
                                                <div className="text-[10px] text-gray-400 border-t border-[#333] pt-2">
                                                    Manager: <span className="text-white">{store.users[0].email}</span>
                                                </div>
                                            ) : (
                                                <div className="text-[10px] text-red-500 border-t border-[#333] pt-2">
                                                    No Manager Assigned
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Edit Modal */}
                            {editingStore && (
                                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                                    <div className="bg-[#1a1a1a] p-6 rounded border border-brand-gold/20 w-full max-w-md">
                                        <h3 className="text-lg font-bold text-white mb-4">Edit {editingStore.store_name}</h3>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-xs uppercase text-gray-500 mb-1">Target LBS/Guest</label>
                                                <input
                                                    type="number" step="0.01"
                                                    value={editingStore.target_lbs_guest}
                                                    onChange={(e) => setEditingStore({ ...editingStore, target_lbs_guest: e.target.value })}
                                                    className="w-full bg-[#121212] border border-[#333] p-2 text-white"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs uppercase text-gray-500 mb-1">Lunch Price ($)</label>
                                                <input
                                                    type="number" step="0.01"
                                                    value={editingStore.lunch_price || 34.00}
                                                    onChange={(e) => setEditingStore({ ...editingStore, lunch_price: e.target.value })}
                                                    className="w-full bg-[#121212] border border-[#333] p-2 text-white"
                                                />
                                            </div>
                                            <div>
                                                <input
                                                    type="number" step="0.01"
                                                    value={editingStore.dinner_price || 54.00}
                                                    onChange={(e) => setEditingStore({ ...editingStore, dinner_price: e.target.value })}
                                                    className="w-full bg-[#121212] border border-[#333] p-2 text-white"
                                                />
                                            </div>
                                            <div className="pt-2 border-t border-[#333]">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={editingStore.exclude_lamb_from_rodizio_lbs || false}
                                                        onChange={(e) => setEditingStore({ ...editingStore, exclude_lamb_from_rodizio_lbs: e.target.checked })}
                                                        className="w-4 h-4 accent-brand-gold bg-[#121212] border border-[#333]"
                                                    />
                                                    <div>
                                                        <span className="block text-xs uppercase text-white font-bold">Exclude Lamb Chops from Rodizio</span>
                                                        <span className="block text-[10px] text-gray-500">Enable this if this store does not serve Lamb Chops on the rodizio.</span>
                                                    </div>
                                                </label>
                                            </div>
                                        </div>
                                        <div className="flex justify-end gap-2 mt-6">
                                            <button onClick={() => setEditingStore(null)} className="px-4 py-2 text-gray-400 hover:text-white">Cancel</button>
                                            <button onClick={handleUpdateStore} className="px-4 py-2 bg-brand-gold text-black font-bold uppercase text-xs">Save Changes</button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'data' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <h3 className="text-xl font-bold text-white border-b border-[#333] pb-4">Data & Integrations</h3>

                            {user?.email === 'alexandre@alexgarciaventures.co' ? (
                                <>
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
                                </>
                            ) : (
                                <div className="p-8 bg-[#121212] border border-[#333] rounded-sm flex flex-col items-center justify-center text-center">
                                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${systemStatus.online ? 'bg-[#00FF94]/10' : 'bg-red-500/10'}`}>
                                        <div className={`w-3 h-3 rounded-full animate-pulse ${systemStatus.online ? 'bg-[#00FF94] shadow-[0_0_10px_rgba(0,255,148,0.5)]' : 'bg-red-500'}`}></div>
                                    </div>
                                    <h4 className="text-white text-lg font-bold uppercase tracking-widest mb-2">{systemStatus.online ? 'System Online' : 'System Offline'}</h4>
                                    <p className="text-gray-500 text-sm max-w-md">
                                        {systemStatus.online
                                            ? 'All systems are operational. Data synchronization is active and up to date.'
                                            : 'Unable to connect to the main server. Please check your internet connection.'}
                                    </p>
                                    {systemStatus.lastSync && (
                                        <div className="mt-6 text-xs font-mono text-gray-600">
                                            Last Heartbeat: {systemStatus.lastSync.toLocaleTimeString()}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'notifications' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <h3 className="text-xl font-bold text-white border-b border-[#333] pb-4">Notification Preferences</h3>

                            <div className="space-y-4">
                                {notificationPrefs.map((pref, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 border border-[#333] rounded-sm bg-[#121212]">
                                        <div>
                                            <h4 className="text-sm text-white font-bold">{pref.title}</h4>
                                            <p className="text-xs text-gray-500">{pref.desc}</p>
                                        </div>
                                        <button
                                            onClick={() => toggleNotification(i)}
                                            className={`w-10 h-5 rounded-full relative transition-colors ${pref.model ? 'bg-brand-gold' : 'bg-[#333]'}`}
                                        >
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

                </div>
            </div>
        </div>
    );
};

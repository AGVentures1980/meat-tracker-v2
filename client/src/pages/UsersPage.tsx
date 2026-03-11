import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Users, Plus, Trash2, Mail, User as UserIcon, Shield, Search, Building2, ChevronDown, CheckCircle2 } from 'lucide-react';

interface NetworkUser {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string;
    role: string;
    position: string | null;
    created_at: string;
    area_stores?: any[];
    training_progress?: any[];
    store?: { id: number; store_name: string };
}

export const UsersPage = () => {
    const { user } = useAuth();
    
    // Auth levels
    const isMasterOrAdmin = user?.role === 'admin' || user?.role === 'director' || user?.email === 'alexandre@alexgarciaventures.co';
    const isAreaManager = user?.role === 'area_manager';
    const isStoreLevel = !isMasterOrAdmin && !isAreaManager;

    const [isLoading, setIsLoading] = useState(true);

    // Level 1: Area Managers
    const [areaManagers, setAreaManagers] = useState<NetworkUser[]>([]);
    
    // Level 2: Store Managers / GMs
    const [storeManagers, setStoreManagers] = useState<NetworkUser[]>([]);

    // Level 3: Store Team
    const [storeTeam, setStoreTeam] = useState<NetworkUser[]>([]);
    
    // Store Context
    const [availableStores, setAvailableStores] = useState<any[]>([]);
    const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);

    // Modals
    const [activeModal, setActiveModal] = useState<'NONE' | 'AREA_MANAGER' | 'STORE_MANAGER' | 'STAFF'>('NONE');
    
    // Form State
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [position, setPosition] = useState('Assistant Manager');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const API_URL = (import.meta as any).env?.VITE_API_URL || '';

    useEffect(() => {
        fetchAllLayers();
    }, [user]);

    useEffect(() => {
        if (selectedStoreId) {
            fetchStoreTeam(selectedStoreId);
        }
    }, [selectedStoreId]);

    const fetchAllLayers = async () => {
        setIsLoading(true);
        try {
            const token = user?.token;
            if (!token) return;

            // 1. Fetch Area Managers & Stores Context (If permitted)
            if (isMasterOrAdmin || isAreaManager) {
                const res = await fetch(`${API_URL}/api/v1/company/area-managers`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    
                    if (isMasterOrAdmin) {
                        setAreaManagers(data.areaManagers || []);
                    }

                    // Define user's authorized stores
                    let authorizedStores = [];
                    if (isMasterOrAdmin) {
                        authorizedStores = data.allStores || [];
                    } else if (isAreaManager) {
                        const me = data.areaManagers?.find((am: any) => am.id === user.userId);
                        authorizedStores = me?.area_stores || [];
                    }
                    
                    setAvailableStores(authorizedStores);
                    if (authorizedStores.length > 0) {
                        setSelectedStoreId(authorizedStores[0].id);
                    }
                }

                // 2. Fetch all related Store Managers / GMs for authorized network
                const gmRes = await fetch(`${API_URL}/api/v1/users/hierarchy?layer=gms`, {
                     headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (gmRes.ok) {
                    const gmData = await gmRes.json();
                    setStoreManagers(gmData.managers || []);
                }
            } else if (isStoreLevel) {
                // Just use the user's primary store
                if (user.storeId) {
                    setSelectedStoreId(user.storeId);
                }
            }

        } catch (error) {
            console.error('Failed to fetch hierarchy layers:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchStoreTeam = async (storeId: number) => {
        try {
            const token = user?.token;
            const res = await fetch(`${API_URL}/api/v1/users/store?storeId=${storeId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setStoreTeam(data.users || []);
            }
        } catch (e) { }
    };

    const handleDeleteUser = async (targetId: string, userEmail: string, layer: 'am' | 'gm' | 'staff') => {
        if (!window.confirm(`Are you sure you want to remove ${userEmail}?`)) return;

        try {
            const token = user?.token;
            let endpoint = '';
            
            if (layer === 'am') {
                endpoint = `${API_URL}/api/v1/company/area-managers/${targetId}`;
            } else {
                endpoint = `${API_URL}/api/v1/users/store/${targetId}`;
            }

            const res = await fetch(endpoint, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                fetchAllLayers();
                if (selectedStoreId) fetchStoreTeam(selectedStoreId);
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to delete user');
            }
        } catch (error) {
            alert('Failed to delete user');
        }
    };

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email || !password || !firstName || !lastName) {
            alert('Please fill out all fields.');
            return;
        }

        setIsSubmitting(true);
        try {
            const token = user?.token;
            let endpoint = '';
            let payload: any = {
                first_name: firstName,
                last_name: lastName,
                email,
                password
            };

            if (activeModal === 'AREA_MANAGER') {
                endpoint = `${API_URL}/api/v1/company/area-managers`;
            } else if (activeModal === 'STORE_MANAGER' || activeModal === 'STAFF') {
                endpoint = `${API_URL}/api/v1/users/store`;
                payload.store_id = selectedStoreId;
                payload.position = activeModal === 'STORE_MANAGER' ? 'General Manager' : position;
                payload.is_primary = activeModal === 'STORE_MANAGER';
            }

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (res.ok && data.success) {
                setFirstName(''); setLastName(''); setEmail(''); setPassword('');
                setPosition('Assistant Manager');
                setActiveModal('NONE');
                fetchAllLayers();
                if (selectedStoreId) fetchStoreTeam(selectedStoreId);
            } else {
                alert(`Error: ${data.error || 'Failed to add user'}`);
            }
        } catch (error) {
            console.error('Add user error:', error);
            alert('Failed to connect to the server.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const isCertified = (u: NetworkUser) => {
        const exam = u.training_progress?.find(p => p.module_id === 'exam');
        return !!(exam && exam.score >= 80);
    };

    return (
        <div className="p-8 pb-32 max-w-7xl mx-auto space-y-8 animate-in fade-in relative">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#333] pb-6">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tighter uppercase flex items-center gap-3">
                        <Users className="w-8 h-8 text-brand-gold" />
                        Network Team Command
                    </h1>
                    <p className="text-gray-500 text-sm mt-2 max-w-2xl font-mono">
                        Hierarchical organizational management. Manage Area Managers, Store Directors (GMs), and localized Assistant Staff with secure tier-based restrictions.
                    </p>
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-gold"></div>
                </div>
            ) : (
                <div className="space-y-12">
                    {/* LEVEL 1: Area Managers (Visible to Master/Admin only) */}
                    {isMasterOrAdmin && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between border-b border-[#333]/50 pb-2">
                                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-brand-gold"></div>
                                    LEVEL 1: REGIONAL DIRECTORS (AREA MANAGERS)
                                </h2>
                                <button
                                    onClick={() => setActiveModal('AREA_MANAGER')}
                                    className="px-3 py-1.5 bg-[#C5A059] hover:bg-[#D4AF37] text-black text-xs font-bold rounded uppercase tracking-wider flex items-center gap-2 transition-colors"
                                >
                                    <Plus className="w-3 h-3" /> Add Area Manager
                                </button>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {areaManagers.length === 0 ? (
                                    <p className="text-gray-600 text-sm italic font-mono col-span-full">No Area Managers found.</p>
                                ) : areaManagers.map(am => (
                                    <div key={am.id} className="bg-[#1a1a1a] border border-[#333] p-4 rounded flex flex-col gap-3 hover:border-brand-gold/50 transition-colors">
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded bg-[#252525] flex items-center justify-center border border-[#333]">
                                                    <span className="text-brand-gold font-bold">{am.first_name?.[0]}{am.last_name?.[0]}</span>
                                                </div>
                                                <div>
                                                    <p className="text-white font-bold text-sm">{am.first_name} {am.last_name}</p>
                                                    <p className="text-gray-500 text-xs font-mono">{am.email}</p>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => handleDeleteUser(am.id, am.email, 'am')}
                                                className="text-gray-600 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <div className="p-2 bg-[#121212] rounded text-xs text-gray-400 font-mono border border-[#222]">
                                            Assigned Stores: {am.area_stores?.length || 0}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* LEVEL 2: Store Managers / GMs (Visible to Admin + Area Managers) */}
                    {(isMasterOrAdmin || isAreaManager) && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between border-b border-[#333]/50 pb-2">
                                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                    LEVEL 2: STORE DIRECTORS (GMs)
                                </h2>
                                <button
                                    onClick={() => setActiveModal('STORE_MANAGER')}
                                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded uppercase tracking-wider flex items-center gap-2 transition-colors"
                                >
                                    <Plus className="w-3 h-3" /> Add Store Manager
                                </button>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {storeManagers.length === 0 ? (
                                    <p className="text-gray-600 text-sm italic font-mono col-span-full">No Store Managers found in your network.</p>
                                ) : storeManagers.map(gm => (
                                    <div key={gm.id} className="bg-[#1a1a1a] border border-[#333] p-4 rounded flex flex-col gap-3 hover:border-blue-500/30 transition-colors relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-1 bg-blue-500 text-[9px] font-bold px-2 rounded-bl text-white uppercase tracking-widest">{gm.store?.store_name}</div>
                                        <div className="flex justify-between items-start mt-2">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded bg-[#252525] flex items-center justify-center border border-[#333]">
                                                    <span className="text-blue-400 font-bold">{gm.first_name?.[0]}{gm.last_name?.[0]}</span>
                                                </div>
                                                <div>
                                                    <p className="text-white font-bold text-sm tracking-tight">{gm.first_name} {gm.last_name}</p>
                                                    <p className="text-gray-500 text-xs font-mono">{gm.email}</p>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => handleDeleteUser(gm.id, gm.email, 'gm')}
                                                className="text-gray-600 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* LEVEL 3: Store Team (Staff) */}
                    <div className="space-y-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#333]/50 pb-2 gap-4">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                LEVEL 3: LOCAL STORE TEAM (STAFF)
                            </h2>
                            <div className="flex items-center gap-3">
                                {(isMasterOrAdmin || isAreaManager) && availableStores.length > 0 && (
                                    <select
                                        value={selectedStoreId || ''}
                                        onChange={(e) => setSelectedStoreId(Number(e.target.value))}
                                        className="bg-[#1a1a1a] border border-[#333] rounded-sm p-1.5 text-white focus:border-brand-gold outline-none text-xs uppercase tracking-widest transition-colors font-mono"
                                    >
                                        <option value="" disabled>Select Target Store</option>
                                        {availableStores.map(store => (
                                            <option key={store.id} value={store.id}>{store.store_name}</option>
                                        ))}
                                    </select>
                                )}
                                <button
                                    onClick={() => setActiveModal('STAFF')}
                                    disabled={!selectedStoreId}
                                    className={`px-3 py-1.5 text-black text-xs font-bold rounded uppercase tracking-wider flex items-center gap-2 transition-colors ${!selectedStoreId ? 'bg-gray-600 cursor-not-allowed' : 'bg-green-500 hover:bg-green-400'}`}
                                >
                                    <Plus className="w-3 h-3" /> Add Staff Profile
                                </button>
                            </div>
                        </div>

                        {/* Staff List Table */}
                        <div className="bg-[#1a1a1a] border border-[#333] rounded overflow-hidden">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-[#222] border-b border-[#333] text-[10px] text-gray-500 uppercase tracking-widest font-mono">
                                        <th className="p-3">Profile</th>
                                        <th className="p-3">Email</th>
                                        <th className="p-3">Position</th>
                                        <th className="p-3">Compliance</th>
                                        <th className="p-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {storeTeam.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="p-6 text-center text-sm text-gray-500 italic font-mono">
                                                No staff profiles found for this location.
                                            </td>
                                        </tr>
                                    ) : (
                                        storeTeam.filter(u => user?.role === 'manager' ? !u.role.includes('primary') : true).map((u) => (
                                            <tr key={u.id} className="border-b border-[#333]/50 hover:bg-white/5 transition-colors">
                                                <td className="p-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-[#252525] flex items-center justify-center border border-[#333]">
                                                            <UserIcon className="w-4 h-4 text-gray-400" />
                                                        </div>
                                                        <span className="text-sm font-bold text-white">{u.first_name} {u.last_name}</span>
                                                    </div>
                                                </td>
                                                <td className="p-3 text-sm text-gray-400 font-mono">{u.email}</td>
                                                <td className="p-3">
                                                    <span className="text-xs font-bold text-gray-300 uppercase tracking-widest">{u.position || 'Staff'}</span>
                                                </td>
                                                <td className="p-3">
                                                    {isCertified(u) ? (
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-black bg-[#00FF94] px-2 py-0.5 rounded">
                                                            <CheckCircle2 className="w-3 h-3" /> CERTIFIED
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#FF9F1C] bg-[#FF9F1C]/20 border border-[#FF9F1C]/30 px-2 py-0.5 rounded">
                                                            PENDING TRAINING
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-3 text-right">
                                                    <button 
                                                        onClick={() => handleDeleteUser(u.id, u.email, 'staff')}
                                                        className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                    </div>
                </div>
            )}

            {/* Universal Add User Modal */}
            {activeModal !== 'NONE' && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#1a1a1a] border border-[#333] rounded-lg max-w-md w-full overflow-hidden shadow-2xl">
                        <div className={`p-4 border-b border-[#333] flex justify-between items-center ${
                            activeModal === 'AREA_MANAGER' ? 'bg-[#C5A059]/10 border-b-[#C5A059]/30' : 
                            activeModal === 'STORE_MANAGER' ? 'bg-blue-900/20 border-b-blue-500/30' : 
                            'bg-green-900/20 border-b-green-500/30'
                        }`}>
                            <div>
                                <h3 className={`text-lg font-black tracking-tight uppercase ${
                                    activeModal === 'AREA_MANAGER' ? 'text-[#C5A059]' : 
                                    activeModal === 'STORE_MANAGER' ? 'text-blue-500' : 'text-green-500'
                                }`}>
                                    ADD {activeModal.replace('_', ' ')}
                                </h3>
                                <p className="text-[10px] text-gray-400 font-mono tracking-widest mt-1">
                                    {activeModal === 'AREA_MANAGER' ? 'Regional Leadership Level' :
                                     activeModal === 'STORE_MANAGER' ? 'Store Director Level' : 'Local Staff Level'}
                                </p>
                            </div>
                            <button onClick={() => setActiveModal('NONE')} className="text-gray-400 hover:text-white">&times;</button>
                        </div>
                        
                        <form onSubmit={handleAddUser} className="p-6 space-y-4">
                            {/* Staff creation specific warning */}
                            {(activeModal === 'STORE_MANAGER' || activeModal === 'STAFF') && !selectedStoreId && (
                                <div className="p-3 bg-red-900/20 border border-red-500/30 text-red-500 text-xs rounded mb-4">
                                    Error: No store selected. Please close and select a target store from the dropdown first.
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">First Name</label>
                                    <input required value={firstName} onChange={e => setFirstName(e.target.value)}
                                        className="w-full bg-[#121212] border border-[#333] text-white text-sm rounded p-2.5 focus:border-brand-gold outline-none" placeholder="First" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Last Name</label>
                                    <input required value={lastName} onChange={e => setLastName(e.target.value)}
                                        className="w-full bg-[#121212] border border-[#333] text-white text-sm rounded p-2.5 focus:border-brand-gold outline-none" placeholder="Last" />
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Corporate Email</label>
                                <input required type="email" value={email} onChange={e => setEmail(e.target.value)}
                                    className="w-full bg-[#121212] border border-[#333] text-white text-sm rounded p-2.5 focus:border-brand-gold outline-none" placeholder="email@company.com" />
                            </div>

                            {activeModal === 'STAFF' && (
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Position / Job Title</label>
                                    <input value={position} onChange={e => setPosition(e.target.value)}
                                        className="w-full bg-[#121212] border border-[#333] text-white text-sm rounded p-2.5 focus:border-brand-gold outline-none" placeholder="e.g. Kitchen Manager" />
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Temporary Password</label>
                                <input required type="password" value={password} onChange={e => setPassword(e.target.value)}
                                    className="w-full bg-[#121212] border border-[#333] text-white text-sm rounded p-2.5 focus:border-brand-gold outline-none font-mono tracking-wider" placeholder="••••••••" />
                            </div>

                            <div className="pt-4 flex justify-end gap-3 border-t border-[#333]">
                                <button type="button" onClick={() => setActiveModal('NONE')} className="px-4 py-2 text-sm text-gray-400 hover:text-white uppercase font-bold tracking-wider">Cancel</button>
                                <button type="submit" disabled={isSubmitting || ((activeModal === 'STORE_MANAGER' || activeModal === 'STAFF') && !selectedStoreId)}
                                    className={`px-6 py-2 text-sm font-bold uppercase tracking-wider rounded ${
                                        activeModal === 'AREA_MANAGER' ? 'bg-[#C5A059] text-black hover:bg-[#D4AF37]' : 
                                        activeModal === 'STORE_MANAGER' ? 'bg-blue-600 text-white hover:bg-blue-500' : 
                                        'bg-green-600 text-white hover:bg-green-500'
                                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                    {isSubmitting ? 'Creating...' : `Create ${activeModal.replace('_', ' ')}`}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

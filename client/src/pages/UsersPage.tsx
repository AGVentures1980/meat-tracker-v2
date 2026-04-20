import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Network, User as UserIcon, Shield, Building2, ChevronDown, Plus, Trash2 } from 'lucide-react';

interface NetworkUser {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string;
    role: string;
    position: string | null;
    created_at: string;
    training_progress?: any[];
}

// A simple interface for the pre-defined hierarchy tree
interface HierarchyStore {
    id: number;
    store_name: string;
    location: string;
    gms: NetworkUser[]; // Primary Managers of this store
    staff: NetworkUser[]; // Secondary staff / Chefs
}

interface HierarchyNode {
    areaManagerId: string;
    areaManagerName: string;
    stores: HierarchyStore[];
}

export const UsersPage = () => {
    const { user, selectedCompany } = useAuth();
    
    // Auth levels based on the validated scope injected by the backend token
    const isMasterOrAdmin = user?.scope?.type === 'GLOBAL' || user?.scope?.type === 'COMPANY';
    const isAreaManager = user?.scope?.type === 'AREA';

    const [isLoading, setIsLoading] = useState(true);

    // Context Data
    const [hierarchy, setHierarchy] = useState<HierarchyNode[]>([]);
    
    // UI State: Tab / Focus
    const [expandedAmId, setExpandedAmId] = useState<string | null>(null);
    const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
    const [storeTeam, setStoreTeam] = useState<NetworkUser[]>([]);
    
    // Area Manager Assign Logic
    const [allCompanyStores, setAllCompanyStores] = useState<any[]>([]);
    const [isAssigningStores, setIsAssigningStores] = useState(false);
    const [targetAmId, setTargetAmId] = useState<string | null>(null);
    const [assignedStoreIds, setAssignedStoreIds] = useState<number[]>([]);
    
    const [isAddingUser, setIsAddingUser] = useState(false);
    
    // Form State (Add User)
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [position, setPosition] = useState('Manager');
    const [isPrimary, setIsPrimary] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const API_URL = ((import.meta as any).env?.VITE_API_URL || '').replace(/\/api\/?$/, '').replace(/\/$/, '');

    // ================== DATA FETCHING ================== //
    
    useEffect(() => {
        fetchHierarchy();
    }, [user]);

    useEffect(() => {
        if (selectedStoreId) {
            fetchStoreTeam(selectedStoreId as number);
        } else {
            setStoreTeam([]);
        }
    }, [selectedStoreId]);

    const fetchHierarchy = async () => {
        setIsLoading(true);
        try {
            const token = user?.token;
            if (!token) return;

            // Fetch Area Managers & Stores
            if (isMasterOrAdmin || isAreaManager) {
                const res = await fetch(`${API_URL}/api/v1/dashboard/company/area-managers`, {
                    headers: { 
                        'Authorization': `Bearer ${token}`,
                        'x-company-id': selectedCompany || user?.companyId || ''
                    }
                });
                
                if (res.ok) {
                    const data = await res.json();
                    const ams = data.areaManagers || [];
                    
                    // Build local Tree Representation
                    let tree: HierarchyNode[] = [];
                    setAllCompanyStores(data.allStores || []);
                    
                    if (isAreaManager) {
                       // Filter ONLY to my node
                       const currentUserId = user.id || user.userId;
                       const me = ams.find((a: any) => a.id === currentUserId);
                       if (me) {
                           tree.push({
                               areaManagerId: me.id,
                               areaManagerName: `${me.first_name || ''} ${me.last_name || ''}`.trim() || me.email,
                               stores: me.area_stores.map((s: any) => ({ ...s, gms: [], staff: [] }))
                           });
                           setExpandedAmId(me.id); // Auto expand myself
                       }
                    } else {
                        // Admins see everyone
                        tree = ams.map((am: any) => ({
                            areaManagerId: am.id,
                            areaManagerName: `${am.first_name || ''} ${am.last_name || ''}`.trim() || am.email,
                            stores: am.area_stores.map((s: any) => ({ ...s, gms: [], staff: [] }))
                        }));

                        const assignedStoreIds = new Set(ams.flatMap((am: any) => am.area_stores.map((s: any) => s.id)));
                        const unassignedStores = (data.allStores || []).filter((s: any) => !assignedStoreIds.has(s.id));
                        
                        if (unassignedStores.length > 0) {
                            tree.push({
                                areaManagerId: 'unassigned',
                                areaManagerName: 'Unassigned Stores (Corporate Direct)',
                                stores: unassignedStores.map((s: any) => ({ ...s, gms: [], staff: [] }))
                            });
                        }
                    }
                    
                    setHierarchy(tree);
                }
            } else {
                // If regular Store Manager, they just manage their own store
                if (user?.storeId) {
                    setSelectedStoreId(user.storeId);
                }
            }
        } catch (error) {
            console.error('Failed to fetch context:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchStoreTeam = async (sId: number) => {
        try {
            const token = user?.token;
            if (!token) return;

            const res = await fetch(`${API_URL}/api/v1/users/store?storeId=${sId}`, {
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'x-company-id': selectedCompany || user?.companyId || ''
                }
            });

            if (res.ok) {
                const data = await res.json();
                setStoreTeam(data.users || []);
            }
        } catch (error) {
            console.error('Failed to fetch store team:', error);
        }
    };


    // ================== STORE TEAM ACTIONS ================== //

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedStoreId) {
            alert('Error: Please select a target store first.');
            return;
        }

        setIsSubmitting(true);
        try {
            const token = user?.token;
            const res = await fetch(`${API_URL}/api/v1/users/store`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'x-company-id': selectedCompany || user?.companyId || ''
                },
                body: JSON.stringify({
                    first_name: firstName,
                    last_name: lastName,
                    email,
                    password,
                    position,
                    is_primary: isPrimary,
                    store_id: selectedStoreId
                })
            });

            const data = await res.json();

            if (res.ok && data.success) {
                setFirstName('');
                setLastName('');
                setEmail('');
                setPassword('');
                setPosition('Manager');
                setIsPrimary(false);
                setIsAddingUser(false);
                fetchStoreTeam(selectedStoreId as number);
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

    const handleDeleteUser = async (targetId: string, userEmail: string) => {
        if (!window.confirm(`Are you sure you want to remove ${userEmail}?`)) return;

        try {
            const token = user?.token;
            const res = await fetch(`${API_URL}/api/v1/users/store/${targetId}`, {
                method: 'DELETE',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'x-company-id': selectedCompany || user?.companyId || ''
                }
            });

            if (res.ok) {
                if (selectedStoreId) fetchStoreTeam(selectedStoreId as number);
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to delete user');
            }
        } catch (error) {
            alert('Failed to delete user');
        }
    };

    const isCertified = (u: NetworkUser) => {
        const exam = u.training_progress?.find(p => p.module_id === 'exam');
        return !!(exam && exam.score >= 80);
    };

    // Helper to get store name easily
    const getStoreName = (sId: number) => {
        for (const node of hierarchy) {
            const store = node.stores.find(s => s.id === sId);
            if (store) return store.store_name;
        }
        return 'Unknown Store';
    };

    const openAssignModal = (amId: string, currentStores: any[]) => {
        setTargetAmId(amId);
        setAssignedStoreIds(currentStores.map(s => s.id));
        setIsAssigningStores(true);
    };

    const handleAssignStoresSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setIsSubmitting(true);
            const token = user?.token;
            const res = await fetch(`${API_URL}/api/v1/dashboard/company/area-managers/assign`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'x-company-id': selectedCompany || user?.companyId || ''
                },
                body: JSON.stringify({
                    areaManagerId: targetAmId,
                    storeIds: assignedStoreIds
                })
            });
            
            if (res.ok) {
                setIsAssigningStores(false);
                fetchHierarchy();
            } else {
                const errData = await res.json();
                alert(errData.error || 'Failed to assign stores');
            }
        } catch (error) {
            console.error('Assigning Stores Failed:', error);
            alert('Encountered an error while assigning stores.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return <div className="p-8 text-center text-gray-500 font-mono text-sm uppercase">Loading Corporate Structure...</div>;
    }

    return (
        <div className="p-8 pb-32 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#333] pb-6">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tighter uppercase flex items-center gap-3">
                        <Network className="w-8 h-8 text-[#C5A059]" />
                        Team Command
                    </h1>
                    <p className="text-gray-500 text-sm mt-2 max-w-2xl font-mono">
                        {isMasterOrAdmin 
                            ? `Active Director: ${user?.firstName || user?.lastName ? `${user?.firstName || ''} ${user?.lastName || ''}`.trim() : user?.email}` 
                            : 'Manage your pre-defined hierarchy.'}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
                
                {/* LEFT COL: THE PRE-DEFINED TREE */}
                {isMasterOrAdmin || isAreaManager ? (
                    <div className="lg:col-span-4 space-y-4">
                        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-2 border-l-2 border-[#C5A059]">
                            {isMasterOrAdmin ? 'Network Area Managers' : 'My Supervised Area'}
                        </h2>
                        
                        <div className="bg-[#121212] border border-[#333] rounded-sm overflow-hidden shadow-2xl">
                            {hierarchy.length === 0 ? (
                                <div className="p-8 text-center text-gray-500 text-xs font-mono uppercase">
                                    No designated regions found.
                                </div>
                            ) : (
                                <div className="divide-y divide-[#333]">
                                    {hierarchy.map(node => (
                                        <div key={node.areaManagerId} className="flex flex-col">
                                            {/* Area Manager Row */}
                                            <button 
                                                onClick={() => setExpandedAmId(expandedAmId === node.areaManagerId ? null : node.areaManagerId)}
                                                className={`flex items-center justify-between p-4 w-full text-left transition-colors ${expandedAmId === node.areaManagerId ? 'bg-[#1a1a1a]' : 'hover:bg-white/5'}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border transition-colors ${expandedAmId === node.areaManagerId ? 'bg-[#C5A059]/10 border-[#C5A059]/30' : 'bg-[#222] border-[#333]'}`}>
                                                        <UserIcon className={`w-4 h-4 ${expandedAmId === node.areaManagerId ? 'text-[#C5A059]' : 'text-gray-400'}`} />
                                                    </div>
                                                    <div>
                                                        <span className="text-sm font-bold text-white block">{node.areaManagerName}</span>
                                                        <span className="text-[10px] text-gray-500 font-mono block">Region: {node.stores.length} Stores</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    {isMasterOrAdmin && node.areaManagerId !== 'unassigned' && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); openAssignModal(node.areaManagerId, node.stores); }}
                                                            className="text-[9px] bg-[#C5A059]/10 text-[#C5A059] px-2 py-1 rounded font-bold uppercase tracking-widest hover:bg-[#C5A059]/20 transition-colors border border-[#C5A059]/20"
                                                        >
                                                            Assign Stores
                                                        </button>
                                                    )}
                                                    <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${expandedAmId === node.areaManagerId ? 'rotate-180' : ''}`} />
                                                </div>
                                            </button>
                                            
                                            {/* Stores Row (Expandable) */}
                                            {expandedAmId === node.areaManagerId && (
                                                <div className="bg-[#0f0f0f] border-t border-[#333]">
                                                    {node.stores.length === 0 ? (
                                                        <div className="p-4 pl-14 text-[10px] text-gray-500 font-mono uppercase">
                                                            No stores pre-assigned to this Area Manager.
                                                        </div>
                                                    ) : (
                                                        <div className="divide-y divide-[#222]">
                                                            {node.stores.map(store => (
                                                                <button
                                                                    key={store.id}
                                                                    onClick={() => setSelectedStoreId(store.id)}
                                                                    className={`w-full flex items-center justify-between p-3 pl-14 text-left transition-colors ${selectedStoreId === store.id ? 'bg-[#C5A059]/10' : 'hover:bg-[#1a1a1a]'}`}
                                                                >
                                                                    <div className="flex items-center gap-2">
                                                                        <Building2 className={`w-3 h-3 ${selectedStoreId === store.id ? 'text-[#C5A059]' : 'text-gray-600'}`} />
                                                                        <span className={`text-xs font-bold ${selectedStoreId === store.id ? 'text-[#C5A059]' : 'text-gray-400'}`}>
                                                                            {store.store_name}
                                                                        </span>
                                                                    </div>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ) : null}


                {/* RIGHT COL: LOCAL STORE TEAM / GMS */}
                <div className={`space-y-4 ${isMasterOrAdmin || isAreaManager ? 'lg:col-span-8' : 'lg:col-span-12'}`}>
                    <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-2 border-l-2 border-[#C5A059]">
                        {selectedStoreId ? `Active Duty Roster: ${getStoreName(selectedStoreId)}` : 'Local Store Roster'}
                    </h2>

                    <div className="bg-[#121212] border border-[#333] rounded-sm overflow-hidden shadow-2xl relative min-h-[400px]">
                        {!selectedStoreId ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center text-gray-500 bg-[#1a1a1a]">
                                <Network className="w-12 h-12 text-[#333] mb-4" />
                                <span className="text-sm font-bold uppercase tracking-widest">Awaiting Local Store Selection</span>
                                <span className="text-xs font-mono mt-2 opacity-50 max-w-xs leading-relaxed">Please select a store from the pre-defined hierarchy menu to view and manage its General Managers and local staff.</span>
                            </div>
                        ) : (
                            <div className="flex flex-col h-full">
                                {/* Action Bar */}
                                <div className="p-4 border-b border-[#333] bg-[#1a1a1a] flex justify-between items-center">
                                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                        <Shield className="w-4 h-4 text-[#C5A059]" />
                                        Unit Command Center
                                    </h3>
                                    <button
                                        onClick={() => setIsAddingUser(true)}
                                        className="bg-[#C5A059] hover:bg-[#d6b579] text-black px-4 py-1.5 rounded-sm font-bold text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 relative z-20"
                                    >
                                        <Plus className="w-3 h-3" /> Add Staff Profile
                                    </button>
                                </div>

                                {/* Table */}
                                <div className="overflow-x-auto flex-1 bg-[#121212]">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-[#333] bg-[#0f0f0f]">
                                                <th className="p-4 text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest pl-6">Profile Name</th>
                                                <th className="p-4 text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest">Login / Email</th>
                                                <th className="p-4 text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest">Local Title</th>
                                                <th className="p-4 text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest text-right pr-6">Status / Cert</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#333]">
                                            {storeTeam.length === 0 ? (
                                                <tr>
                                                    <td colSpan={4} className="p-16 text-center text-gray-500 text-xs font-mono uppercase tracking-widest">
                                                        No local profiles exist for this target store.
                                                    </td>
                                                </tr>
                                            ) : (
                                                storeTeam.map((u) => {
                                                    const cert = isCertified(u);
                                                    const isSelf = u.id === user?.userId;

                                                    return (
                                                        <tr key={u.id} className="hover:bg-[#1a1a1a] transition-colors group">
                                                            <td className="p-4 pl-6">
                                                                <div className="flex items-center gap-3">
                                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${u.role === 'admin' ? 'bg-[#C5A059]/10 border-[#C5A059]/30' : 'bg-[#222] border-[#333]'}`}>
                                                                        <UserIcon className={`w-4 h-4 ${u.role === 'admin' ? 'text-[#C5A059]' : 'text-gray-400'}`} />
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-sm font-bold text-white group-hover:text-[#C5A059] transition-colors flex items-center gap-2">
                                                                            {u.first_name || u.last_name ? `${u.first_name || ''} ${u.last_name || ''}`.trim() : 'System Default'}
                                                                            {u.role === 'admin' && <Shield className="w-3 h-3 text-[#C5A059]" />}
                                                                        </p>
                                                                        {isSelf && <span className="text-[9px] bg-[#C5A059]/10 text-[#C5A059] px-1.5 py-0.5 rounded uppercase tracking-wider mt-1 inline-block">Current User</span>}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="p-4 text-xs text-gray-400 font-mono">
                                                                {u.email}
                                                            </td>
                                                            <td className="p-4">
                                                                <div className="flex flex-col">
                                                                    <div className="flex items-center gap-2">
                                                                        {/* If the user is flagged as primary GM show star or specific color */}
                                                                        {u.position === 'General Manager (GM)' || u.position?.includes('GM') ? (
                                                                             <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-sm font-bold uppercase tracking-widest whitespace-nowrap border border-blue-500/20">{u.position || 'GM'}</span>   
                                                                        ) : (
                                                                             <span className="text-[10px] text-[#C5A059] font-bold uppercase tracking-wider whitespace-nowrap">{u.position || 'Local Staff'}</span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="p-4 pr-6 text-right">
                                                                <div className="flex items-center justify-end gap-4 relative z-20">
                                                                    {cert ? (
                                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm bg-green-500/10 text-green-400 text-[9px] font-bold uppercase tracking-widest border border-green-500/20 pointer-events-none">
                                                                            Certified
                                                                        </span>
                                                                    ) : (
                                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm bg-orange-500/10 text-orange-400 text-[9px] font-bold uppercase tracking-widest border border-orange-500/20 pointer-events-none">
                                                                            Pending
                                                                        </span>
                                                                    )}

                                                                    {!isSelf && (
                                                                        <button
                                                                            onClick={() => handleDeleteUser(u.id, u.email)}
                                                                            className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-sm transition-all"
                                                                            title="Remove User"
                                                                        >
                                                                            <Trash2 className="w-4 h-4" />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

            </div>

            {/* MODAL: ADD STORE TEAM MEMBER */}
            {isAddingUser && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#121212] border border-[#C5A059]/30 rounded-sm max-w-md w-full shadow-2xl relative overflow-hidden">
                        <div className="h-1 w-full bg-gradient-to-r from-[#C5A059] to-yellow-600" />
                        <div className="p-8">
                            <h3 className="text-xl font-bold text-white mb-2 uppercase tracking-wide">Add Local Staff Profile</h3>
                            <p className="text-xs text-[#C5A059] font-bold mb-4 uppercase tracking-widest bg-[#C5A059]/10 p-2 rounded border border-[#C5A059]/20 inline-block">
                                Target Store: {getStoreName(selectedStoreId!)}
                            </p>
                            <p className="text-xs text-gray-500 font-mono mb-6">
                                Users are bound strictly to this store's operational boundaries.
                            </p>

                            <form onSubmit={handleAddUser} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="firstName" className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">First Name</label>
                                        <input
                                            id="firstName" title="First Name"
                                            type="text" required autoFocus
                                            value={firstName} onChange={e => setFirstName(e.target.value)}
                                            className="w-full bg-[#1a1a1a] border border-[#333] rounded-sm p-3 text-white focus:border-[#C5A059] outline-none text-sm transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="lastName" className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Last Name</label>
                                        <input
                                            id="lastName" title="Last Name"
                                            type="text" required
                                            value={lastName} onChange={e => setLastName(e.target.value)}
                                            className="w-full bg-[#1a1a1a] border border-[#333] rounded-sm p-3 text-white focus:border-[#C5A059] outline-none text-sm transition-colors"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="email" className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Corporate Email</label>
                                    <input
                                        id="email" title="Email"
                                        type="email" required autoComplete="off"
                                        value={email} onChange={e => setEmail(e.target.value)}
                                        className="w-full bg-[#1a1a1a] border border-[#333] rounded-sm p-3 text-white focus:border-[#C5A059] outline-none text-sm transition-colors font-mono"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="position" className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Role Designation</label>
                                        <select
                                            id="position" title="Position"
                                            value={position} onChange={e => setPosition(e.target.value)}
                                            className="w-full bg-[#1a1a1a] border border-[#333] rounded-sm p-3 text-white focus:border-[#C5A059] outline-none text-sm transition-colors"
                                        >
                                            <option value="General Manager (GM)">General Manager (GM)</option>
                                            <option value="Assistant Manager">Assistant Manager</option>
                                            <option value="Chef">Chef</option>
                                            <option value="Carver Leader">Carver Leader</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="password" className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Initial Password</label>
                                        <input
                                            id="password" title="Password"
                                            type="password" required autoComplete="new-password"
                                            value={password} onChange={e => setPassword(e.target.value)}
                                            className="w-full bg-[#1a1a1a] border border-[#333] rounded-sm p-3 text-white focus:border-[#C5A059] outline-none text-sm transition-colors font-mono"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-3 justify-end pt-6 mt-4 border-t border-[#333]">
                                    <button
                                        type="button"
                                        onClick={() => setIsAddingUser(false)}
                                        className="px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-white transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="bg-[#C5A059] hover:bg-[#d6b579] text-black px-6 py-2.5 rounded-sm font-bold text-xs uppercase tracking-widest transition-all shadow-lg flex items-center justify-center disabled:opacity-50 min-w-[140px]"
                                    >
                                        {isSubmitting ? 'Creating...' : 'Provision Staff'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
            {/* MODAL: ASSIGN STORES TO AREA MANAGER */}
            {isAssigningStores && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#121212] border border-[#C5A059]/30 rounded-sm max-w-2xl w-full shadow-2xl relative overflow-hidden max-h-[90vh] flex flex-col">
                        <div className="h-1 w-full bg-gradient-to-r from-[#C5A059] to-yellow-600 shrink-0" />
                        <div className="p-8 flex flex-col flex-1 overflow-hidden">
                            <h3 className="text-xl font-bold text-white mb-2 uppercase tracking-wide">Assign Regional Stores</h3>
                            <p className="text-xs text-gray-500 font-mono mb-6">
                                Select all store locations that should be under the jurisdiction of this Area Manager. 
                                Removing a store immediately revokes their regional access to that unit's data.
                            </p>

                            <form onSubmit={handleAssignStoresSubmit} className="flex flex-col flex-1 overflow-hidden">
                                <div className="flex-1 overflow-y-auto pr-2 space-y-2 mb-6 border border-[#333] p-4 bg-[#0a0a0a] rounded-sm">
                                    {allCompanyStores.length === 0 ? (
                                        <p className="text-xs text-gray-500 text-center p-4">No stores available for association.</p>
                                    ) : (
                                        allCompanyStores.map(store => {
                                            const isChecked = assignedStoreIds.includes(store.id);
                                            return (
                                                <label 
                                                    key={store.id} 
                                                    className={`flex items-center gap-3 p-3 border rounded-sm cursor-pointer transition-colors ${isChecked ? 'bg-[#C5A059]/10 border-[#C5A059]/30' : 'bg-[#1a1a1a] border-[#333] hover:border-gray-500'}`}
                                                >
                                                    <input 
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        onChange={(e) => {
                                                            if (e.target.checked) setAssignedStoreIds([...assignedStoreIds, store.id]);
                                                            else setAssignedStoreIds(assignedStoreIds.filter(id => id !== store.id));
                                                        }}
                                                        className="w-4 h-4 accent-[#C5A059] bg-[#222] border-[#444] rounded"
                                                    />
                                                    <div className="flex flex-col">
                                                        <span className={`text-sm font-bold ${isChecked ? 'text-white' : 'text-gray-400'}`}>{store.store_name}</span>
                                                        <span className="text-[10px] text-gray-500 uppercase tracking-widest">{store.location}</span>
                                                    </div>
                                                </label>
                                            )
                                        })
                                    )}
                                </div>

                                <div className="flex gap-3 justify-end pt-4 border-t border-[#333] shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => setIsAssigningStores(false)}
                                        className="px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-white transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="bg-[#C5A059] hover:bg-[#d6b579] text-black px-6 py-2.5 rounded-sm font-bold text-xs uppercase tracking-widest transition-all shadow-lg flex items-center justify-center disabled:opacity-50 min-w-[160px]"
                                    >
                                        {isSubmitting ? 'Updating Policy...' : 'Commit Assignment'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

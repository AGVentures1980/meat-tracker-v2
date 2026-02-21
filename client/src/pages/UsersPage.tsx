import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Users, Plus, Trash2, Mail, User as UserIcon, Shield, Search } from 'lucide-react';

interface StoreUser {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string;
    role: string;
    created_at: string;
    training_progress: any[];
}

export const UsersPage = () => {
    const { user } = useAuth();
    const [users, setUsers] = useState<StoreUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);

    // Form State
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isMasterOrAdmin = user?.role === 'admin' || user?.role === 'director' || user?.email === 'alexandre@alexgarciaventures.co';

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const token = user?.token;
            if (!token) return;

            const res = await fetch('/api/v1/users/store', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setUsers(data.users || []);
            }
        } catch (error) {
            console.error('Failed to fetch users:', error);
        } finally {
            setIsLoading(false);
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
            const res = await fetch('/api/v1/users/store', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    first_name: firstName,
                    last_name: lastName,
                    email,
                    password
                })
            });

            const data = await res.json();

            if (res.ok && data.success) {
                // Reset form and close
                setFirstName('');
                setLastName('');
                setEmail('');
                setPassword('');
                setIsAdding(false);
                fetchUsers();
            } else {
                alert(`Error: ${data.error || 'Failed to add user'}`);
            }
        } catch (error) {
            console.error('Add user error:', error);
            alert('Failed to connect to the server. It might be restarting, please try again in a minute.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteUser = async (targetId: string, userEmail: string) => {
        if (!window.confirm(`Are you sure you want to remove ${userEmail} from this store?`)) return;

        try {
            const token = user?.token;
            const res = await fetch(`/api/v1/users/store/${targetId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                fetchUsers();
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to delete user');
            }
        } catch (error) {
            alert('Failed to delete user');
        }
    };

    const isCertified = (u: StoreUser) => {
        const exam = u.training_progress?.find(p => p.module_id === 'exam');
        return !!(exam && exam.score >= 80);
    };

    return (
        <div className="p-8 pb-32 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#333] pb-6">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tighter uppercase flex items-center gap-3">
                        <Users className="w-8 h-8 text-brand-gold" />
                        Store Team Management
                    </h1>
                    <p className="text-gray-500 text-sm mt-2 max-w-2xl font-mono">
                        Manage access for Assistant Managers, Kitchen Managers, and other key staff members. All users added to your store are required to complete the Brasa Intel Training Center to maintain store compliance.
                    </p>
                </div>

                {(!isMasterOrAdmin && user?.isPrimary !== false) && (
                    <button
                        onClick={() => setIsAdding(true)}
                        className="bg-brand-gold hover:bg-yellow-500 text-black px-6 py-3 rounded-sm font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap"
                    >
                        <Plus className="w-4 h-4" /> Add Team Member
                    </button>
                )}
            </div>

            {isMasterOrAdmin && (
                <div className="p-4 bg-brand-gold/10 border border-brand-gold/30 rounded-sm mb-6 flex items-start gap-3">
                    <Shield className="w-5 h-5 text-brand-gold shrink-0 mt-0.5" />
                    <div>
                        <h4 className="text-sm font-bold text-brand-gold uppercase">Administrator View</h4>
                        <p className="text-xs text-gray-400 mt-1">
                            You are viewing this page as a system administrator. The user list below shows the team members for the store associated with your current session. To add users to a specific store, please log in as the Store Manager.
                        </p>
                    </div>
                </div>
            )}

            {/* Team List Box */}
            <div className="bg-[#121212] border border-[#333] rounded-sm overflow-hidden">
                <div className="p-6 border-b border-[#333] flex justify-between items-center bg-[#1a1a1a]">
                    <h2 className="text-lg font-bold text-white uppercase tracking-wider">Active Team Members ({users.length})</h2>
                    <div className="relative">
                        <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search users..."
                            className="bg-[#121212] border border-[#333] rounded-sm py-2 pl-10 pr-4 text-xs text-white focus:border-brand-gold outline-none w-64"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-[#333] bg-[#0f0f0f]">
                                <th className="p-4 text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest pl-6">Name</th>
                                <th className="p-4 text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest">Email</th>
                                <th className="p-4 text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest">Role</th>
                                <th className="p-4 text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest">Training Status</th>
                                <th className="p-4 text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest text-right pr-6">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#333]">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center bg-[#1a1a1a]">
                                        <div className="flex flex-col items-center justify-center text-gray-500">
                                            <div className="w-6 h-6 border-2 border-brand-gold border-t-transparent rounded-full animate-spin mb-4" />
                                            <p className="text-xs uppercase tracking-widest font-mono">Loading Team Data...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-gray-500 text-xs font-mono uppercase tracking-widest bg-[#1a1a1a]">
                                        No team members found for this store.
                                    </td>
                                </tr>
                            ) : (
                                users.map((u) => {
                                    const cert = isCertified(u);
                                    const isSelf = u.id === user?.userId;

                                    return (
                                        <tr key={u.id} className="hover:bg-[#1a1a1a] transition-colors group">
                                            <td className="p-4 pl-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-[#222] border border-[#333] flex items-center justify-center shrink-0">
                                                        <UserIcon className="w-4 h-4 text-gray-400" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-white group-hover:text-brand-gold transition-colors">
                                                            {u.first_name || u.last_name ? `${u.first_name || ''} ${u.last_name || ''}`.trim() : 'System User'}
                                                        </p>
                                                        {isSelf && <span className="text-[9px] bg-brand-gold/10 text-brand-gold px-1.5 py-0.5 rounded uppercase tracking-wider mt-1 inline-block">You</span>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2 text-sm text-gray-400">
                                                    <Mail className="w-3 h-3" />
                                                    {u.email}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <span className="text-xs text-gray-400 font-mono uppercase tracking-wider">{u.role}</span>
                                            </td>
                                            <td className="p-4">
                                                {cert ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-green-500/10 border border-green-500/20 text-green-400 text-[10px] font-bold uppercase tracking-wider">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                                                        Certified
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[10px] font-bold uppercase tracking-wider">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                                                        Pending Training
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-4 pr-6 text-right">
                                                {!isSelf && (!isMasterOrAdmin && user?.isPrimary !== false) && (
                                                    <button
                                                        onClick={() => handleDeleteUser(u.id, u.email)}
                                                        className="p-2 text-gray-600 hover:text-red-500 hover:bg-red-500/10 rounded-sm transition-all"
                                                        title="Remove User"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Adding Modal */}
            {isAdding && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#121212] border border-brand-gold/30 rounded-sm max-w-md w-full shadow-2xl relative overflow-hidden">

                        {/* Accent Line */}
                        <div className="h-1 w-full bg-gradient-to-r from-brand-gold to-yellow-600" />

                        <div className="p-8">
                            <h3 className="text-xl font-bold text-white mb-2 uppercase tracking-wide">Add Team Member</h3>
                            <p className="text-xs text-gray-500 font-mono mb-6">Creates a new user account linked to your store. The user will be required to log in and change their password upon first access.</p>

                            <form onSubmit={handleAddUser} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="firstName" className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 font-mono">First Name</label>
                                        <input
                                            id="firstName"
                                            type="text"
                                            autoFocus
                                            required
                                            autoComplete="off"
                                            value={firstName}
                                            onChange={e => setFirstName(e.target.value)}
                                            className="w-full bg-[#1a1a1a] border border-[#333] rounded-sm p-3 text-white focus:border-brand-gold outline-none text-sm transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="lastName" className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 font-mono">Last Name</label>
                                        <input
                                            id="lastName"
                                            type="text"
                                            required
                                            autoComplete="off"
                                            value={lastName}
                                            onChange={e => setLastName(e.target.value)}
                                            className="w-full bg-[#1a1a1a] border border-[#333] rounded-sm p-3 text-white focus:border-brand-gold outline-none text-sm transition-colors"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="email" className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 font-mono">Email Address</label>
                                    <input
                                        id="email"
                                        type="email"
                                        required
                                        autoComplete="off"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        className="w-full bg-[#1a1a1a] border border-[#333] rounded-sm p-3 text-white focus:border-brand-gold outline-none text-sm transition-colors"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="tempPassword" className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 font-mono">Temporary Password</label>
                                    <input
                                        id="tempPassword"
                                        type="password"
                                        required
                                        autoComplete="new-password"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        className="w-full bg-[#1a1a1a] border border-[#333] rounded-sm p-3 text-white focus:border-brand-gold outline-none text-sm transition-colors font-mono"
                                    />
                                </div>

                                <div className="flex gap-3 justify-end pt-6 mt-4 border-t border-[#333]">
                                    <button
                                        type="button"
                                        onClick={() => setIsAdding(false)}
                                        className="px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-white transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="bg-brand-gold hover:bg-yellow-500 text-black px-6 py-2.5 rounded-sm font-bold text-xs uppercase tracking-widest transition-all disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {isSubmitting ? 'Creating...' : 'Create Account'}
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

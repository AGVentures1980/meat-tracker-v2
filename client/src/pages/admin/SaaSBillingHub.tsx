import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { CreditCard, DollarSign, Building2, TrendingUp, AlertOctagon, ExternalLink } from 'lucide-react';

export const SaaSBillingHub = () => {
    const { user } = useAuth();
    const [data, setData] = useState<{ overview: any, subscriptions: any[] } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch('/api/v1/billing/all-subscriptions', {
                    headers: { 'Authorization': `Bearer ${user?.token}` }
                });
                if (res.ok) {
                    setData(await res.json());
                }
            } catch (err) {
                console.error("Failed to load billing stats", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user]);

    const handleOpenStripe = () => {
        window.open('https://dashboard.stripe.com/test/payments', '_blank');
    };

    if (loading) {
        return (
            <div className="flex-1 p-8 text-center text-gray-500 animate-pulse uppercase tracking-widest text-xs">
                Syncing with Stripe Database...
            </div>
        );
    }

    return (
        <div className="flex-1 p-8 space-y-8 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-[#333] pb-6">
                <div>
                    <h1 className="text-3xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                        <DollarSign className="w-8 h-8 text-[#00FF94]" /> 
                        Master Stripe Console
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">Global oversight of all tenant subscriptions, invoicing, and Monthly Recurring Revenue (MRR).</p>
                </div>
                <button 
                    onClick={handleOpenStripe}
                    className="px-6 py-3 bg-[#635BFF] hover:bg-[#5851df] text-white rounded font-bold uppercase tracking-wider text-xs transition-colors flex items-center gap-3 shadow-[0_0_15px_rgba(99,91,255,0.4)]"
                >
                    <CreditCard className="w-4 h-4" /> Open Official Stripe HQ <ExternalLink className="w-3 h-3" />
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#00FF94] opacity-5 rounded-bl-full"></div>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest flex items-center gap-2 mb-2"><TrendingUp className="w-3 h-3 text-[#00FF94]" /> Global MRR Pipeline</p>
                    <p className="text-4xl font-black text-white font-mono">${(data?.overview?.total_mrr || 0).toLocaleString()}</p>
                    <p className="text-xs text-[#00FF94] mt-2">Based on $1000/store pricing model</p>
                </div>
                
                <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#C5A059] opacity-5 rounded-bl-full"></div>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest flex items-center gap-2 mb-2"><Building2 className="w-3 h-3 text-[#C5A059]" /> Active Network Stores</p>
                    <p className="text-4xl font-black text-white font-mono">{data?.overview?.total_active_stores || 0}</p>
                    <p className="text-xs text-[#C5A059] mt-2">Billed licenses tracking active operations</p>
                </div>

                <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-6 relative overflow-hidden">
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest flex items-center gap-2 mb-2"><Building2 className="w-3 h-3" /> Total Organizations</p>
                    <p className="text-4xl font-black text-white font-mono">{data?.overview?.total_companies || 0}</p>
                    <p className="text-xs text-gray-400 mt-2">Total registered SaaS profiles</p>
                </div>
            </div>

            <div className="bg-[#1a1a1a] border border-[#333] rounded-xl overflow-hidden shadow-2xl">
                <div className="p-4 border-b border-[#333] bg-[#222]">
                    <h2 className="text-sm font-bold text-white uppercase tracking-widest">Network Ledger</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-[#111] text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                            <tr>
                                <th className="p-4">Organization</th>
                                <th className="p-4">Billing Status</th>
                                <th className="p-4 text-center">Stores (Licensed / Actual)</th>
                                <th className="p-4">Projected MRR</th>
                                <th className="p-4 text-right">Stripe IDs</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#333]">
                            {data?.subscriptions.map((sub: any) => (
                                <tr key={sub.id} className="hover:bg-white/5 transition-colors group">
                                    <td className="p-4 font-bold text-white text-sm">{sub.name}</td>
                                    <td className="p-4">
                                        {sub.status === 'active' ? (
                                            <span className="px-2 py-1 bg-[#00FF94]/10 text-[#00FF94] border border-[#00FF94]/30 text-[9px] font-bold uppercase tracking-wider rounded">ACTIVE</span>
                                        ) : sub.status === 'past_due' ? (
                                            <span className="px-2 py-1 bg-red-500/10 text-red-500 border border-red-500/30 text-[9px] font-bold uppercase tracking-wider rounded flex items-center gap-1 w-max"><AlertOctagon className="w-3 h-3" /> PAST DUE</span>
                                        ) : (
                                            <span className="px-2 py-1 bg-[#C5A059]/10 text-[#C5A059] border border-[#C5A059]/30 text-[9px] font-bold uppercase tracking-wider rounded">TRIALING</span>
                                        )}
                                    </td>
                                    <td className="p-4 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <p className="text-white font-mono font-bold">{sub.licensed_stores}</p>
                                            <span className="text-gray-600">/</span>
                                            <p className="text-gray-400 font-mono text-xs">{sub.actual_stores}</p>
                                        </div>
                                        {sub.licensed_stores < sub.actual_stores && (
                                            <p className="text-[9px] text-red-400 mt-1 uppercase tracking-widest">Under-Licensed</p>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <span className="text-white font-mono font-bold">${sub.mrr}</span>
                                    </td>
                                    <td className="p-4 text-right">
                                        {sub.stripe_customer_id ? (
                                            <div className="flex flex-col items-end gap-1">
                                                <span className="text-[9px] font-mono text-gray-500 bg-black px-1 rounded">{sub.stripe_customer_id}</span>
                                                {sub.stripe_subscription_id && (
                                                     <span className="text-[9px] font-mono text-blue-400 bg-blue-900/20 px-1 rounded">{sub.stripe_subscription_id}</span>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-[10px] text-gray-600 uppercase font-bold tracking-widest">Unsynced</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {(!data || data.subscriptions.length === 0) && (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-gray-500 text-xs uppercase tracking-widest">No organizations found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

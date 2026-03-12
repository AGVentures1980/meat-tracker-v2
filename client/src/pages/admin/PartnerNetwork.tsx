import React, { useState, useEffect } from 'react';
import { Network, Search, AlertTriangle, CheckCircle, Clock, PlusCircle, Trash2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export const PartnerNetwork: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const API_URL = (import.meta as any).env.VITE_API_URL || '';
    const [partners, setPartners] = useState<any[]>([]);
    const [escalated, setEscalated] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [executingPayout, setExecutingPayout] = useState<string | null>(null);

    const fetchNetworkData = async () => {
        try {
            const [networkRes, escalatedRes] = await Promise.all([
                    fetch(`${API_URL}/api/v1/admin-partner/network`, { headers: { 'Authorization': `Bearer ${user?.token}` } }),
                    fetch(`${API_URL}/api/v1/admin-partner/escalated`, { headers: { 'Authorization': `Bearer ${user?.token}` } })
                ]);
                
                if (networkRes.ok) {
                    const data = await networkRes.json();
                    if (data.success) setPartners(data.partners);
                }
                if (escalatedRes.ok) {
                    const data = await escalatedRes.json();
                    if (data.success) setEscalated(data.proposals);
                }
            } catch (err) {
                console.error("Failed to fetch partner network data", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNetworkData();
    }, [user?.token, API_URL]);

    const handleExecutePayouts = async (partnerId: string, partnerName: string) => {
        if (!window.confirm(`Are you sure you want to execute all Pending PayPal payouts for ${partnerName}? This action cannot be undone and transfers real funds.`)) {
            return;
        }

        setExecutingPayout(partnerId);
        try {
            const res = await fetch(`${API_URL}/api/v1/admin-partner/payouts/execute`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user?.token}` 
                },
                body: JSON.stringify({ partnerId })
            });

            const data = await res.json();
            if (data.success) {
                alert(`Success! \$${data.total_payout.toFixed(2)} disbursed to ${partnerName}. PayPal Batch ID: ${data.batch_id}`);
                // Refresh network data to show 0 pending
                await fetchNetworkData();
            } else {
                alert(`Payout Failed: ${data.error || 'Unknown Error'}`);
            }
        } catch (err) {
            console.error("Payout execution error:", err);
            alert("A network error occurred while executing the payout.");
        } finally {
            setExecutingPayout(null);
        }
    };

    const handleDeleteProposal = async (proposalId: string, clientName: string) => {
        if (!window.confirm(`Are you sure you want to permanently delete the proposal for ${clientName}?`)) {
            return;
        }

        try {
            const res = await fetch(`${API_URL}/api/v1/admin-partner/escalated/${proposalId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${user?.token}` }
            });

            if (res.ok) {
                fetchNetworkData(); // Refresh UI
            } else {
                alert('Failed to delete proposal.');
            }
        } catch (err) {
            console.error('Failed to delete proposal:', err);
        }
    };

    const handleForceProvision = async (proposalId: string, clientName: string) => {
        if (!window.confirm(`FORCE PROVISION: Are you sure you want to bypass Stripe and immediately create the Tenant Organization for ${clientName}? This will instantly launch the live Dashboard for them.`)) {
            return;
        }

        try {
            const res = await fetch(`${API_URL}/api/v1/admin-partner/escalated/${proposalId}/provision`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${user?.token}` }
            });

            const data = await res.json();
            if (data.success) {
                alert(`SUCCESS: Organization ${clientName} is now live and provisioned!`);
                fetchNetworkData(); // Refresh UI
            } else {
                alert(`Provisioning Failed: ${data.error || 'Unknown Error'}`);
            }
        } catch (err) {
            console.error('Failed to provision organization:', err);
            alert("A network error occurred while provisioning.");
        }
    };

    if (loading) {
        return <div className="p-8 text-gray-400">Synchronizing Global Network...</div>;
    }

    return (
        <div className="min-h-screen bg-[#050505] p-6 lg:p-12 w-full flex flex-col pt-24">
            <div className="max-w-6xl mx-auto w-full">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6 pb-6 border-b border-white/5">
                    <div>
                        <h1 className="text-3xl lg:text-4xl font-black text-white flex items-center gap-4 tracking-tight">
                            <Network className="text-indigo-500 w-10 h-10" />
                            Global Partner Network
                        </h1>
                        <p className="text-gray-400 mt-3 font-mono text-sm tracking-wide uppercase">
                            Executive oversight of all regional resellers and MRR performance.
                        </p>
                    </div>
                    
                    <button 
                        onClick={() => navigate('/partner/proposal/new')}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(79,70,229,0.3)] border border-indigo-400/30 whitespace-nowrap"
                    >
                        <PlusCircle className="w-5 h-5" />
                        New Smart Proposal
                    </button>
                </div>

                {/* Anti-Fraud / Mega Deal Escalations */}
                {escalated.length > 0 && (
                    <div className="bg-amber-900/20 border border-amber-500/50 rounded-xl p-6 shadow-2xl mb-8">
                        <h3 className="text-xl font-bold text-amber-500 mb-4 flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5" />
                            Pending Proposals (Manual Provisioning)
                        </h3>
                        <div className="space-y-4">
                            {escalated.map((prop: any) => (
                                <div key={prop.id} className="bg-[#111] p-4 rounded-lg flex justify-between items-center border border-amber-900/50">
                                    <div>
                                        <h4 className="font-bold text-white mb-1">
                                            {prop.client_name} 
                                            <span className="text-xs ml-2 font-normal px-2 py-0.5 rounded-full bg-amber-900/40 text-amber-300 border border-amber-500/30">
                                                {prop.store_count} Stores | {prop.status}
                                            </span>
                                        </h4>
                                        <div className="flex flex-col gap-1 text-xs text-gray-400">
                                            <span>Partner: <span className="text-gray-300 font-mono">{prop.partner.user.email}</span></span>
                                            <span>Hunting Setup: <span className="text-emerald-400/80 font-mono">${prop.setup_fee.toLocaleString()}</span></span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 items-center">
                                        <button 
                                            onClick={() => handleForceProvision(prop.id, prop.client_name)}
                                            className="px-4 py-2 bg-amber-600 hover:bg-emerald-600 text-white rounded font-bold text-sm transition-colors shadow-lg shadow-amber-900/20 flex items-center gap-2 border border-amber-500/50 hover:border-emerald-400"
                                            title="Bypass Stripe and Build Organization"
                                        >
                                            Force Provision & Activate
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteProposal(prop.id, prop.client_name)}
                                            className="px-4 py-2 bg-red-900/30 hover:bg-red-800/80 text-red-500 hover:text-white border border-red-900/50 rounded font-medium text-sm transition-colors"
                                            title="Delete Proposal"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Partner Node Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {partners.map(partner => (
                        <div key={partner.id} className="bg-[#111] border border-gray-800 rounded-xl p-6 hover:border-indigo-500/50 transition-colors shadow-xl relative overflow-hidden group">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h3 className="text-lg font-bold text-white">{partner.name}</h3>
                                    <p className="text-sm text-gray-400">{partner.email}</p>
                                </div>
                                <span className="px-2 py-1 text-xs font-bold rounded-full bg-emerald-900/30 text-emerald-400 border border-emerald-800">
                                    {partner.country}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="bg-[#0a0a0a] p-3 rounded-lg border border-gray-800">
                                    <span className="text-xs text-gray-500 block mb-1">Active MRR</span>
                                    <span className="text-xl font-mono text-emerald-400 font-bold">${partner.metrics.totalMRR.toLocaleString()}</span>
                                </div>
                                <div className="bg-[#0a0a0a] p-3 rounded-lg border border-gray-800">
                                    <span className="text-xs text-gray-500 block mb-1">Live Clients</span>
                                    <span className="text-xl font-mono text-blue-400 font-bold">{partner.metrics.activeClients}</span>
                                </div>
                            </div>

                            {partner.metrics.pendingPayouts > 0 ? (
                                <button 
                                    onClick={() => handleExecutePayouts(partner.id, partner.name)}
                                    disabled={executingPayout === partner.id}
                                    className="w-full flex items-center justify-center gap-2 p-3 bg-indigo-900/40 hover:bg-indigo-600/50 rounded-lg border border-indigo-500/50 transition-all shadow-md group-hover:border-indigo-400 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-left"
                                >
                                    <Clock className={`w-4 h-4 ${executingPayout === partner.id ? 'text-gray-400 animate-spin' : 'text-indigo-400 group-hover:text-white'}`} />
                                    <span className={`text-sm font-bold ${executingPayout === partner.id ? 'text-gray-400' : 'text-indigo-200 group-hover:text-white'}`}>
                                        {executingPayout === partner.id 
                                            ? 'EXECUTING TRANSFER...' 
                                            : `Approve & Pay \$${partner.metrics.pendingPayouts.toLocaleString()}`}
                                    </span>
                                </button>
                            ) : (
                                <div className="flex items-center gap-2 p-3 bg-[#0a0a0a] rounded-lg">
                                    <CheckCircle className="w-4 h-4 text-gray-600" />
                                    <span className="text-sm text-gray-500">All payouts cleared</span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
                
                {partners.length === 0 && (
                    <div className="text-center py-32 bg-[#111] border-dashed border border-gray-800 rounded-xl text-gray-500 font-mono uppercase tracking-widest mt-8 shadow-2xl">
                        No active partners in the global network yet.
                    </div>
                )}
            </div>
        </div>
    );
};

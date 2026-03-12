import React, { useState, useEffect } from 'react';
import { Network, Search, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const PartnerNetwork: React.FC = () => {
    const { user } = useAuth();
    const API_URL = (import.meta as any).env.VITE_API_URL || '';
    const [partners, setPartners] = useState<any[]>([]);
    const [escalated, setEscalated] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
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

        fetchNetworkData();
    }, []);

    if (loading) {
        return <div className="p-8 text-gray-400">Synchronizing Global Network...</div>;
    }

    return (
        <div className="p-8 space-y-8 animate-fade-in">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                        <Network className="text-indigo-500 w-8 h-8" />
                        Global Partner Network
                    </h2>
                    <p className="text-gray-400 mt-2">Executive oversight of all regional resellers and MRR performance.</p>
                </div>
            </div>

            {/* Anti-Fraud / Mega Deal Escalations */}
            {escalated.length > 0 && (
                <div className="bg-amber-900/20 border border-amber-500/50 rounded-xl p-6 shadow-2xl">
                    <h3 className="text-xl font-bold text-amber-500 mb-4 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5" />
                        Pending Enterprise Escalations
                    </h3>
                    <div className="space-y-4">
                        {escalated.map((prop) => (
                            <div key={prop.id} className="bg-[#111] p-4 rounded-lg flex justify-between items-center border border-amber-900/50">
                                <div>
                                    <h4 className="font-bold text-white">{prop.client_name} <span className="text-sm font-normal text-amber-200">({prop.store_count} Stores)</span></h4>
                                    <p className="text-sm text-gray-400">Originated by: {prop.partner.user.email}</p>
                                </div>
                                <button className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded font-medium text-sm transition-colors">
                                    Review Deal Structuring
                                </button>
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
                            <div className="flex items-center gap-2 p-3 bg-indigo-900/20 rounded-lg border border-indigo-500/30">
                                <Clock className="w-4 h-4 text-indigo-400" />
                                <span className="text-sm font-medium text-indigo-200">
                                    ${partner.metrics.pendingPayouts.toLocaleString()} Payout Pending
                                </span>
                            </div>
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
                <div className="text-center py-20 bg-[#111] border-dashed border border-gray-800 rounded-xl text-gray-400">
                    No active partners in the global network yet.
                </div>
            )}
        </div>
    );
};

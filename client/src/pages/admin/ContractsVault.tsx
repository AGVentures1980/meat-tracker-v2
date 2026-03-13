import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, Search, Clock, MapPin, Database, Award, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const ContractsVault: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const API_URL = (import.meta as any).env.VITE_API_URL || '';
    
    const [agreements, setAgreements] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchVault = async () => {
            try {
                const res = await fetch(`${API_URL}/api/v1/agv-admin/vault`, {
                    headers: { 'Authorization': `Bearer ${user?.token}` }
                });
                const data = await res.json();
                if (data.success) {
                    setAgreements(data.agreements);
                }
            } catch (error) {
                console.error('Failed to fetch vault agreements', error);
            } finally {
                setLoading(false);
            }
        };

        if (user?.token) {
            fetchVault();
        }
    }, [user, API_URL]);

    const filteredAgreements = agreements.filter(a => 
        a.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        a.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.legal_entity_type.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return <div className="p-8 text-emerald-500 font-mono animate-pulse">Decrypting AGV Contracts Vault...</div>;
    }

    return (
        <div className="p-8 w-full max-w-7xl mx-auto animate-fade-in">
            {/* Back Button */}
            <div className="mb-8">
                <button
                    onClick={() => navigate('/saas-admin')}
                    className="flex items-center gap-2 px-4 py-2 bg-[#111] hover:bg-gray-800 border border-gray-800 hover:border-emerald-500/50 text-gray-400 hover:text-emerald-500 rounded-full transition-all group w-max"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    <span className="text-sm font-medium tracking-wide">Return to Command Center</span>
                </button>
            </div>

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                        <ShieldCheck className="w-8 h-8 text-emerald-500" />
                        Master Contracts Vault
                    </h1>
                    <p className="text-gray-400 mt-2">Secure cryptographic log of all AGV Partner / Reseller NDAs and Operating Agreements.</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 mt-12 md:mt-0">
                    <div className="relative">
                        <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search entities or partners..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full sm:w-80 bg-[#111] border border-gray-800 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
                        />
                    </div>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                <div className="bg-[#0a0a0a] border border-gray-800 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/[0.03] rounded-bl-[100px] transition-transform group-hover:scale-110"></div>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-gray-400 font-medium tracking-wide text-sm">SECURED CONTRACTS</h3>
                        <Database className="w-5 h-5 text-emerald-500" />
                    </div>
                    <p className="text-4xl font-bold text-white">{agreements.length}</p>
                </div>
                
                <div className="bg-[#0a0a0a] border border-gray-800 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/[0.03] rounded-bl-[100px] transition-transform group-hover:scale-110"></div>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-gray-400 font-medium tracking-wide text-sm">CORPORATE ENTITIES</h3>
                        <Award className="w-5 h-5 text-blue-500" />
                    </div>
                    <p className="text-4xl font-bold text-white">
                        {agreements.filter(a => a.legal_entity_type === 'Company').length}
                    </p>
                </div>

                <div className="bg-[#0a0a0a] border border-gray-800 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/[0.03] rounded-bl-[100px] transition-transform group-hover:scale-110"></div>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-gray-400 font-medium tracking-wide text-sm">INDIVIDUAL PROPRIETORS</h3>
                        <Award className="w-5 h-5 text-purple-500" />
                    </div>
                    <p className="text-4xl font-bold text-white">
                         {agreements.filter(a => a.legal_entity_type === 'Individual').length}
                    </p>
                </div>
            </div>

            {/* Vault Datagrid */}
            <div className="bg-[#0a0a0a] border border-gray-800 rounded-2xl shadow-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#111] border-b border-gray-800">
                                <th className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Partner Target</th>
                                <th className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Legal Entity</th>
                                <th className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Jurisdiction</th>
                                <th className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Digital Signature Timestamp</th>
                                <th className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Terminal IP Address</th>
                                <th className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">Training Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {filteredAgreements.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-gray-500">
                                        No cryptographic records found matching your query.
                                    </td>
                                </tr>
                            ) : (
                                filteredAgreements.map((agreement) => (
                                    <tr key={agreement.id} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shrink-0">
                                                    <span className="text-emerald-500 font-bold text-sm">
                                                        {agreement.name.charAt(0)}
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className="text-white font-medium">{agreement.name}</p>
                                                    <p className="text-sm text-gray-500">{agreement.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <p className="text-gray-200">{agreement.legal_entity_type}</p>
                                            <p className="text-xs text-gray-500 font-mono mt-1">ID: {agreement.tax_id || 'N/A'}</p>
                                        </td>
                                        <td className="p-4">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-800 text-gray-300 text-xs font-medium border border-gray-700">
                                                <MapPin className="w-3 h-3 text-emerald-500" />
                                                {agreement.country}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2 text-gray-300 text-sm">
                                                <Clock className="w-4 h-4 text-blue-400" />
                                                {agreement.agreement_signed_at 
                                                    ? new Date(agreement.agreement_signed_at).toLocaleString()
                                                    : 'Unsigned'}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className="font-mono text-xs text-gray-400 bg-gray-900 px-2 py-1 rounded border border-gray-800">
                                                {agreement.agreement_ip || 'UNKNOWN'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            {agreement.training_completed_at ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-medium">
                                                    <ShieldCheck className="w-3.5 h-3.5" />
                                                    Certified
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 text-xs font-medium">
                                                    Pending
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

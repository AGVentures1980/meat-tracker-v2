import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, Search, Database, ArrowLeft, CheckCircle2, Clock, XCircle, FileSignature, Edit2, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DealDeskModal } from '../../components/SaaS/DealDeskModal';

export const ContractsVault: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const API_URL = (import.meta as any).env.VITE_API_URL || '';
    const [contracts, setContracts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isDealDeskOpen, setIsDealDeskOpen] = useState(false);
    const [selectedDraft, setSelectedDraft] = useState<any>(null);
    const [contractToDelete, setContractToDelete] = useState<string | null>(null);

    const fetchVault = async () => {
        try {
            const res = await fetch(`${API_URL}/api/v1/contracts`, {
                headers: { 'Authorization': `Bearer ${user?.token}` }
            });
            const data = await res.json();
            if (res.ok) {
                setContracts(data);
            }
        } catch (error) {
            console.error('Failed to fetch vault contracts', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user?.token) {
            fetchVault();
        }
    }, [user, API_URL]);

    const executeDelete = async () => {
        if (!contractToDelete) return;
        try {
            const res = await fetch(`${API_URL}/api/v1/contracts/${contractToDelete}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${user?.token}` }
            });
            
            const text = await res.text();
            
            if (res.ok) {
                fetchVault();
                setContractToDelete(null);
            } else {
                let errorMsg = 'Failed to delete contract';
                try {
                    const data = JSON.parse(text);
                    if (data.error) errorMsg = data.error;
                } catch(e) {
                    errorMsg = `Server error ${res.status}: ${text.substring(0, 50)}`;
                }
                alert(errorMsg);
            }
        } catch (error: any) {
            console.error('Failed to delete', error);
            alert(`A network error occurred while deleting: ${error.message || error.toString()}`);
        }
    };

    const handleDeleteClick = (id: string) => {
        setContractToDelete(id);
    };

    const handleEdit = (contract: any) => {
        setSelectedDraft(contract);
        setIsDealDeskOpen(true);
    };

    const handleModalClose = () => {
        setIsDealDeskOpen(false);
        setSelectedDraft(null);
        fetchVault(); // Refresh vault in case it was updated or generated
    };

    const filteredContracts = contracts.filter(c => 
        c.company_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        c.signer_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.signer_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return <div className="p-8 text-[#00FF94] font-mono animate-pulse">Decrypting AGV Contracts Vault...</div>;
    }

    const executedCount = contracts.filter(c => c.status === 'EXECUTED' || c.status === 'SENT').length;

    return (
        <div className="p-8 w-full max-w-7xl mx-auto animate-fade-in font-sans">
            {/* Back Button */}
            <div className="mb-8">
                <button
                    onClick={() => navigate('/saas-admin')}
                    className="flex items-center gap-2 px-4 py-2 bg-[#111] hover:bg-gray-800 border border-gray-800 text-gray-400 hover:text-white rounded-full transition-all group w-max"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    <span className="text-sm font-medium tracking-wide">Return to Command Center</span>
                </button>
            </div>

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tighter flex items-center gap-3 uppercase">
                        <ShieldCheck className="w-8 h-8 text-[#00FF94]" />
                        Master Contracts Vault
                    </h1>
                    <p className="text-gray-400 text-sm mt-2">Secure cryptographic log of all SaaS Deals and Master Agreements.</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 mt-12 md:mt-0">
                    <div className="relative">
                        <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search entities or emails..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full sm:w-80 bg-[#111] border border-gray-800 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-[#C5A059] transition-colors"
                        />
                    </div>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                <div className="bg-[#111] border border-white/5 rounded-3xl p-6 shadow-xl relative overflow-hidden group">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-gray-400 font-bold tracking-widest text-[10px] uppercase">Generated Contracts</h3>
                        <Database className="w-5 h-5 text-gray-500" />
                    </div>
                    <p className="text-4xl font-black text-white">{contracts.length}</p>
                </div>
                
                <div className="bg-[#111] border border-white/5 rounded-3xl p-6 shadow-xl relative overflow-hidden group">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-[#00FF94] font-bold tracking-widest text-[10px] uppercase">Executed / Sent</h3>
                        <CheckCircle2 className="w-5 h-5 text-[#00FF94]" />
                    </div>
                    <p className="text-4xl font-black text-white">{executedCount}</p>
                </div>
            </div>

            {/* Contracts List */}
            <div className="bg-[#111] border border-white/5 rounded-3xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#1a1a1a] border-b border-white/5">
                                <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Enterprise Target</th>
                                <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Signatory & Email</th>
                                <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Value / Size</th>
                                <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status / Action</th>
                                <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Date Issued</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredContracts.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-gray-500 text-sm">
                                        No contracts found in the vault.
                                    </td>
                                </tr>
                            ) : (
                                filteredContracts.map((contract) => (
                                    <tr key={contract.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 shrink-0">
                                                    <FileSignature className="w-5 h-5 text-[#C5A059]" />
                                                </div>
                                                <div>
                                                    <p className="text-white font-bold">{contract.company_name}</p>
                                                    <p className="text-[10px] text-gray-500 font-mono tracking-wider">{contract.id.split('-')[0]}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <p className="text-gray-300 text-sm">{contract.signer_name}</p>
                                            <p className="text-gray-500 text-xs font-mono">{contract.signer_email}</p>
                                        </td>
                                        <td className="p-4">
                                            <p className="text-white font-mono text-sm">${contract.price?.toLocaleString()} <span className="text-[10px] text-gray-500">/ MO</span></p>
                                            <p className="text-gray-500 text-[10px] font-bold uppercase">{contract.locations_count} LOCATIONS</p>
                                        </td>
                                        <td className="p-4">
                                            {contract.status === 'DRAFT' && (
                                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-500/10 text-gray-400 rounded-full text-[10px] font-bold uppercase tracking-widest">
                                                    <Clock className="w-3 h-3" /> Draft
                                                </div>
                                            )}
                                            {(contract.status === 'SENT' || contract.status === 'EXECUTED') && (
                                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#00FF94]/10 border border-[#00FF94]/20 text-[#00FF94] rounded-full text-[10px] font-bold uppercase tracking-widest">
                                                    <CheckCircle2 className="w-3 h-3" /> {contract.status}
                                                </div>
                                            )}
                                            {contract.status === 'CANCELLED' && (
                                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-500/10 text-red-400 rounded-full text-[10px] font-bold uppercase tracking-widest">
                                                    <XCircle className="w-3 h-3" /> Cancelled
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-4 text-right">
                                            <p className="text-gray-300 text-xs">
                                              {new Date(contract.created_at).toLocaleDateString()}
                                            </p>
                                            <div className="flex flex-col items-end mt-2 gap-2">
                                                {contract.contract_url && <a href={contract.contract_url} target="_blank" rel="noopener noreferrer" className="text-[#C5A059] text-[10px] hover:underline inline-block">View Details &rarr;</a>}
                                                {contract.status === 'DRAFT' && (
                                                    <div className="flex items-center gap-3">
                                                        <button onClick={() => handleEdit(contract)} className="text-gray-400 hover:text-white transition-colors" title="Edit Draft">
                                                            <Edit2 size={14} />
                                                        </button>
                                                        <button onClick={() => handleDeleteClick(contract.id)} className="text-gray-400 hover:text-red-400 transition-colors" title="Delete Draft">
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Custom Confirm Modal */}
            {contractToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                    <div className="bg-[#111] border border-red-500/30 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
                        <h3 className="text-xl font-bold text-white mb-2 text-center flex justify-center items-center gap-2">
                           <XCircle className="text-red-500" /> Confirm Deletion 
                        </h3>
                        <p className="text-gray-400 text-xs text-center mb-6">
                            Are you absolutely sure you want to permanently delete this Draft? This action cannot be undone.
                        </p>
                        <div className="flex gap-4">
                            <button onClick={() => setContractToDelete(null)} className="flex-1 py-3 text-gray-400 hover:text-white border border-white/10 rounded-xl text-xs font-bold uppercase transition-all">
                                Cancel
                            </button>
                            <button onClick={executeDelete} className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold uppercase transition-all">
                                Delete Deal
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <DealDeskModal 
                isOpen={isDealDeskOpen} 
                onClose={handleModalClose} 
                initialContract={selectedDraft} 
            />
        </div>
    );
};

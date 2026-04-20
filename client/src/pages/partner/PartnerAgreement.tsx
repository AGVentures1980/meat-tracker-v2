import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, FileText, CheckCircle2 } from 'lucide-react';

export const PartnerAgreement: React.FC = () => {
    const { user } = useAuth();
    const API_URL = ((import.meta as any).env?.VITE_API_URL || '').replace(/\/api\/?$/, '').replace(/\/$/, '');

    const [formData, setFormData] = useState({
        legal_entity_type: 'Company',
        tax_id: '',
        country: 'USA'
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSign = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const res = await fetch(`${API_URL}/api/v1/partner/onboarding/agreement`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user?.token}`
                },
                body: JSON.stringify(formData)
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to sign agreement.');
            }

            // Force a hard reload so PartnerLayout refetches the upgraded profile status
            window.location.href = '/partner/onboarding/training';
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto mt-12 animate-fade-in-up">
            <div className="bg-[#111] border border-gray-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-blue-500 opacity-50"></div>
                
                <div className="text-center mb-10">
                    <ShieldCheck className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                    <h2 className="text-3xl font-bold text-white tracking-tight">AGV Partner Agreement</h2>
                    <p className="text-gray-400 mt-2 max-w-lg mx-auto">
                        Before accessing the Global Partner Network, you must officially register your entity and sign the AGV Vault non-disclosure and reseller agreement.
                    </p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-900/20 border border-red-500/50 rounded-lg text-red-400 text-sm text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSign} className="space-y-8">
                    {/* Entity Information */}
                    <div className="bg-[#0a0a0a] border border-gray-800 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-gray-400" />
                            Entity Registration
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Legal Entity Type</label>
                                <select 
                                    title="Legal Entity Type"
                                    className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                                    value={formData.legal_entity_type}
                                    onChange={(e) => setFormData({...formData, legal_entity_type: e.target.value})}
                                >
                                    <option value="Company">LLC / Corporation</option>
                                    <option value="Individual">Individual (Sole Proprietor)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Tax ID / EIN / CPF</label>
                                <input 
                                    type="text" 
                                    required
                                    className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors placeholder-gray-600"
                                    placeholder="e.g. 12-3456789"
                                    value={formData.tax_id}
                                    onChange={(e) => setFormData({...formData, tax_id: e.target.value})}
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-400 mb-2">Country of Jurisdiction</label>
                                <select 
                                    title="Country of Jurisdiction"
                                    className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                                    value={formData.country}
                                    onChange={(e) => setFormData({...formData, country: e.target.value})}
                                >
                                    <option value="USA">United States</option>
                                    <option value="BRAZIL">Brazil</option>
                                    <option value="GLOBAL">Other (International)</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Legal Terms Mockup */}
                    <div className="bg-[#0a0a0a] border border-gray-800 rounded-xl p-6 h-64 overflow-y-auto custom-scrollbar">
                        <h4 className="text-white font-bold mb-4">AGV Ventures LLC - Master Reseller & NDA Agreement</h4>
                        <div className="text-sm text-gray-500 space-y-4">
                            <p><strong>1. CONFIDENTIALITY:</strong> You agree not to disclose any pricing algorithms, source code, or proprietary operational methodologies associated with the Brasa Meat Intelligence OS to any third party.</p>
                            <p><strong>2. RESELLER RIGHTS:</strong> You are granted a non-exclusive license to pitch and propose the Brasa Meat Intelligence OS platform to external hospitality clients using the built-in Smart Proposal Generator.</p>
                            <p><strong>3. PAYOUTS & COMMISSIONS:</strong> Commissions will be distributed automatically via PayPal to the registered partner address on file within 5 business days of the client's cleared payment.</p>
                            <p><strong>4. GOVERNANCE:</strong> AGV Ventures LLC reserves the right to terminate this agreement immediately if fraudulent domains or cannibalization of existing enterprise clients is detected.</p>
                            <p><em>(This is a binding digital contract. By clicking the button below, your IP address and timestamp will be permanently cryptographically recorded in the AGV Vault.)</em></p>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <button 
                            type="submit"
                            disabled={loading}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 px-8 rounded-xl transition-all shadow-lg flex items-center gap-3 disabled:opacity-50"
                        >
                            {loading ? 'Processing Signature...' : 'I Agree & Sign Digitally'}
                            {!loading && <CheckCircle2 className="w-5 h-5" />}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

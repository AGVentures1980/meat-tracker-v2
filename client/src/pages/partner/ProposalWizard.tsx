import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe, Building2, ShieldAlert, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const ProposalWizard: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const API_URL = ((import.meta as any).env?.VITE_API_URL || '').replace(/\/api\/?$/, '').replace(/\/$/, '');
    const [step, setStep] = useState(1);
    
    // Form State
    const [formData, setFormData] = useState({
        client_name: '',
        contact_email: '',
        contact_phone: '',
        country: 'USA',
        language: 'English',
        store_count: 1
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successPayload, setSuccessPayload] = useState<any>(null);

    const handleNext = () => setStep(2);
    const handleBack = () => setStep(1);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Rough pricing logic simulation
            const baseSetup = formData.store_count > 3 ? 5000 : 2500;
            const baseMonthly = formData.store_count * 300;

            const res = await fetch(`${API_URL}/api/v1/partner/proposals`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user?.token}`
                },
                body: JSON.stringify({
                    ...formData,
                    setup_fee: baseSetup,
                    monthly_fee: baseMonthly
                })
            });

            const data = await res.json();

            if (!res.ok) {
                if (data.error === 'FRAUD_BLOCK_DOMAIN') {
                    throw new Error(data.message);
                }
                throw new Error('Failed to generate proposal. Please try again.');
            }

            setSuccessPayload(data);
            setStep(3); // Show Success/Link screen
        } catch (err: any) {
            setError(err.message || 'Failed to generate proposal.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto mt-8 animate-fade-in-up">
            <div className="bg-[#111] border border-gray-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
                
                {/* Header Wizard Steps */}
                <div className="flex items-center justify-between mb-12 border-b border-gray-800 pb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                            <Globe className="text-emerald-500" />
                            Smart Proposal Generator
                        </h2>
                        <p className="text-sm text-gray-400 mt-2">Zero-touch onboarding contract engine.</p>
                    </div>
                    <div className="flex gap-2">
                        <StepDot active={step >= 1} number={1} />
                        <div className={`w-8 h-[2px] mt-4 ${step >= 2 ? 'bg-emerald-500' : 'bg-gray-800'}`} />
                        <StepDot active={step >= 2} number={2} />
                        <div className={`w-8 h-[2px] mt-4 ${step === 3 ? 'bg-emerald-500' : 'bg-gray-800'}`} />
                        <StepDot active={step === 3} number={3} />
                    </div>
                </div>

                {error && (
                    <div className="mb-8 p-4 bg-red-900/20 border border-red-500/50 rounded-lg flex items-start gap-4">
                        <ShieldAlert className="w-6 h-6 text-red-400 shrink-0 mt-1" />
                        <div>
                            <h4 className="text-red-400 font-bold mb-1">Proposal Blocked</h4>
                            <p className="text-red-200 text-sm">{error}</p>
                        </div>
                    </div>
                )}

                <form onSubmit={step === 2 ? handleSubmit : (e) => { e.preventDefault(); handleNext(); }}>
                    
                    {step === 1 && (
                        <div className="space-y-6 animate-fade-in">
                            <h3 className="text-lg font-semibold text-emerald-400 mb-4">Step 1: Entity Details</h3>
                            
                            <div className="grid grid-cols-2 gap-6">
                                <Input label="Legal Entity Name" value={formData.client_name} onChange={(v: string) => setFormData({...formData, client_name: v})} required placeholder="e.g. Fogo de Chão Holdings" />
                                <Select label="Proposal Language" value={formData.language} onChange={(v: string) => setFormData({...formData, language: v})} options={['English', 'Spanish', 'Portuguese']} />
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <Input label="Director/Owner Email" type="email" value={formData.contact_email} onChange={(v: string) => setFormData({...formData, contact_email: v})} required placeholder="To scan against Fraud DB" />
                                <Select label="Country of Operations" value={formData.country} onChange={(v: string) => setFormData({...formData, country: v})} options={['USA', 'Brazil', 'UAE', 'Mexico', 'UK']} />
                            </div>

                            <div className="pt-6 flex justify-end">
                                <button type="submit" className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-lg font-medium transition-colors">
                                    Next: Scope & Pricing
                                    <ArrowRight className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6 animate-fade-in">
                            <h3 className="text-lg font-semibold text-emerald-400 mb-4">Step 2: Network Scope</h3>
                            
                            <div className="p-6 bg-[#0a0a0a] border border-gray-800 rounded-xl space-y-4">
                                <label className="block text-sm font-medium text-gray-300">
                                    Total Stores (Locations) to Provision
                                </label>
                                <input 
                                    type="number" 
                                    min="1" 
                                    max="500"
                                    required
                                    value={formData.store_count}
                                    onChange={(e) => setFormData({...formData, store_count: parseInt(e.target.value) || 1})}
                                    className="w-full bg-[#111] border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors text-xl font-mono"
                                />
                                
                                {formData.store_count > 20 && (
                                    <div className="mt-4 p-4 bg-amber-900/20 border border-amber-500/50 rounded-lg flex items-start gap-3">
                                        <Building2 className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                                        <p className="text-amber-200 text-sm leading-relaxed">
                                            <strong>Enterprise Deal Detected.</strong> Generating a proposal for {formData.store_count} locations exceeds the automated Reseller threshold. This deal will be placed under <strong>AGV Master Review</strong> and routed to the executive board. You remain the originator and are eligible for the finder's fee payout upon successful closing.
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="pt-6 flex justify-between">
                                <button type="button" onClick={handleBack} className="text-gray-400 hover:text-white px-6 py-3 rounded-lg font-medium transition-colors">
                                    Back
                                </button>
                                <button disabled={loading} type="submit" className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-lg font-bold shadow-lg shadow-emerald-900/40 transition-all">
                                    {loading ? 'Processing Protocol...' : 'Generate Smart Protocol'}
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 3 && successPayload && (
                        <div className="text-center py-12 space-y-6 animate-fade-in">
                            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-900/30 mb-4">
                                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                            </div>
                            <h3 className="text-2xl font-bold text-white">Proposal Generated Successfully</h3>
                            <p className="text-gray-400 max-w-md mx-auto">
                                {successPayload.message}
                            </p>
                            
                            <div className="mt-8 p-6 bg-[#0a0a0a] border border-gray-800 rounded-xl inline-block text-left w-full max-w-md">
                                <label className="block text-xs text-gray-500 uppercase tracking-wider mb-2">Secure Client Link (TripleSeat Style)</label>
                                <div className="flex gap-2">
                                    <input 
                                        readOnly 
                                        value={`https://brasameat.com/proposal/sign/${successPayload.proposal.id}`} 
                                        className="w-full bg-[#111] text-indigo-300 font-mono text-sm p-3 rounded border border-gray-700" 
                                        title="Proposal URL"
                                    />
                                    <button type="button" onClick={() => navigator.clipboard.writeText(`https://brasameat.com/proposal/sign/${successPayload.proposal.id}`)} className="bg-gray-800 hover:bg-gray-700 text-white px-4 rounded transition-colors text-sm font-medium">
                                        Copy
                                    </button>
                                </div>
                            </div>

                            <div className="pt-8">
                                <button onClick={() => navigate('/partner/dashboard')} className="text-emerald-500 hover:text-emerald-400 font-medium">
                                    Return to Dashboard
                                </button>
                            </div>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
};

const Input = ({ label, value, onChange, type = "text", required, placeholder }: any) => (
    <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">{label}</label>
        <input 
            type={type} 
            value={value} 
            onChange={(e) => onChange(e.target.value)} 
            required={required}
            placeholder={placeholder}
            className="w-full bg-[#0a0a0a] border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors"
        />
    </div>
);

const Select = ({ label, value, onChange, options }: any) => (
    <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">{label}</label>
        <select 
            value={value} 
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-[#0a0a0a] border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors appearance-none"
            title={label}
        >
            {options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
        </select>
    </div>
);

const StepDot = ({ active, number }: { active: boolean, number: number }) => (
    <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold border-2 transition-colors ${active ? 'border-emerald-500 text-emerald-400 bg-emerald-900/20' : 'border-gray-800 text-gray-600'}`}>
        {number}
    </div>
);

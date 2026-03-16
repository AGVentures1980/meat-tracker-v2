import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { X, Send, FileSignature, CheckCircle2, TrendingUp, Building } from 'lucide-react';

interface DealDeskModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const DealDeskModal = ({ isOpen, onClose }: DealDeskModalProps) => {
    const { user } = useAuth();
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [loading, setLoading] = useState(false);
    const [contractId, setContractId] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        company_name: '',
        signer_name: '',
        signer_email: '',
        price: '',
        locations_count: '1'
    });

    if (!isOpen) return null;

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch('/api/v1/contracts/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user?.token}`
                },
                body: JSON.stringify(formData)
            });
            const data = await res.json();
            if (res.ok) {
                setContractId(data.contract.id);
                setStep(2);
            } else {
                alert(data.error);
            }
        } catch (error) {
            alert('Failed to generate contract.');
        } finally {
            setLoading(false);
        }
    };

    const handleDispatch = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/v1/contracts/dispatch', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user?.token}`
                },
                body: JSON.stringify({ contractId })
            });
            const data = await res.json();
            if (res.ok) {
                setStep(3);
                
                // SIMULATION: Auto-complete the signature webhook after 5 seconds to show the user the flow
                setTimeout(() => {
                    fetch('/api/v1/contracts/mock-webhook', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${user?.token}`
                        },
                        body: JSON.stringify({ contractId })
                    }).then(() => {
                        console.log('Webhook simulated: Contract Signed');
                        // Normally you would use WebSockets or Polling to update UI.
                    });
                }, 5000);

            } else {
                alert(data.error);
            }
        } catch (error) {
            alert('Failed to dispatch.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-[#111] border border-white/10 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#1a1a1a]">
                    <h2 className="text-xl font-black text-white flex items-center gap-3">
                        <FileSignature className="text-[#C5A059]" /> DEALS DESK <span className="text-gray-500 font-mono text-[10px] tracking-widest uppercase">Contract Engine</span>
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Step 1: Input Parameters */}
                {step === 1 && (
                    <form onSubmit={handleGenerate} className="p-8 space-y-6">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="col-span-2">
                                <label className="block text-[#C5A059] text-[10px] font-black uppercase tracking-widest mb-2">Target Enterprise</label>
                                <div className="relative">
                                    <Building className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                                    <input 
                                        type="text" required
                                        value={formData.company_name}
                                        onChange={e => setFormData({...formData, company_name: e.target.value})}
                                        placeholder="e.g. Texas de Brazil"
                                        className="w-full bg-[#050505] border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-[#C5A059] transition-all"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-2">Key Signatory Name</label>
                                <input 
                                    type="text" required
                                    value={formData.signer_name}
                                    onChange={e => setFormData({...formData, signer_name: e.target.value})}
                                    placeholder="Rodrigo Davila"
                                    className="w-full bg-[#050505] border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-[#C5A059] transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-2">Signatory Email</label>
                                <input 
                                    type="email" required
                                    value={formData.signer_email}
                                    onChange={e => setFormData({...formData, signer_email: e.target.value})}
                                    placeholder="rdavila@texasdebrazil.com"
                                    className="w-full bg-[#050505] border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-[#C5A059] transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-2">Monthly SaaS Price (USD)</label>
                                <input 
                                    type="number" required
                                    value={formData.price}
                                    onChange={e => setFormData({...formData, price: e.target.value})}
                                    placeholder="5000"
                                    className="w-full bg-[#050505] border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-[#C5A059] transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-2">Number of Locations</label>
                                <input 
                                    type="number" required
                                    value={formData.locations_count}
                                    onChange={e => setFormData({...formData, locations_count: e.target.value})}
                                    placeholder="50"
                                    className="w-full bg-[#050505] border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-[#C5A059] transition-all"
                                />
                            </div>
                        </div>

                        <button 
                            type="submit" disabled={loading}
                            className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-black tracking-widest uppercase text-xs transition-all disabled:opacity-50"
                        >
                            {loading ? 'Compiling Legal Template...' : 'Generate Contract Document'}
                        </button>
                    </form>
                )}

                {/* Step 2: Final Review Pop-up */}
                {step === 2 && (
                    <div className="p-8 space-y-6">
                        <div className="bg-[#050505] border border-white/5 rounded-2xl p-6 h-64 overflow-y-auto leading-relaxed text-sm text-gray-400 font-serif">
                            <h3 className="text-center font-bold text-white uppercase text-lg mb-6">Master Software As A Service Agreement</h3>
                            <p className="mb-4">This Master SaaS Agreement is entered into as of <strong>{new Date().toLocaleDateString()}</strong> by and between <strong>Brasa Intel (AGV Ventures LLC)</strong> and <strong>{formData.company_name}</strong>.</p>
                            <p className="mb-4"><strong>1. SCOPE OF PILOT:</strong> Provider will deploy the Brasa Meat Intelligence OS to <strong>{formData.locations_count}</strong> pilot locations for the duration of 90 days.</p>
                            <p className="mb-4"><strong>2. COMMERCIAL TERMS:</strong> Client agrees to a monthly recurring software license fee of <strong>${formData.price}.00 USD</strong>. Execution of this digital document legally binds the signatory, <strong>{formData.signer_name} ({formData.signer_email})</strong>, to these terms.</p>
                            <div className="mt-8 border-t border-dashed border-gray-700 pt-4 flex justify-between uppercase text-xs">
                                <span>Signatory: ___________________</span>
                                <span>Date: ___________________</span>
                            </div>
                        </div>
                        
                        <div className="flex gap-4">
                            <button onClick={() => setStep(1)} className="flex-1 py-4 bg-transparent border border-white/10 text-gray-400 rounded-xl font-bold tracking-widest uppercase text-xs hover:text-white transition-all">
                                Edit Terms
                            </button>
                            <button 
                                onClick={handleDispatch} disabled={loading}
                                className="flex-2 py-4 px-8 bg-[#00FF94] hover:bg-[#00d67a] text-black shadow-[0_0_30px_rgba(0,255,148,0.2)] hover:shadow-[0_0_50px_rgba(0,255,148,0.4)] rounded-xl font-black tracking-widest uppercase text-xs transition-all flex items-center justify-center gap-2"
                            >
                                <Send size={16} /> {loading ? 'Dispatching...' : 'Dispatch for E-Signature'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 3: Success Tracking */}
                {step === 3 && (
                    <div className="p-12 text-center space-y-6">
                        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-green-500/10 mb-4">
                            <CheckCircle2 size={48} className="text-[#00FF94]" />
                        </div>
                        <h3 className="text-2xl font-black text-white uppercase tracking-tight">Contract Dispatched</h3>
                        <p className="text-gray-400 text-sm max-w-sm mx-auto">
                            The envelope has been securely routed via DocuSign to <strong className="text-white">{formData.signer_email}</strong>. 
                        </p>
                        
                        <div className="bg-[#1a1a1a] border border-[#00FF94]/20 p-4 rounded-xl inline-flex items-center gap-3 text-xs font-mono text-[#00FF94] mt-6">
                            <TrendingUp size={14} /> LISTENING FOR SIGNATURE WEBHOOK...
                        </div>

                        <div className="pt-8">
                            <button onClick={onClose} className="text-gray-500 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors">
                                Return to Command Center
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

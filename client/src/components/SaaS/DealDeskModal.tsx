import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { X, Send, FileSignature, CheckCircle2, TrendingUp, Building } from 'lucide-react';

interface DealDeskModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialContract?: any;
}

export const DealDeskModal = ({ isOpen, onClose, initialContract }: DealDeskModalProps) => {
    const { user } = useAuth();
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [loading, setLoading] = useState(false);
    const [contractId, setContractId] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        contract_type: 'pilot',
        company_name: '',
        signer_name: '',
        signer_email: '',
        implementation_fee: '1000',
        monthly_saas: '399',
        performance_share: '5',
        locations_count: '3'
    });


    React.useEffect(() => {
        if (isOpen) {
            setStep(1);
            if (initialContract) {
                setContractId(initialContract.id);
                setFormData({
                    contract_type: initialContract.contract_type || 'pilot',
                    company_name: initialContract.company_name,
                    signer_name: initialContract.signer_name,
                    signer_email: initialContract.signer_email,
                    implementation_fee: initialContract.implementation_fee?.toString() || '1000',
                    monthly_saas: initialContract.monthly_saas?.toString() || '399',
                    performance_share: initialContract.performance_share?.toString() || '5',
                    locations_count: initialContract.locations_count?.toString() || '3'
                });
            } else {
                setContractId(null);
                setFormData({
                    contract_type: 'pilot',
                    company_name: '',
                    signer_name: '',
                    signer_email: '',
                    implementation_fee: '1000',
                    monthly_saas: '399',
                    performance_share: '5',
                    locations_count: '3'
                });
            }
        }
    }, [isOpen, initialContract]);

    if (!isOpen) return null;

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (contractId && initialContract) {
                // Update existing draft
                const res = await fetch(`/api/v1/contracts/${contractId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${user?.token}`
                    },
                    body: JSON.stringify(formData)
                });
                const data = await res.json();
                if (res.ok) {
                    setStep(2);
                } else {
                    alert(data.error || 'Failed to update draft');
                }
            } else {
                // Generate new draft
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
            }
        } catch (error) {
            alert('Failed to process contract.');
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
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="block text-[#C5A059] text-[10px] font-black uppercase tracking-widest mb-2">Contract Strategy</label>
                                <select 
                                    value={formData.contract_type}
                                    onChange={e => setFormData({...formData, contract_type: e.target.value})}
                                    className="w-full bg-[#050505] border border-brand-gold/50 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-brand-gold transition-all font-bold"
                                >
                                    <option value="pilot">Phase 1: 90-Day Pilot Agreement Only</option>
                                    <option value="master">Phase 2: Master SaaS Rollout Agreement</option>
                                </select>
                            </div>

                            <div className="col-span-2">
                                <label className="block text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-2">Target Enterprise</label>
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
                                <label className="block text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-2">Signatory Name(s) (Comma separated)</label>
                                <input 
                                    type="text" required
                                    value={formData.signer_name}
                                    onChange={e => setFormData({...formData, signer_name: e.target.value})}
                                    placeholder="e.g. Eric Browning, Pat Hafner"
                                    className="w-full bg-[#050505] border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-[#C5A059] transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-2">Signatory Email(s) (Comma separated)</label>
                                <input 
                                    type="text" required
                                    value={formData.signer_email}
                                    onChange={e => setFormData({...formData, signer_email: e.target.value})}
                                    placeholder="ericbrowning@outback.com, pathafner@outback.com"
                                    className="w-full bg-[#050505] border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-[#C5A059] transition-all"
                                />
                            </div>

                            {formData.contract_type === 'master' && (
                                <>
                                    <div>
                                        <label className="block text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-2">Implementation / Store ($)</label>
                                        <input 
                                            type="number" required={formData.contract_type === 'master'}
                                            value={formData.implementation_fee}
                                            onChange={e => setFormData({...formData, implementation_fee: e.target.value})}
                                            placeholder="1000"
                                            className="w-full bg-[#050505] border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-[#C5A059] transition-all"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-2">Monthly SaaS / Store ($)</label>
                                        <input 
                                            type="number" required={formData.contract_type === 'master'}
                                            value={formData.monthly_saas}
                                            onChange={e => setFormData({...formData, monthly_saas: e.target.value})}
                                            placeholder="399"
                                            className="w-full bg-[#050505] border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-[#C5A059] transition-all"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[#00FF94] text-[10px] font-bold uppercase tracking-widest mb-2">Gain-Share (%)</label>
                                        <input 
                                            type="number" required={formData.contract_type === 'master'}
                                            value={formData.performance_share}
                                            onChange={e => setFormData({...formData, performance_share: e.target.value})}
                                            placeholder="5"
                                            className="w-full bg-[#00FF94]/10 border border-[#00FF94]/30 rounded-xl py-3 px-4 text-[#00FF94] focus:outline-none focus:border-[#00FF94] shadow-[0_0_15px_rgba(0,255,148,0.1)] transition-all"
                                        />
                                    </div>
                                </>
                            )}

                            <div>
                                <label className="block text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-2">{formData.contract_type === 'pilot' ? 'Pilot Locations Count' : 'Total Locations'}</label>
                                <input 
                                    type="number" required
                                    value={formData.locations_count}
                                    onChange={e => setFormData({...formData, locations_count: e.target.value})}
                                    placeholder={formData.contract_type === 'pilot' ? '3' : '57'}
                                    className="w-full bg-[#050505] border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-[#C5A059] transition-all"
                                />
                            </div>
                        </div>

                        <button 
                            type="submit" disabled={loading}
                            className="w-full py-4 mt-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-black tracking-widest uppercase text-xs transition-all disabled:opacity-50"
                        >
                            {loading ? 'Compiling Legal Template...' : 'Generate Contract Document'}
                        </button>
                    </form>
                )}

                {/* Step 2: Final Review Pop-up */}
                {step === 2 && (
                    <div className="p-8 space-y-6">
                        <div className="bg-[#111] border border-white/5 rounded-2xl p-6 h-[400px] overflow-y-auto leading-relaxed text-xs text-gray-400 font-sans shadow-inner">
                            <div className="text-center border-b-2 border-[#C5A059] pb-4 mb-6">
                                <div className="text-xl font-black tracking-widest text-white uppercase">AGV Ventures</div>
                                <span className="text-[10px] font-bold tracking-[0.2em] text-[#C5A059] uppercase block mt-1">Technology Holdings & Licensing</span>
                            </div>
                            
                            <h3 className="text-center font-bold text-white uppercase text-sm tracking-wide mb-6">
                                {formData.contract_type === 'pilot' ? 'Software Evaluation & Mutual NDA (Pilot Agreement)' : 'Master Software & SaaS Rollout Agreement'}
                            </h3>
                            
                            <p className="mb-4 text-justify">This Agreement is entered into as of <strong className="text-white">{new Date().toLocaleDateString()}</strong> (the "Effective Date") by and between <strong className="text-white">AGV Ventures LLC</strong> ("Licensor" or "Owner") and <strong className="text-white">{formData.company_name || '[Company Name]'}</strong> ("Client").</p>
                            
                            <h4 className="font-bold text-white border-b border-white/10 pb-1 mt-6 mb-3 uppercase tracking-wide text-[11px]">1. Ownership & Intellectual Property</h4>
                            <p className="mb-4 text-justify">The <strong className="text-white">Brasa Meat Intelligence</strong> platform, algorithms, source codes, trademarks, operational methodologies (including the "Garcia Rule"), and all related intellectual property are owned exclusively by <strong className="text-white">AGV Ventures LLC</strong>. The software is merely licensed or tested, not sold, to the Client under the terms of this Agreement. The Client hereby acknowledges that they hold no ownership rights over the software or any derivative works.</p>

                            <h4 className="font-bold text-white border-b border-white/10 pb-1 mt-6 mb-3 uppercase tracking-wide text-[11px]">2. 90-Day Pilot Evaluation Program</h4>
                            <p className="mb-4 text-justify">Licensor agrees to deploy the Brasa Meat Intelligence operating system to <strong className="text-white">{formData.locations_count || '[X]'}</strong> initial pilot locations for a rigorous 90-Day evaluation. During this period, both parties agree to mutual confidentiality regarding proprietary business metrics, strategic workflows, and software interfaces (Mutual NDA). The focus of this pilot is to measure and validate gross meat usage efficiencies against historical baselines.</p>
                            
                            {formData.contract_type === 'master' ? (
                                <>
                                    <h4 className="font-bold text-white border-b border-white/10 pb-1 mt-6 mb-3 uppercase tracking-wide text-[11px]">3. Commercial Terms & System Rollout</h4>
                                    <p className="mb-4 text-justify">Upon successful conclusion of the Pilot Program, this Agreement covers the system implementation and active SaaS licensing for up to <strong className="text-white">{formData.locations_count || '[X]'} Locations</strong>. The structured commercial model is as follows:</p>
                                    <ul className="list-disc pl-5 mb-4 space-y-2 text-justify">
                                        <li><strong>Implementation Fee:</strong> A one-time setup and hardware configuration fee of <strong className="text-white">${Number(formData.implementation_fee || 0).toLocaleString()}.00 USD per location</strong>.</li>
                                        <li><strong>SaaS Licensing Fee:</strong> A recurring software license of <strong className="text-white">${Number(formData.monthly_saas || 0).toLocaleString()}.00 USD per location per month</strong> for continuous access, updates, and maintenance.</li>
                                        <li><strong>Performance Participation (Gain-Share):</strong> As a mutual partnership alignment, Licensor guarantees measurable yield savings and shall receive <strong className="text-[#00FF94]">{formData.performance_share}%</strong> of the verified gross meat savings generated by the software logic.</li>
                                    </ul>
                                </>
                            ) : (
                                <>
                                    <h4 className="font-bold text-white border-b border-white/10 pb-1 mt-6 mb-3 uppercase tracking-wide text-[11px]">3. Commercial Conversion (Post-Pilot)</h4>
                                    <p className="mb-4 text-justify">Upon the successful validation of the yield savings generated during this 90-Day Pilot in the <strong className="text-white">{formData.locations_count || '[X]'}</strong> pilot stores, the parties agree to negotiate in good faith a separate Master SaaS Agreement to govern the formal rollout of the technology across the wider enterprise. No permanent commercial licensing terms are executed until the Pilot is formally finalized.</p>
                                </>
                            )}

                            <h4 className="font-bold text-white border-b border-white/10 pb-1 mt-6 mb-3 uppercase tracking-wide text-[11px]">4. Liability Shield</h4>
                            <p className="mb-4 text-justify">In no event shall AGV Ventures LLC, its founders, members, or affiliates be liable for any indirect, incidental, or consequential damages arising out of the use or inability to use the Software. Total liability of AGV Ventures LLC shall not exceed the amount paid by the Client for the software license.</p>

                            <div className="mt-8 border-t border-dashed border-gray-700 pt-6">
                                <p className="mb-4 text-justify">Execution of this digital document legally binds the signatory, <strong className="text-white">{formData.signer_name || '[Signer Name]'} ({formData.signer_email || '[Signer Email]'})</strong> representing {formData.company_name || '[Company Name]'}, to these terms.</p>
                                <div className="border border-dashed border-gray-600 bg-white/5 p-4 text-center mt-2">
                                    <span className="text-gray-500 text-[10px] tracking-widest uppercase items-center gap-2 inline-flex">
                                        <FileSignature className="w-4 h-4" /> DocuSign Anchor Point
                                    </span>
                                </div>
                            </div>
                            
                            <div className="mt-10 text-[10px] text-center text-gray-600 border-t border-white/5 pt-4">
                                AGV Ventures LLC • Proprietary & Confidential Document<br/>
                                Generated by Brasa Meat Intelligence Deal Desk
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
                            <button type="button" onClick={() => { setStep(1); onClose(); }} className="text-gray-500 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors">
                                Return to Command Center
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

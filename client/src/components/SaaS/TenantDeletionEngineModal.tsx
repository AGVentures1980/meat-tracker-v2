import React, { useState } from 'react';
import { Skull, AlertTriangle, ShieldAlert, Key, CheckCircle, X } from 'lucide-react';

interface TenantDeletionEngineModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const TenantDeletionEngineModal: React.FC<TenantDeletionEngineModalProps> = ({ isOpen, onClose }) => {
    const [companyId, setCompanyId] = useState('');
    const [environment, setEnvironment] = useState<'production' | 'staging' | 'dev'>('staging');
    const [step, setStep] = useState<1 | 2>(1);
    const [loading, setLoading] = useState(false);
    
    // Dry run state
    const [dryRunData, setDryRunData] = useState<any>(null);
    const [dryRunHash, setDryRunHash] = useState('');
    const [jobId, setJobId] = useState('');
    
    // Execution state
    const [confirmationPhrase, setConfirmationPhrase] = useState('');
    const [allowProductionDelete, setAllowProductionDelete] = useState(false);
    const [executionStatus, setExecutionStatus] = useState<'pending' | 'success' | 'failed'>('pending');
    const [errorMsg, setErrorMsg] = useState('');

    const EXPECTED_PHRASE = "I UNDERSTAND THIS WILL PERMANENTLY DELETE TENANT DATA";

    if (!isOpen) return null;

    const handleDryRun = async () => {
        setLoading(true);
        setErrorMsg('');
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/v1/sre/tenants/delete/dry-run', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ company_id: companyId, environment })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Server error');
            
            setDryRunData(data.payload);
            setDryRunHash(data.dry_run_hash);
            setJobId(data.job_id);
            setStep(2);
        } catch (err: any) {
            setErrorMsg(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleExecute = async () => {
        setLoading(true);
        setErrorMsg('');
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/v1/sre/tenants/delete/execute', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ 
                    job_id: jobId, 
                    dry_run_hash: dryRunHash, 
                    environment, 
                    confirmation_phrase: confirmationPhrase,
                    allow_production_delete: allowProductionDelete
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Server error');
            
            setExecutionStatus('success');
        } catch (err: any) {
            setErrorMsg(err.message);
            setExecutionStatus('failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#0a0a0a] border-2 border-red-900 shadow-[0_0_100px_rgba(220,38,38,0.2)] w-full max-w-4xl rounded-3xl overflow-hidden max-h-[90vh] flex flex-col">
                
                {/* Header */}
                <div className="p-6 border-b border-red-900/50 bg-red-950/20 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="bg-red-500/10 p-2 rounded-xl">
                            <Skull className="text-red-500" size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white tracking-tighter">SRE TENANT DELETION ENGINE</h2>
                            <p className="text-red-400 text-[10px] uppercase font-bold tracking-widest flex items-center gap-2">
                                <AlertTriangle size={12} /> DO NOT PROCEED IF UNSURE
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-8 flex-1 overflow-y-auto">
                    
                    {errorMsg && (
                        <div className="mb-6 bg-red-950/50 border border-red-900 text-red-200 p-4 rounded-xl flex items-center gap-3 text-sm">
                            <ShieldAlert size={20} className="shrink-0 text-red-500" />
                            {errorMsg}
                        </div>
                    )}

                    {step === 1 && (
                        <div className="space-y-6">
                            <div className="bg-[#111] border border-white/5 p-6 rounded-2xl">
                                <h3 className="text-white font-bold mb-4">Phase 1: Dry Run Target Specification</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2 block">Environment Target</label>
                                        <select 
                                            value={environment}
                                            onChange={(e) => setEnvironment(e.target.value as any)}
                                            className="w-full bg-[#050505] border border-white/10 text-white rounded-xl p-3 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 transition-all font-mono"
                                        >
                                            <option value="dev">dev</option>
                                            <option value="staging">staging</option>
                                            <option value="production">production</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2 block">Company ID</label>
                                        <input 
                                            type="text"
                                            value={companyId}
                                            onChange={(e) => setCompanyId(e.target.value)}
                                            placeholder="UUID or 'tdb-main'"
                                            className="w-full bg-[#050505] border border-white/10 text-white rounded-xl p-3 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 transition-all font-mono"
                                        />
                                    </div>
                                </div>
                            </div>

                            <button 
                                onClick={handleDryRun}
                                disabled={!companyId || loading}
                                className="w-full py-4 bg-red-600 disabled:opacity-50 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-red-500 transition-all shadow-[0_0_30px_rgba(220,38,38,0.3)] flex justify-center items-center gap-2"
                            >
                                {loading ? 'Analyzing Impact...' : 'Generate Dry Run Topology'}
                            </button>
                        </div>
                    )}

                    {step === 2 && executionStatus === 'pending' && dryRunData && (
                        <div className="space-y-6 animate-fade-in">
                            {/* Dashboard JSON Render */}
                            <div className="bg-[#111] border border-red-900/30 p-6 rounded-2xl">
                                <h3 className="text-white font-bold mb-2 flex items-center justify-between">
                                    Topological Impact Analysis
                                    <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-[10px] font-mono tracking-widest uppercase">
                                        RISK: {dryRunData.estimated_risk}
                                    </span>
                                </h3>
                                
                                <div className="mt-4 p-4 bg-[#050505] rounded-xl font-mono text-[11px] text-gray-300 border border-gray-900/50">
                                    <div className="mb-2 font-bold text-[#C5A059]">CASCADE SEQUENCE:</div>
                                    <div className="flex flex-wrap gap-2 mb-6">
                                        {dryRunData.deletion_plan?.map((table: string, idx: number) => (
                                            <span key={idx} className="bg-red-950/40 text-red-300 px-2 py-1 rounded text-[10px] border border-red-900/30">
                                                {idx + 1}. {table} ({dryRunData.impact[table] || 0})
                                            </span>
                                        ))}
                                    </div>
                                    <div className="border-t border-white/5 pt-2 flex justify-between text-white font-bold">
                                        <span>TOTAL RECORDS:</span>
                                        <span className="text-red-500">{dryRunData.total_records_affected}</span>
                                    </div>
                                </div>
                                <div className="mt-4 p-4 bg-orange-950/20 rounded-xl font-mono text-[11px] text-orange-200 border border-orange-900/30 flex items-center gap-3">
                                    <Key size={16} className="text-orange-500 shrink-0"/>
                                    <div className="break-all">
                                        <div className="text-orange-500/50 mb-1 font-bold">CRYPTOGRAPHIC TRUTH (SHA-256):</div>
                                        {dryRunHash}
                                    </div>
                                </div>
                            </div>

                            {/* Execution Confirmation */}
                            <div className="bg-red-950/20 border border-red-900 p-6 rounded-2xl space-y-4">
                                <h3 className="text-red-400 font-bold mb-4 flex items-center gap-2">
                                    <ShieldAlert size={18} /> Required Human Affirmation
                                </h3>
                                
                                {environment === 'production' && (
                                    <label className="flex items-center gap-3 text-red-200 text-sm cursor-pointer mb-4 p-3 bg-red-900/20 rounded-xl border border-red-900">
                                        <input 
                                            type="checkbox" 
                                            checked={allowProductionDelete} 
                                            onChange={(e) => setAllowProductionDelete(e.target.checked)}
                                            className="w-5 h-5 accent-red-500"
                                        />
                                        I explicitly authorize deletion in PRODUCTION environment.
                                    </label>
                                )}

                                <div>
                                    <label className="text-xs text-red-400/70 font-bold uppercase tracking-wider mb-2 block">
                                        Type EXACTLY: "{EXPECTED_PHRASE}"
                                    </label>
                                    <input 
                                        type="text"
                                        value={confirmationPhrase}
                                        onChange={(e) => setConfirmationPhrase(e.target.value)}
                                        className="w-full bg-[#050505] border border-red-900 text-white rounded-xl p-3 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 transition-all font-mono"
                                    />
                                </div>

                                <button 
                                    onClick={handleExecute}
                                    disabled={loading || confirmationPhrase !== EXPECTED_PHRASE || (environment === 'production' && !allowProductionDelete)}
                                    className="w-full py-4 bg-red-600 disabled:opacity-30 disabled:cursor-not-allowed text-white font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-red-500 transition-all border border-red-400 flex justify-center items-center gap-2"
                                >
                                    {loading ? 'Executing Wipe...' : 'PERMANENTLY DELETE TENANT'}
                                </button>
                            </div>
                        </div>
                    )}

                    {executionStatus === 'success' && (
                        <div className="flex flex-col items-center justify-center p-12 text-center animate-fade-in">
                            <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mb-6">
                                <CheckCircle size={48} className="text-green-500" />
                            </div>
                            <h2 className="text-3xl font-black text-white mb-2">TENANT NEUTRALIZED</h2>
                            <p className="text-gray-400 mb-8">The tenant aberration was safely resolved and audited.</p>
                            <button 
                                onClick={onClose}
                                className="px-8 py-3 bg-green-600 text-white font-bold rounded-full hover:bg-green-500 transition-colors"
                            >
                                Return to Console
                            </button>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

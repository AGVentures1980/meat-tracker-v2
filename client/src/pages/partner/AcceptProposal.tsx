import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, Shield, Briefcase, FileText, ChevronRight, Loader2, Building2, Globe } from 'lucide-react';

export const AcceptProposal: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const API_URL = ((import.meta as any).env?.VITE_API_URL || '').replace(/\/api\/?$/, '').replace(/\/$/, '');

    const [loading, setLoading] = useState(true);
    const [accepting, setAccepting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [proposal, setProposal] = useState<any>(null);

    // Fetch Proposal Data
    useEffect(() => {
        const fetchProposal = async () => {
            try {
                const res = await fetch(`${API_URL}/api/v1/proposals/${id}`);
                const data = await res.json();
                
                if (!res.ok) {
                    throw new Error(data.error || 'Failed to fetch proposal details.');
                }
                
                setProposal(data.proposal);
            } catch (err: any) {
                setError(err.message || 'The proposal link is invalid or has expired.');
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchProposal();
        }
    }, [id, API_URL]);

    // Handle User Acceptance -> Stripe Redirect
    const handleAccept = async () => {
        setAccepting(true);
        setError(null);
        
        try {
            const res = await fetch(`${API_URL}/api/v1/proposals/${id}/accept`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await res.json();
            
            if (!res.ok) {
                throw new Error(data.error || 'Failed to initiate checkout session.');
            }
            
            // Redirect to Stripe Checkout
            if (data.checkout_url) {
                window.location.href = data.checkout_url;
            } else {
                throw new Error('Checkout URL not received.');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to process acceptance. Please try again or contact support.');
            setAccepting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center">
                <Loader2 className="w-12 h-12 text-amber-500 animate-spin mb-4" />
                <p className="text-gray-400 font-mono">Loading Secure Proposal...</p>
            </div>
        );
    }

    if (error || !proposal) {
        return (
            <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-[#111] border border-gray-800 rounded-2xl p-8 shadow-2xl text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-900/30 mb-6">
                        <Shield className="w-8 h-8 text-red-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
                    <p className="text-gray-400 mb-8">{error}</p>
                </div>
            </div>
        );
    }

    const { client_name, store_count, setup_fee, monthly_fee, status, partner } = proposal;
    
    // Total immediate wire amount
    const totalDueNow = setup_fee + monthly_fee;

    if (status !== 'Draft') {
        return (
            <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-[#111] border border-gray-800 rounded-2xl p-8 shadow-2xl text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-900/30 mb-6">
                        <CheckCircle className="w-8 h-8 text-emerald-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Proposal Inactive</h2>
                    <p className="text-gray-400 mb-8">This proposal has already been processed or is no longer in Draft status.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#050505] text-gray-200 font-sans selection:bg-amber-500/30">
            
            {/* Minimalist Topbar */}
            <header className="border-b border-white/5 bg-black/50 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-5xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded bg-gradient-to-br from-amber-600 to-amber-900 flex items-center justify-center shadow-lg shadow-amber-900/20">
                            <span className="text-white font-bold text-xl leading-none font-serif tracking-tighter">B</span>
                        </div>
                        <div>
                            <h1 className="text-white font-bold text-lg tracking-tight leading-tight">Brasa Intelligence OS</h1>
                            <p className="text-xs text-emerald-500 font-medium tracking-wide">ENTERPRISE PROVISIONING</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 font-mono bg-[#111] px-4 py-2 rounded-full border border-gray-800">
                        <Shield className="w-4 h-4 text-emerald-500" />
                        <span>Secure Terminal</span>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 py-12 lg:py-20 animate-fade-in-up">
                
                <div className="text-center mb-16 space-y-4">
                    <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">Software Service Agreement</h2>
                    <p className="text-xl text-gray-400">Prepared exclusively for <span className="text-amber-500 font-semibold">{client_name}</span></p>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    
                    {/* Left Col - Summary */}
                    <div className="md:col-span-2 space-y-6">
                        <div className="bg-[#111] border border-gray-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-amber-500/10 transition-colors duration-700" />
                            
                            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                <Briefcase className="w-5 h-5 text-amber-500" />
                                Deal Scope
                            </h3>

                            <div className="grid sm:grid-cols-2 gap-6">
                                <div className="p-5 bg-black/40 border border-gray-800/50 rounded-xl">
                                    <p className="text-sm text-gray-500 mb-1">Total Locations</p>
                                    <p className="text-2xl font-bold text-white flex items-center gap-2">
                                        <Building2 className="w-5 h-5 text-gray-600" />
                                        {store_count} Stores
                                    </p>
                                </div>
                                <div className="p-5 bg-black/40 border border-gray-800/50 rounded-xl">
                                    <p className="text-sm text-gray-500 mb-1">Originating Partner</p>
                                    <p className="text-lg font-medium text-white flex items-center gap-2">
                                        <Globe className="w-4 h-4 text-gray-600" />
                                        {partner?.user?.first_name} {partner?.user?.last_name}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-8 pt-8 border-t border-gray-800">
                                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-emerald-500" />
                                    Financial Structure
                                </h3>

                                <div className="space-y-4">
                                    <div className="flex justify-between items-center p-4 bg-black/20 rounded-lg">
                                        <span className="text-gray-400">One-Time Implementation & Setup</span>
                                        <span className="text-white font-mono font-medium">${setup_fee.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-4 bg-black/20 rounded-lg">
                                        <div>
                                            <span className="block text-gray-400">Monthly Recurring Revenue (MRR)</span>
                                            <span className="text-xs text-gray-600">Enterprise Server Hosting & Support</span>
                                        </div>
                                        <span className="text-white font-mono font-medium">${monthly_fee.toLocaleString()}/mo</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Legal Disclaimers */}
                        <div className="text-xs text-gray-600 leading-relaxed bg-[#0a0a0a] p-6 rounded-2xl border border-gray-900">
                            By clicking <strong>"Accept Terms & Proceed to Payment"</strong>, {client_name} ("Client") agrees to the Brasa Meat Intelligence OS Master Software as a Service (SaaS) Agreement. The initial payment due today securely authorizes Stripe to establish your invoicing cycle. Accounts are dynamically suspended if the Monthly Recurring Revenue (MRR) invoice is not settled by the 10th day of the billing cycle.
                        </div>
                    </div>

                    {/* Right Col - actionable */}
                    <div className="space-y-6">
                        <div className="bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a] border border-gray-800 rounded-2xl p-6 shadow-2xl sticky top-28">
                            
                            <h3 className="text-gray-400 font-medium mb-6">Due Today</h3>
                            
                            <div className="flex items-baseline gap-2 mb-8">
                                <span className="text-5xl font-bold text-white tracking-tighter">${totalDueNow.toLocaleString()}</span>
                                <span className="text-gray-500 font-mono">USD</span>
                            </div>

                            <div className="space-y-4 mb-8">
                                <div className="flex items-center gap-3 text-sm text-gray-300">
                                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                                    <span>Instant System Provisioning</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-gray-300">
                                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                                    <span>Secure Stripe™ B2B Checkout</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-gray-300">
                                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                                    <span>ACH Wire & Credit Card Accepted</span>
                                </div>
                            </div>

                            <button
                                onClick={handleAccept}
                                disabled={accepting}
                                className={`w-full group relative flex items-center justify-center gap-2 py-4 px-6 rounded-xl font-bold text-white shadow-xl transition-all duration-300 ${
                                    accepting 
                                    ? 'bg-amber-600/50 cursor-not-allowed' 
                                    : 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 shadow-amber-900/40 hover:shadow-amber-900/60 hover:-translate-y-0.5'
                                }`}
                            >
                                {accepting ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Initializing Secure Gateway...
                                    </>
                                ) : (
                                    <>
                                        Accept Terms & Proceed
                                        <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>

                            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-600">
                                <Shield className="w-3 h-3" />
                                256-bit Encrypted Checkout
                            </div>
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
};

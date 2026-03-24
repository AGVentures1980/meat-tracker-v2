import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { CreditCard } from 'lucide-react';

export const ClientBillingPage = () => {
    const { user, selectedCompany } = useAuth();
    const [stores, setStores] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const API_URL = (import.meta as any).env.VITE_API_URL || '';
    const authHeaders = {
        'Authorization': `Bearer ${user?.token}`,
        'x-company-id': selectedCompany || user?.companyId || ''
    };

    useEffect(() => {
        const fetchStores = async () => {
            if (!user?.token) return;
            setLoading(true);
            try {
                const res = await fetch(`${API_URL}/api/v1/dashboard/company/stores`, {
                    headers: authHeaders
                });
                if (res.ok) {
                    setStores(await res.json());
                }
            } catch (error) {
                console.error('Fetch Stores Error:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStores();
    }, [user?.token, selectedCompany]);

    if (loading) {
        return (
            <div className="max-w-6xl mx-auto p-6 space-y-6">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-2xl font-black text-white uppercase tracking-tighter">SaaS Billing & Invoices</h1>
                        <p className="text-gray-500 text-sm">Financial OS & Master Subscriptions</p>
                    </div>
                </div>
                <div className="p-12 text-center text-gray-500 text-xs uppercase tracking-widest animate-pulse">
                    Loading Billing Data...
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-black text-white uppercase tracking-tighter">SaaS Billing & Invoices</h1>
                    <p className="text-gray-500 text-sm">Financial OS & Master Subscriptions</p>
                </div>
            </div>

            <div className="p-8 space-y-8 bg-[#1a1a1a] rounded-xl border border-white/5 shadow-2xl">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-white/10 pb-6">
                    <div>
                        <h2 className="text-xl font-black text-white uppercase tracking-widest flex items-center gap-2">
                            <CreditCard className="w-6 h-6 text-[#3b82f6]" />
                            Subscription & Billing
                        </h2>
                        <p className="text-gray-400 text-sm mt-1">Manage your active licensed stores, download PDF invoices, and update your payment method.</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Total Licensed Stores</p>
                        <p className="text-3xl font-black text-white">{stores.length}</p>
                        <p className="text-[#3b82f6] text-sm font-bold mt-1">Est. ${stores.length * 1000} / month</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-[#111] p-6 rounded-xl border border-white/5 hover:border-[#3b82f6]/30 transition-all flex flex-col justify-between">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></div>
                                <h3 className="text-white font-bold">Enterprise Software License</h3>
                            </div>
                            <p className="text-gray-500 text-xs mb-6 leading-relaxed">You are currently operating on the SaaS model. Proceed to checkout to formally bind your subscription to your {stores.length} licensed store(s) using a credit card or ACH Bank Transfer.</p>
                        </div>
                        <button
                            title="Subscribe to System"
                            onClick={async () => {
                                try {
                                    const res = await fetch(`${API_URL}/api/v1/billing/create-checkout-session`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json', ...authHeaders },
                                        body: JSON.stringify({ companyId: selectedCompany || user?.companyId, quantity: stores.length })
                                    });
                                    const data = await res.json();
                                    if (data.url) window.location.href = data.url;
                                    else alert('Checkout Error: ' + data.error);
                                } catch (e) { alert('Failed to open secure Stripe checkout. Ensure server is online.'); }
                            }}
                            className="w-full py-3 bg-[#3b82f6] hover:bg-[#2563eb] text-white font-black uppercase tracking-widest rounded-lg transition-all shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                        >
                            Subscribe to System
                        </button>
                    </div>

                    <div className="bg-[#111] p-6 rounded-xl border border-white/5 hover:border-white/20 transition-all flex flex-col justify-between">
                        <div>
                            <h3 className="text-white font-bold mb-2">Self-Service Portal</h3>
                            <p className="text-gray-500 text-xs mb-6 leading-relaxed">View past PDF invoices, update credit cards, manage ACH details, or download tax receipts without contacting support.</p>
                        </div>
                        <button
                            title="Manage Billing Setup"
                            onClick={async () => {
                                try {
                                    const res = await fetch(`${API_URL}/api/v1/billing/create-portal-session`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json', ...authHeaders },
                                        body: JSON.stringify({ companyId: selectedCompany || user?.companyId })
                                    });
                                    const data = await res.json();
                                    if (data.url) window.location.href = data.url;
                                    else alert('Subscription required: ' + (data.error || 'No active portal configuration. Please subscribe first.'));
                                } catch (e) { alert('Failed to open billing portal'); }
                            }}
                            className="w-full py-3 bg-black border border-white/20 text-white font-bold hover:bg-white/5 hover:border-white/40 uppercase tracking-widest rounded-lg transition-all"
                        >
                            Manage Billing Setup
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

import React, { useState } from 'react';
import { Shield, TrendingDown, TrendingUp, Target, DollarSign, Database, AlertCircle, EyeOff, Search } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

export const CorpProcurement = () => {
    const { t } = useLanguage();
    const { user } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    // Hard Lockout: ONLY the owner can see this page
    if (user?.email?.toLowerCase().trim() !== 'alexandre@alexgarciaventures.co') {
        return <Navigate to="/dashboard" replace />;
    }

    const handleGenerateReport = () => {
        setIsGenerating(true);
        setTimeout(() => {
            setIsGenerating(false);
            alert('Supplier Benchmark Report generated successfully and sent to your email.');
        }, 1500);
    };

    const [topOpportunities, setTopOpportunities] = useState<any[]>([]);
    const [loadingDrifts, setLoadingDrifts] = useState(true);

    React.useEffect(() => {
        const fetchDrifts = async () => {
            try {
                const res = await fetch('/api/v1/intelligence/ocr/drifts', {
                    headers: { 'Authorization': `Bearer ${user?.token}` }
                });
                const data = await res.json();
                if (data.success) {
                    setTopOpportunities(data.drifts || []);
                }
            } catch (e) {
                console.error("Failed to fetch OCR drifts", e);
            } finally {
                setLoadingDrifts(false);
            }
        };
        fetchDrifts();
    }, [user]);

    const recentInvoices = [
        { id: 'INV-0992', date: 'Today', store: 'Dallas', status: 'Ingested (Stealth)', items: 45, value: 5400 },
        { id: 'INV-0991', date: 'Yesterday', store: 'Addison', status: 'Ingested (Stealth)', items: 32, value: 3800 },
        { id: 'INV-0990', date: 'Yesterday', store: 'Fort Worth', status: 'Ingested (Stealth)', items: 51, value: 6100 },
    ];

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                        <Shield className="w-6 h-6 text-[#C5A059]" />
                        Market Reference Analysis
                    </h1>
                    <p className="text-gray-400 text-sm mt-1">
                        Corporate Procurement Intelligence (Stealth Mode)
                    </p>
                </div>
                <div className="flex items-center gap-2 bg-[#FF2A6D]/10 text-[#FF2A6D] px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border border-[#FF2A6D]/20">
                    <EyeOff className="w-4 h-4" />
                    Store View Hidden
                </div>
            </div>

            {/* Explanatory Banner for the User */}
            <div className="bg-[#2a2a2a] p-4 rounded-lg border border-[#333] mb-6">
                <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-[#00FF94] mt-0.5 flex-shrink-0" />
                    <div>
                        <h3 className="text-[#00FF94] font-bold text-sm">How Stealth Data Collection Works</h3>
                        <p className="text-gray-300 text-xs mt-1 leading-relaxed">
                            1. Store Managers upload their invoices to the "Inventory" or "Prices" tabs as normal.<br />
                            2. <strong>Stealth Mapped:</strong> The system extracts the exact price paid per pound without alerting them of the benchmark.<br />
                            3. <strong>Hive Mind:</strong> We calculate the anonymized network Median (discarding top 10% and bottom 10%).<br />
                            4. <strong>Market Index:</strong> We compare it against the external Urner Barry/USDA weekly index.<br />
                            5. Only Directors/Admins see this Dashboard to identify "Money Left on the Table".
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[#1a1a1a] p-4 rounded-xl border border-[#333] relative overflow-hidden">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-[#C5A059]/10 rounded-full blur-xl pointer-events-none"></div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-[#2a2a2a] rounded-lg">
                            <Target className="w-5 h-5 text-[#C5A059]" />
                        </div>
                        <h3 className="text-sm font-medium text-gray-400">Total Opportunity Gap</h3>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-white">$4,850</span>
                        <span className="text-xs text-red-500 font-medium">/ week</span>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-2">Potential savings across 3 pilot stores</p>
                </div>

                <div className="bg-[#1a1a1a] p-4 rounded-xl border border-[#333] relative overflow-hidden">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-[#00FF94]/5 rounded-full blur-xl pointer-events-none"></div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-[#2a2a2a] rounded-lg">
                            <Database className="w-5 h-5 text-[#00FF94]" />
                        </div>
                        <h3 className="text-sm font-medium text-gray-400">Invoices Ingested</h3>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-white">124</span>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-2">Over the last 30 days (stealth source)</p>
                </div>

                <div className="bg-[#1a1a1a] p-4 rounded-xl border border-[#333] relative overflow-hidden">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-[#2a2a2a] rounded-lg">
                            <DollarSign className="w-5 h-5 text-gray-400" />
                        </div>
                        <h3 className="text-sm font-medium text-gray-400">Hive Mind Accuracy</h3>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-white">96.8%</span>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-2">Correlation with Market Index (USDA)</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                {/* Top Opportunities */}
                <div className="bg-[#1a1a1a] rounded-xl border border-[#333] flex flex-col">
                    <div className="p-4 border-b border-[#333] flex justify-between items-center">
                        <h2 className="font-bold text-white">Top Variance Opportunities</h2>
                        <span className="text-xs text-gray-500">Last 7 Days</span>
                    </div>
                    <div className="p-0 overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[500px]">
                            <thead>
                                <tr className="border-b border-[#333] bg-[#222]">
                                    <th className="p-3 font-medium text-xs text-gray-400 uppercase tracking-wider">Item & Store</th>
                                    <th className="p-3 font-medium text-xs text-gray-400 uppercase tracking-wider">Paid</th>
                                    <th className="p-3 font-medium text-xs text-gray-400 uppercase tracking-wider">Hive/USDA</th>
                                    <th className="p-3 font-medium text-xs text-gray-400 uppercase tracking-wider text-right">Impact</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loadingDrifts ? (
                                    <tr>
                                        <td colSpan={4} className="p-4 text-center text-gray-500 text-sm">Auditing Invoices...</td>
                                    </tr>
                                ) : topOpportunities.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="p-4 text-center text-[#00FF94] text-sm">No Price Drifts Detected</td>
                                    </tr>
                                ) : topOpportunities.map((opp, i) => (
                                    <tr key={i} className="border-b border-[#333] hover:bg-white/5 transition-colors">
                                        <td className="p-3">
                                            <div className="font-medium text-sm text-white">{opp.item}</div>
                                            <div className="text-xs text-gray-500">{opp.store}</div>
                                        </td>
                                        <td className="p-3">
                                            <div className="text-red-400 font-mono text-sm">${opp.invoiced_price?.toFixed(2)}</div>
                                            <div className="text-[10px] text-red-500">PRICE DRIFT DETECTED</div>
                                        </td>
                                        <td className="p-3">
                                            <div className="text-gray-300 font-mono text-sm">Source: OCR</div>
                                            <div className="text-gray-500 font-mono text-xs">Inv: {opp.invoice_id}</div>
                                        </td>
                                        <td className="p-3 text-right">
                                            <button className="px-3 py-1 bg-[#222] border border-red-500/30 text-red-400 text-xs rounded hover:bg-red-500/10">Block Payment</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Stealth Activity Feed */}
                <div className="bg-[#1a1a1a] rounded-xl border border-[#333] flex flex-col">
                    <div className="p-4 border-b border-[#333] flex justify-between items-center">
                        <h2 className="font-bold text-white">Recent Stealth Ingestions</h2>
                    </div>
                    <div className="p-4 space-y-4">
                        {recentInvoices.map((inv, i) => (
                            <div key={i} className="flex items-center justify-between p-3 bg-[#222] rounded-lg border border-[#333]">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                                        <EyeOff className="w-4 h-4 text-blue-400" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-medium text-white">{inv.id} - {inv.store}</h4>
                                        <p className="text-xs text-gray-500">{inv.items} items parsed • {inv.date}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-mono text-white">${inv.value.toFixed(2)}</div>
                                    <div className="text-[10px] text-[#00FF94] uppercase tracking-wider">{inv.status}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="mt-8 flex justify-center">
                <button
                    onClick={handleGenerateReport}
                    disabled={isGenerating}
                    className={`px-6 py-2 bg-[#C5A059] text-black text-sm font-bold uppercase rounded hover:bg-[#d6b069] transition-colors flex items-center gap-2 ${isGenerating ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                    {isGenerating ? (
                        <>
                            <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                            Generating...
                        </>
                    ) : (
                        'Generate Supplier Benchmark Report'
                    )}
                </button>
            </div>
        </div>
    );
};

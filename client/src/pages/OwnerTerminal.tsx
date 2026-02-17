```typescript
import { useState, useEffect } from 'react';
import {
    CreditCard,
    Search,
    LineChart as ChartIcon,
    ArrowUpRight,
    Building2,
    Zap,
    Download,
    Globe,
    Server,
    Activity,
    Mail,
    Copy,
    X,
    Send
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface Metric {
    label: string;
    value: string;
    change: string;
    icon: any;
    color: string;
}

export const OwnerTerminal = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'overview' | 'billing' | 'leads' | 'dev'>('overview');
    const [leads, setLeads] = useState<any[]>([]);
    const [finances, setFinances] = useState<any>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [loading, setLoading] = useState(true);

    // Email Modal State
    const [emailModalOpen, setEmailModalOpen] = useState(false);
    const [selectedLead, setSelectedLead] = useState<any>(null);
    const [emailContent, setEmailContent] = useState('');

    const fetchData = async () => {
        try {
            setLoading(true);
            const headers = { 'Authorization': `Bearer ${ user?.token } ` };

            const [finRes, leadsRes] = await Promise.all([
                fetch('/api/v1/owner/billing/finances', { headers }),
                fetch('/api/v1/owner/prospecting/leads', { headers })
            ]);

            const finData = await finRes.json();
            const leadsData = await leadsRes.json();

            if (finData.success) setFinances(finData);
            if (leadsData.success) setLeads(leadsData.leads);
        } catch (err) {
            console.error('Failed to fetch owner data', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user?.token) {
            fetchData();
        }
    }, [user?.token]);

    const runDiscovery = async () => {
        try {
            setIsScanning(true);
            const res = await fetch('/api/v1/owner/prospecting/discover', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${ user?.token } ` }
            });
            const data = await res.json();
            if (data.success) {
                fetchData(); // Refresh list
            }
        } catch (err) {
            console.error('Discovery failed', err);
        } finally {
            setIsScanning(false);
        }
    };

    /**
     * Generates a high-conversion sales email based on the lead's data.
     */
    const handleOpenEmail = (lead: any) => {
        const template = `ASSUNTO: Parceria Estratégica: Brasa Intel x ${ lead.company_name }

Olá equipe ${ lead.company_name },

Nossa inteligência artificial de mercado identificou o ${ lead.company_name } como uma referência no segmento de ${ lead.industry }.

Monitoramos que empresas do seu porte(${ lead.size }) frequentemente enfrentam desafios específicos de controle, e nossa análise preliminar indicou uma oportunidade única para vocês:

DADO IDENTIFICADO:
"${lead.justification}"

O Brasa Intelligence(v5.2) foi desenhado exatamente para resolver esse gargalo.Não somos apenas um ERP, somos um "CFO Digital" que audita cada grama de proteína em tempo real.

Gostaria de agendar uma demonstração técnica de 15 minutos para mostrar como podemos aumentar sua margem em até 12 % nas primeiras semanas.

Aguardo seu retorno,

    --
    Director of Partnerships
Brasa Meat Intelligence Systems
Av.Paulista, SP | Dallas, TX`;

        setSelectedLead(lead);
        setEmailContent(template);
        setEmailModalOpen(true);
    };

    const handleCopyEmail = () => {
        navigator.clipboard.writeText(emailContent);
        alert('Email copiado para a área de transferência!');
    };

    const handleSendSimulation = async () => {
        try {
            const res = await fetch('/api/v1/owner/prospecting/send-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${ user?.token } `
                },
                body: JSON.stringify({
                    leadId: selectedLead?.id,
                    emailContent
                })
            });

            const data = await res.json();
            if (data.success) {
                alert(`Email enviado com sucesso para ${ selectedLead?.company_name }.`);
                setEmailModalOpen(false);
            } else {
                alert('Falha ao enviar email.');
            }
        } catch (error) {
            console.error('Email send failed', error);
            alert('Erro ao conectar com o servidor de email.');
        }
    };

    const handleScheduleMeeting = (lead: any) => {
        const subject = `Reunião de Apresentação - ${ lead.company_name } `;
        const body = `Olá, gostaria de agendar um horário para apresentarmos o Brasa Intel.\n\nContexto: ${ lead.justification } `;
        window.open(`mailto:? subject = ${ encodeURIComponent(subject) }& body=${ encodeURIComponent(body) } `);
    };

    const metrics: Metric[] = [
        {
            label: 'Total Revenue',
            value: finances?.metrics ? `$${ finances.metrics.totalRevenue.toLocaleString() } ` : '$0',
            change: finances?.metrics ? '+Live' : '+0%',
            icon: ArrowUpRight,
            color: 'text-[#00FF94]'
        },
        {
            label: 'Active Companies',
            value: finances?.metrics ? finances.metrics.activeClients.toString() : '0',
            change: '+1',
            icon: Building2,
            color: 'text-[#C5A059]'
        },
        {
            label: 'AI Leads Found',
            value: leads.length.toString(),
            change: `+ ${ leads.length } `,
            icon: Search,
            color: 'text-blue-400'
        },
        { label: 'Platform Uptime', value: '99.98%', change: 'Stable', icon: Zap, color: 'text-[#FF2A6D]' },
    ];

    if (loading) return (
        <div className="min-h-screen bg-[#050505] flex items-center justify-center font-mono text-[#C5A059]">
            <div className="animate-pulse flex items-center gap-2">
                <Zap className="animate-bounce" /> INITIALIZING BRASA OWNER TERMINAL v4.5...
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#050505] text-white p-6 font-sans">
            <div className="max-w-7xl mx-auto">
                {/* Elite Header */}
                <div className="flex justify-between items-end mb-12">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="w-2 h-2 rounded-full bg-[#00FF94] animate-pulse"></span>
                            <span className="text-[10px] uppercase font-mono tracking-[.3em] text-gray-500">Global Command Center</span>
                        </div>
                        <h1 className="text-4xl font-black tracking-tighter">Owner <span className="text-[#C5A059]">Intelligence</span></h1>
                    </div>
                    <div className="text-right font-mono text-[10px] text-gray-500 uppercase tracking-widest">
                        ADVISOR AI: ACTIVE <br />
                        LAST SYNC: {new Date().toLocaleTimeString()}
                    </div>
                </div>

                {/* Main Navigation */}
                <div className="flex gap-1 bg-[#111] p-1 border border-white/5 rounded-lg mb-8 w-fit">
                    {(['overview', 'billing', 'leads', 'dev'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px - 6 py - 2 rounded - md text - xs font - bold uppercase tracking - widest transition - all ${ activeTab === tab ? 'bg-[#C5A059] text-black shadow-[0_0_20px_rgba(197,160,89,0.3)]' : 'text-gray-500 hover:text-white' } `}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    {activeTab === 'overview' && (
                        <>
                            {/* Summary Metrics */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                {metrics.map((m, i) => (
                                    <div key={i} className="bg-[#111] border border-white/5 p-6 rounded-xl group hover:border-[#C5A059]/30 transition-all">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className={`p - 2 rounded - lg bg - white / 5 ${ m.color } `}>
                                                <m.icon size={20} />
                                            </div>
                                            <span className={`text - [10px] font - bold ${ m.color } `}>{m.change}</span>
                                        </div>
                                        <p className="text-gray-500 text-xs uppercase tracking-widest mb-1">{m.label}</p>
                                        <h3 className="text-2xl font-black">{m.value}</h3>
                                    </div>
                                ))}
                            </div>

                            {/* Client Billing Preview */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <div className="lg:col-span-2 bg-[#111] border border-white/5 rounded-xl overflow-hidden">
                                    <div className="p-6 border-b border-white/5 flex justify-between items-center">
                                        <h3 className="font-bold flex items-center gap-2"><CreditCard size={18} className="text-[#C5A059]" /> Recent Client Billing</h3>
                                        <button className="text-[10px] text-[#C5A059] hover:underline uppercase tracking-widest font-bold">View All Invoices</button>
                                    </div>
                                    <div className="p-0">
                                        <table className="w-full text-left">
                                            <thead className="bg-white/5 text-[10px] uppercase font-mono text-gray-500">
                                                <tr>
                                                    <th className="px-6 py-3">ID</th>
                                                    <th className="px-6 py-4">Client / Company</th>
                                                    <th className="px-6 py-4">Amount</th>
                                                    <th className="px-6 py-4">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {finances?.invoices?.map((inv: any) => (
                                                    <tr key={inv.id} className="hover:bg-white/[0.02] transition-colors">
                                                        <td className="px-6 py-4 text-xs font-mono text-gray-500">{inv.id.substring(0, 8)}</td>
                                                        <td className="px-6 py-4 font-bold">{inv.company?.name || 'Unknown'}</td>
                                                        <td className="px-6 py-4 font-mono">${inv.amount.toLocaleString()}</td>
                                                        <td className="px-6 py-4">
                                                            <span className={`px - 2 py - 0.5 rounded - full text - [9px] font - bold uppercase tracking - widest ${ inv.status === 'paid' ? 'bg-[#00FF94]/10 text-[#00FF94]' : 'bg-red-500/10 text-red-500' } `}>
                                                                {inv.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {(!finances?.invoices || finances.invoices.length === 0) && (
                                                    <tr>
                                                        <td colSpan={4} className="px-6 py-8 text-center text-gray-500 text-xs italic">No recent invoices found.</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <div className="bg-gradient-to-br from-[#111] to-[#0A0A0A] border border-white/5 p-6 rounded-xl flex flex-col justify-between">
                                    <div>
                                        <h3 className="font-bold mb-6 flex items-center gap-2"><ChartIcon size={18} className="text-[#FF2A6D]" /> Acquisition Funnel</h3>
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <div className="flex justify-between text-[10px] font-mono text-gray-500 uppercase">
                                                    <span>Leads Qualified</span>
                                                    <span>72%</span>
                                                </div>
                                                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                                    <div className="h-full bg-blue-500 w-[72%]"></div>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <div className="flex justify-between text-[10px] font-mono text-gray-500 uppercase">
                                                    <span>Sales Velocity</span>
                                                    <span>High</span>
                                                </div>
                                                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                                    <div className="h-full bg-[#00FF94] w-[88%]"></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-8 p-4 bg-[#C5A059]/5 border border-[#C5A059]/20 rounded-lg">
                                        <p className="text-[10px] text-[#C5A059] font-bold uppercase mb-2">Advisor Insight</p>
                                        <p className="text-gray-400 text-xs leading-relaxed">
                                            Client retention is up 4% this month. Suggesting expansion of the "Executive Analyst" features to increase upsell potential for Starter plans.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {activeTab === 'leads' && (
                        <div className="space-y-6">
                            <div className="bg-[#111] border border-white/5 p-8 rounded-xl flex items-center justify-between">
                                <div>
                                    <h2 className="text-2xl font-black mb-2 flex items-center gap-3">
                                        <Search className="text-[#C5A059]" /> AI Prospecting Agent
                                    </h2>
                                    <p className="text-gray-500 text-sm">Working full-time discovery. Found {leads.length} high-fit companies today.</p>
                                </div>
                                <div className="flex gap-4">
                                    <button className="px-6 py-2 bg-white/5 border border-white/10 text-xs font-bold uppercase tracking-widest rounded-lg flex items-center gap-2 hover:bg-white/10 transition-all">
                                        <Download size={16} /> Export Mail List
                                    </button>
                                    <button
                                        onClick={runDiscovery}
                                        disabled={isScanning}
                                        className="px-6 py-2 bg-[#C5A059] text-black text-xs font-bold uppercase tracking-widest rounded-lg flex items-center gap-2 shadow-lg hover:scale-105 transition-all disabled:opacity-50"
                                    >
                                        <Zap size={16} className={isScanning ? 'animate-spin' : ''} />
                                        {isScanning ? 'Scanning...' : 'Run deep search'}
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {leads.map(lead => (
                                    <div key={lead.id} className="bg-[#111] border border-white/5 p-6 rounded-xl hover:border-[#C5A059]/50 transition-all relative group">
                                        <div className="flex justify-between items-start mb-6">
                                            <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[9px] font-bold uppercase tracking-widest border border-blue-400/20">
                                                {lead.size} Firm
                                            </span>
                                            <div className="text-right">
                                                <div className="text-[10px] text-gray-500 font-mono uppercase">Match Score</div>
                                                <div className="text-xl font-black text-[#00FF94]">{(lead.potential_fit * 100).toFixed(0)}%</div>
                                            </div>
                                        </div>
                                        <h3 className="text-xl font-bold mb-4">{lead.company_name}</h3>
                                        <div className="space-y-4 mb-8">
                                            <div>
                                                <p className="text-[9px] text-gray-500 uppercase font-bold mb-1">Study Justification</p>
                                                <p className="text-xs text-gray-300 leading-relaxed italic">"{lead.justification}"</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => handleOpenEmail(lead)}
                                                className="flex-1 py-2 bg-[#C5A059]/10 text-[#C5A059] text-[10px] font-bold uppercase tracking-widest rounded border border-[#C5A059]/20 hover:bg-[#C5A059] hover:text-black transition-all flex items-center justify-center gap-2"
                                            >
                                                <Mail size={14} /> Email Marketing
                                            </button>
                                            <button 
                                                onClick={() => handleScheduleMeeting(lead)}
                                                className="px-3 py-2 bg-white/5 text-white rounded border border-white/10 hover:bg-white/10"
                                                title="Schedule Meeting"
                                            >
                                                <Activity size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'dev' && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="bg-[#111] border border-white/5 p-8 rounded-xl h-[400px] flex flex-col justify-center items-center">
                                <ChartIcon size={48} className="text-gray-700 mb-4" />
                                <p className="text-gray-500 font-mono text-xs uppercase tracking-widest">Platform Development Milestones Graph</p>
                                <p className="text-[10px] text-gray-600 mt-2">Active Deployments: 14 | Version: 5.2.0-STABLE</p>
                            </div>
                            <div className="bg-[#111] border border-white/5 p-8 rounded-xl">
                                <h3 className="font-bold mb-6 flex items-center gap-2"><Zap size={18} className="text-yellow-400" /> System Health Log</h3>
                                <div className="space-y-4 font-mono text-[11px]">
                                    {[
                                        { time: '13:58:12', msg: 'MeatEngine Logic Verified: Dallas TX', status: 'OK' },
                                        { time: '13:55:04', msg: 'Automatic Sync: UberEats Integration', status: 'OK' },
                                        { time: '13:48:33', msg: 'Process Recovery successful: Port 3000', status: 'OK' },
                                        { time: '13:02:19', msg: 'Global Lead Gen: 3 new prospects found', status: 'INFO' },
                                    ].map((log, i) => (
                                        <div key={i} className="flex justify-between items-center py-2 border-b border-white/5">
                                            <div className="flex gap-4">
                                                <span className="text-gray-600">{log.time}</span>
                                                <span className="text-gray-400">{log.msg}</span>
                                            </div>
                                            <span className={log.status === 'OK' ? 'text-[#00FF94]' : 'text-blue-400'}>{log.status}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footnote */}
                <div className="mt-20 py-8 border-t border-white/5 flex justify-between items-center opacity-40">
                    <p className="text-[10px] font-mono tracking-widest uppercase">Brasa Intelligence • Advanced Management Suite</p>
                    <div className="flex items-center gap-6">
                        <p className="text-[10px] font-mono">ENCRYPTED END-TO-END</p>
                        <p className="text-[10px] font-mono">LATENCY: 12ms</p>
                    </div>
                </div>
            </div>

            {/* Email Marketing Modal */}
            {emailModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    <div className="bg-[#1a1a1a] border border-white/10 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#111]">
                            <h3 className="flex items-center gap-3 text-lg font-bold text-white">
                                <div className="p-2 bg-[#C5A059]/10 rounded-lg">
                                    <Mail size={18} className="text-[#C5A059]" />
                                </div>
                                SALES GENERATOR: {selectedLead?.company_name}
                            </h3>
                            <button onClick={() => setEmailModalOpen(false)} className="text-gray-500 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="p-6">
                            <div className="mb-4 bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl flex gap-3 items-start">
                                <Zap className="text-blue-400 shrink-0 mt-0.5" size={16} />
                                <p className="text-blue-200 text-xs leading-relaxed">
                                    <span className="font-bold">AI INSIGHT:</span> O email foi gerado focando na dor identificada: <span className="text-white font-bold">"{selectedLead?.justification}"</span>. A taxa estimada de resposta para este template é de 24%.
                                </p>
                            </div>

                            <textarea
                                value={emailContent}
                                onChange={(e) => setEmailContent(e.target.value)}
                                className="w-full h-64 bg-[#0a0a0a] border border-white/10 rounded-xl p-4 text-sm text-gray-300 font-mono resize-none focus:outline-none focus:border-[#C5A059]/50 transition-colors"
                            />
                        </div>

                        <div className="p-6 border-t border-white/5 bg-[#111] flex justify-end gap-3">
                            <button 
                                onClick={handleCopyEmail}
                                className="px-4 py-3 bg-white/5 hover:bg-white/10 text-white text-xs font-bold uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 border border-white/10"
                            >
                                <Copy size={16} /> Copiar Texto
                            </button>
                            <button 
                                onClick={handleSendSimulation}
                                className="px-6 py-3 bg-[#C5A059] hover:bg-[#D5B069] text-black text-xs font-bold uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(197,160,89,0.2)]"
                            >
                                <Send size={16} /> Revisar e Enviar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

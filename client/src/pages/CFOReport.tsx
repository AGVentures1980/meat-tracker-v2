import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Printer, TrendingDown, TrendingUp, DollarSign, CheckCircle, Target } from 'lucide-react';

export const CFOReport = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState<any>(null);
    const [scan, setScan] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const now = new Date();
    const monthLabel = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const [statsRes, scanRes] = await Promise.all([
                    fetch('/api/v1/dashboard/company-stats', {
                        headers: { 'Authorization': `Bearer ${user?.token}` }
                    }),
                    fetch('/api/v1/analyst/scan?timeframe=M', {
                        headers: { 'Authorization': `Bearer ${user?.token}` }
                    })
                ]);
                if (statsRes.ok) setStats(await statsRes.json());
                if (scanRes.ok) setScan(await scanRes.json());
            } catch (e) {
                console.error('CFO Report fetch failed', e);
            } finally {
                setLoading(false);
            }
        };
        if (user) fetchAll();
    }, [user]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-white">
                <p className="text-gray-400 font-mono text-sm uppercase tracking-widest animate-pulse">Generating Report...</p>
            </div>
        );
    }

    const summary = stats?.summary;
    const topSavers = (stats?.top_savers || []).slice(0, 5);
    const topSpenders = (stats?.top_spenders || []).slice(0, 5);
    const problems = scan?.insights?.nuclearProblems || [];
    const savingsTotal = scan?.insights?.summaryBriefing?.projectedMonthlySavings || 0;
    const lossTotal = scan?.insights?.summaryBriefing?.projectedMonthlyLoss || 0;
    const netImpact = summary?.net_impact_ytd || 0;
    const isPositive = netImpact >= 0;

    // Build action plan: one item per bottom store + one per nuclear problem
    const actionItems = [
        ...topSpenders.map((s: any, i: number) => ({
            store: s.name,
            issue: `Over-portioning: +${s.lbsGuestVar?.toFixed(3)} lbs/guest above target`,
            action: 'Review portioning protocol with kitchen team. Apply Rodízio Padrão template.',
            deadline: '7 days',
            priority: i === 0 ? 'CRITICAL' : 'HIGH'
        })),
        ...problems.map((p: any) => ({
            store: p.locations?.join(', ') || 'Network',
            issue: p.title?.replace(/_/g, ' '),
            action: p.solution?.replace(/_/g, ' ') || 'Escalate to Regional Director',
            deadline: '14 days',
            priority: p.severity || 'HIGH'
        }))
    ].slice(0, 8);

    return (
        <div className="bg-white min-h-screen text-black font-sans">
            {/* Print Controls — hidden on print */}
            <div className="print:hidden bg-[#0a0a0a] border-b border-[#222] px-8 py-4 flex justify-between items-center">
                <div>
                    <h1 className="text-[#C5A059] font-bold text-lg tracking-widest uppercase">CFO Monthly Report</h1>
                    <p className="text-gray-500 text-xs font-mono">{monthLabel} · Texas de Brazil</p>
                </div>
                <button
                    onClick={() => window.print()}
                    className="flex items-center gap-2 bg-[#C5A059] text-black px-6 py-2 text-xs font-bold uppercase tracking-widest hover:bg-[#d4b06a] transition-colors"
                >
                    <Printer size={14} /> Imprimir / Salvar PDF
                </button>
            </div>

            {/* Report Body */}
            <div className="max-w-4xl mx-auto px-10 py-12 print:px-8 print:py-8">

                {/* Header */}
                <div className="flex justify-between items-start mb-10 pb-6 border-b-2 border-black">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-500 mb-1">Texas de Brazil · Brasa Prophet Analytics</p>
                        <h1 className="text-4xl font-serif font-bold text-black leading-tight">
                            Relatório Executivo Mensal
                        </h1>
                        <p className="text-xl text-gray-600 mt-1">{monthLabel}</p>
                    </div>
                    <div className="text-right">
                        <span className="inline-block bg-black text-white text-[9px] font-bold uppercase tracking-widest px-3 py-1 mb-2">
                            CONFIDENCIAL · DIRETORIA
                        </span>
                        <p className="text-[10px] text-gray-400 font-mono">Gerado em: {now.toLocaleDateString('pt-BR')}</p>
                        <p className="text-[10px] text-gray-400 font-mono">Sistema: Brasa Prophet v3.1</p>
                    </div>
                </div>

                {/* Section 1: Financial Summary */}
                <div className="mb-10">
                    <h2 className="text-[10px] font-bold uppercase tracking-[0.25em] text-gray-500 mb-4 flex items-center gap-2">
                        <DollarSign size={12} /> 1. Resumo Financeiro
                    </h2>
                    <div className="grid grid-cols-4 gap-4">
                        <div className={`p-5 border-2 ${isPositive ? 'border-green-600 bg-green-50' : 'border-red-600 bg-red-50'}`}>
                            <p className="text-[9px] font-bold uppercase tracking-widest text-gray-500 mb-2">Impacto Líquido (MTD)</p>
                            <p className={`text-2xl font-mono font-bold ${isPositive ? 'text-green-700' : 'text-red-700'}`}>
                                {isPositive ? '+' : ''}{netImpact.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}
                            </p>
                            <p className="text-[9px] text-gray-500 mt-1">{isPositive ? '✓ Abaixo do target' : '✗ Acima do target'}</p>
                        </div>
                        <div className="p-5 border-2 border-green-600 bg-green-50">
                            <p className="text-[9px] font-bold uppercase tracking-widest text-gray-500 mb-2">Savings Estimado</p>
                            <p className="text-2xl font-mono font-bold text-green-700">
                                {savingsTotal.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}
                            </p>
                            <p className="text-[9px] text-gray-500 mt-1">Lojas abaixo do target</p>
                        </div>
                        <div className="p-5 border-2 border-red-600 bg-red-50">
                            <p className="text-[9px] font-bold uppercase tracking-widest text-gray-500 mb-2">Perda Atual</p>
                            <p className="text-2xl font-mono font-bold text-red-700">
                                {lossTotal.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}
                            </p>
                            <p className="text-[9px] text-gray-500 mt-1">Lojas acima do target</p>
                        </div>
                        <div className="p-5 border-2 border-gray-300 bg-gray-50">
                            <p className="text-[9px] font-bold uppercase tracking-widest text-gray-500 mb-2">Variância Média</p>
                            <p className={`text-2xl font-mono font-bold ${(summary?.avg_lbs_variance || 0) <= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                {(summary?.avg_lbs_variance || 0) > 0 ? '+' : ''}{(summary?.avg_lbs_variance || 0).toFixed(3)}
                            </p>
                            <p className="text-[9px] text-gray-500 mt-1">LBS/Guest vs. Target</p>
                        </div>
                    </div>
                </div>

                {/* Section 2: Top 5 Savers */}
                <div className="mb-10">
                    <h2 className="text-[10px] font-bold uppercase tracking-[0.25em] text-gray-500 mb-4 flex items-center gap-2">
                        <TrendingUp size={12} className="text-green-600" /> 2. Top 5 Lojas — Eficiência
                    </h2>
                    <table className="w-full text-sm border-collapse">
                        <thead>
                            <tr className="bg-black text-white">
                                <th className="p-3 text-left text-[9px] uppercase tracking-widest font-bold">#</th>
                                <th className="p-3 text-left text-[9px] uppercase tracking-widest font-bold">Loja</th>
                                <th className="p-3 text-right text-[9px] uppercase tracking-widest font-bold">Target LBS</th>
                                <th className="p-3 text-right text-[9px] uppercase tracking-widest font-bold">Variância</th>
                                <th className="p-3 text-right text-[9px] uppercase tracking-widest font-bold">Impacto ($)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {topSavers.map((s: any, i: number) => (
                                <tr key={s.id} className={i % 2 === 0 ? 'bg-green-50' : 'bg-white'}>
                                    <td className="p-3 font-bold text-green-700 text-center">#{i + 1}</td>
                                    <td className="p-3 font-bold">{s.name} <span className="text-gray-400 text-xs font-normal">({s.location})</span></td>
                                    <td className="p-3 text-right font-mono text-gray-500">{(s.target || 1.76).toFixed(2)}</td>
                                    <td className="p-3 text-right font-mono text-green-700 font-bold">{s.lbsGuestVar?.toFixed(3)}</td>
                                    <td className="p-3 text-right font-mono text-green-700 font-bold">
                                        +{Math.abs(s.impactYTD || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Section 3: Bottom 5 */}
                <div className="mb-10">
                    <h2 className="text-[10px] font-bold uppercase tracking-[0.25em] text-gray-500 mb-4 flex items-center gap-2">
                        <TrendingDown size={12} className="text-red-600" /> 3. Bottom 5 Lojas — Oportunidade de Melhoria
                    </h2>
                    <table className="w-full text-sm border-collapse">
                        <thead>
                            <tr className="bg-black text-white">
                                <th className="p-3 text-left text-[9px] uppercase tracking-widest font-bold">#</th>
                                <th className="p-3 text-left text-[9px] uppercase tracking-widest font-bold">Loja</th>
                                <th className="p-3 text-right text-[9px] uppercase tracking-widest font-bold">Target LBS</th>
                                <th className="p-3 text-right text-[9px] uppercase tracking-widest font-bold">Variância</th>
                                <th className="p-3 text-right text-[9px] uppercase tracking-widest font-bold">Impacto ($)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {topSpenders.map((s: any, i: number) => (
                                <tr key={s.id} className={i % 2 === 0 ? 'bg-red-50' : 'bg-white'}>
                                    <td className="p-3 font-bold text-red-700 text-center">#{i + 1}</td>
                                    <td className="p-3 font-bold">{s.name} <span className="text-gray-400 text-xs font-normal">({s.location})</span></td>
                                    <td className="p-3 text-right font-mono text-gray-500">{(s.target || 1.76).toFixed(2)}</td>
                                    <td className="p-3 text-right font-mono text-red-700 font-bold">+{s.lbsGuestVar?.toFixed(3)}</td>
                                    <td className="p-3 text-right font-mono text-red-700 font-bold">
                                        {(s.impactYTD || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Section 4: Action Plan */}
                <div className="mb-10">
                    <h2 className="text-[10px] font-bold uppercase tracking-[0.25em] text-gray-500 mb-4 flex items-center gap-2">
                        <Target size={12} /> 4. Plano de Ação
                    </h2>
                    <table className="w-full text-xs border-collapse">
                        <thead>
                            <tr className="bg-black text-white">
                                <th className="p-3 text-left text-[9px] uppercase tracking-widest font-bold">Loja / Área</th>
                                <th className="p-3 text-left text-[9px] uppercase tracking-widest font-bold">Problema</th>
                                <th className="p-3 text-left text-[9px] uppercase tracking-widest font-bold">Ação Recomendada</th>
                                <th className="p-3 text-center text-[9px] uppercase tracking-widest font-bold">Prazo</th>
                                <th className="p-3 text-center text-[9px] uppercase tracking-widest font-bold">Prioridade</th>
                            </tr>
                        </thead>
                        <tbody>
                            {actionItems.length > 0 ? actionItems.map((item, i) => (
                                <tr key={i} className={i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                                    <td className="p-3 font-bold border-b border-gray-200">{item.store}</td>
                                    <td className="p-3 text-gray-600 border-b border-gray-200">{item.issue}</td>
                                    <td className="p-3 border-b border-gray-200">{item.action}</td>
                                    <td className="p-3 text-center font-mono border-b border-gray-200">{item.deadline}</td>
                                    <td className="p-3 text-center border-b border-gray-200">
                                        <span className={`text-[8px] font-bold uppercase px-2 py-1 rounded ${item.priority === 'CRITICAL' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                                            {item.priority}
                                        </span>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={5} className="p-6 text-center text-green-700 font-bold">
                                        <CheckCircle className="inline mr-2" size={16} />
                                        Nenhuma ação crítica identificada. Rede operando dentro dos parâmetros.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer — print only */}
                <div className="border-t-2 border-black pt-6 mt-12">
                    <div className="grid grid-cols-2 gap-8">
                        <div>
                            <p className="text-[9px] text-gray-400 font-mono uppercase tracking-widest mb-1">Fonte de Dados</p>
                            <p className="text-[10px] text-gray-600">Brasa Prophet Analytics Engine v3.1 · {now.toLocaleString('pt-BR')}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[9px] text-gray-400 font-mono uppercase tracking-widest mb-4">Aprovado por</p>
                            <p className="text-[10px] text-gray-600 border-t border-gray-400 pt-1">________________________________</p>
                            <p className="text-[9px] text-gray-400">Diretor Executivo / CFO</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Print CSS */}
            <style>{`
                @media print {
                    @page { margin: 1.5cm; size: A4; }
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                }
            `}</style>
        </div>
    );
};

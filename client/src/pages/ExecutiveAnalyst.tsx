import { useState, useEffect } from 'react';
import { Search, Printer, FileText, Target, AlertCircle, CheckCircle2, LayoutGrid, Database, Zap, ArrowRight, Download } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export const ExecutiveAnalyst = () => {
    const { user } = useAuth();
    const { t } = useLanguage();
    const [timeframe, setTimeframe] = useState<'W' | 'M' | 'Q' | 'Y'>('M');
    const [isScanning, setIsScanning] = useState(false);
    const [data, setData] = useState<any>(null);

    const runScan = async () => {
        setIsScanning(true);
        try {
            const res = await fetch(`/api/v1/analyst/scan?timeframe=${timeframe}`, {
                headers: { 'Authorization': `Bearer ${user?.token}` }
            });
            const result = await res.json();
            if (result.success) {
                setData(result);
            }
        } catch (err) {
            console.error('Analyst scan failed', err);
        } finally {
            setIsScanning(false);
        }
    };

    useEffect(() => {
        runScan();
    }, [timeframe]);

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="p-6 h-[calc(100vh-6rem)] overflow-y-auto bg-[#0a0a0a]">
            {/* Control Header */}
            <div className="flex justify-between items-center mb-10 print:hidden">
                <div>
                    <h1 className="text-3xl font-serif text-[#C5A059] flex items-center gap-3">
                        <Zap className="fill-[#C5A059]" />
                        Executive Intelligence Analyst
                    </h1>
                    <p className="text-gray-500 text-xs font-mono uppercase tracking-[0.2em] mt-1">
                        Cross-Table Heuristic Scan • Texas de Brazil Proprietary Engine
                    </p>
                </div>

                <div className="flex gap-4">
                    <div className="flex bg-[#1a1a1a] p-1 rounded-sm border border-[#333]">
                        {['W', 'M', 'Q', 'Y'].map((tf) => (
                            <button
                                key={tf}
                                onClick={() => setTimeframe(tf as any)}
                                className={`px-4 py-2 text-[10px] font-bold transition-all ${timeframe === tf ? 'bg-[#C5A059] text-black' : 'text-gray-500 hover:text-white'}`}
                            >
                                {tf === 'W' ? 'WEEK' : tf === 'M' ? 'MONTH' : tf === 'Q' ? 'QUARTER' : 'YEAR'}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={handlePrint}
                        className="bg-[#121212] border border-[#333] text-white px-6 py-2 text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-[#222]"
                    >
                        <Printer size={16} /> {t('print_report')}
                    </button>
                    <button
                        onClick={runScan}
                        disabled={isScanning}
                        className="bg-white text-black px-6 py-2 text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-gray-200 disabled:opacity-50"
                    >
                        {isScanning ? <Zap className="animate-spin w-4 h-4" /> : <Search size={16} />}
                        {isScanning ? 'Scanning...' : 'Run Deep Scan'}
                    </button>
                </div>
            </div>

            {data ? (
                <div className="space-y-12">
                    {/* TOP SUMMARY (Print Ready) */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 print:grid-cols-4">
                        <div className="bg-[#111] p-6 border-b-2 border-brand-gold shadow-2xl">
                            <p className="text-[10px] text-gray-400 font-mono uppercase mb-2">Network Health Score</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-4xl font-serif text-white">{data.insights.summaryBriefing.systemHealth.toFixed(1)}%</span>
                                <span className="text-[#00FF94] text-xs font-bold">▲ SAFE</span>
                            </div>
                        </div>
                        <div className="bg-[#111] p-6 border-b-2 border-[#FF2A6D] shadow-2xl">
                            <p className="text-[10px] text-gray-400 font-mono uppercase mb-2">Critical Anomalies</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-4xl font-serif text-white">{data.insights.summaryBriefing.criticalAlerts}</span>
                                <span className="text-gray-500 text-xs uppercase font-mono tracking-tighter">Requires Action</span>
                            </div>
                        </div>
                        <div className="bg-[#111] p-6 border-b-2 border-[#00FF94] shadow-2xl">
                            <p className="text-[10px] text-gray-400 font-mono uppercase mb-2">Projected Monthly Savings</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-4xl font-serif text-white">${(data.insights.summaryBriefing.projectedMonthlySavings / 1000).toFixed(0)}k</span>
                                <span className="text-gray-500 text-xs uppercase font-mono tracking-tighter">Verified Logic</span>
                            </div>
                        </div>
                        <div className="bg-[#111] p-6 border-b-2 border-[#333] shadow-2xl">
                            <p className="text-[10px] text-gray-400 font-mono uppercase mb-2">Scan Range</p>
                            <span className="text-xl font-serif text-gray-300">{data.scanMetadata.range}</span>
                        </div>
                    </div>

                    {/* GARCIA BRIEFING (The Pearl) */}
                    <div className="bg-[#1a1a1a] border-l-4 border-l-[#C5A059] p-8 shadow-2xl print:bg-white print:text-black print:border-l-black">
                        <div className="flex items-center gap-3 mb-6 border-b border-[#333] pb-4 print:border-gray-300">
                            <FileText className="text-[#C5A059] print:text-black" size={24} />
                            <h2 className="text-xl font-serif text-white uppercase tracking-widest print:text-black">Internal Briefing: Strategic Overview</h2>
                        </div>

                        <div className="space-y-8">
                            {data.insights.nuclearProblems.map((prob: any, i: number) => (
                                <div key={i} className="group">
                                    <div className="flex items-center gap-2 mb-2">
                                        <AlertCircle className="text-[#FF2A6D]" size={16} />
                                        <h3 className="text-sm font-bold text-white uppercase tracking-tight print:text-black">{prob.title}</h3>
                                        <span className="bg-[#FF2A6D]/10 text-[#FF2A6D] text-[9px] px-1 font-bold rounded-sm border border-[#FF2A6D]/30">{prob.severity}</span>
                                    </div>
                                    <p className="text-gray-400 text-sm mb-4 leading-relaxed font-serif italic print:text-gray-700">
                                        Detected in: {prob.locations.join(', ')}
                                    </p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="bg-[#121212] p-4 border border-[#333] print:bg-gray-50 print:border-gray-200">
                                            <p className="text-[9px] text-[#FF2A6D] uppercase font-bold mb-2 tracking-widest">Problem Description</p>
                                            <p className="text-xs text-gray-300 leading-relaxed print:text-gray-800">{prob.description}</p>
                                        </div>
                                        <div className="bg-[#121212] p-4 border border-[#C5A059]/30 print:bg-gray-50 print:border-gray-200">
                                            <p className="text-[9px] text-[#00FF94] uppercase font-bold mb-2 tracking-widest">Advanced Solution</p>
                                            <p className="text-xs text-gray-300 leading-relaxed print:text-gray-800 font-bold">{prob.solution}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-12 border-t border-[#333] pt-6 print:border-gray-300">
                            <h4 className="text-[10px] text-[#C5A059] uppercase font-bold mb-4 tracking-widest">Growth & Impact Opportunities</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {data.insights.recommendations.map((rec: any, i: number) => (
                                    <div key={i} className="flex gap-4">
                                        <div className="h-10 w-1 bg-[#C5A059] mt-1 shrink-0"></div>
                                        <div>
                                            <p className="text-white font-bold text-xs uppercase mb-1 print:text-black">{rec.area}</p>
                                            <p className="text-[11px] text-gray-500 print:text-gray-600 mb-2">{rec.action}</p>
                                            <p className="text-[#00FF94] text-[10px] font-mono font-bold tracking-tighter">Est. Impact: {rec.impact}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* SIGNATURE AREA (PRINT ONLY) */}
                        <div className="hidden print:block mt-20 pt-10 border-t border-gray-300 text-[10px] text-gray-400">
                            <p>Data Source: Brasa Prophet Analytics Engine v2.6.0</p>
                            <p>Verification Signature: __________________________ (Executive Director Approval)</p>
                            <p className="mt-2">Generated on: {new Date().toLocaleString()}</p>
                        </div>
                    </div>

                    {/* DATA MATRIX GRID */}
                    <div className="bg-[#1a1a1a] border border-[#333] rounded-sm overflow-hidden print:hidden">
                        <div className="p-4 bg-[#222] border-b border-[#333] flex justify-between items-center">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-[#C5A059]">Full Analytic Matrix</h3>
                            <button className="text-[10px] text-gray-500 hover:text-white flex items-center gap-1">
                                <Download size={12} /> EXCEL EXPORT
                            </button>
                        </div>
                        <div className="max-h-[500px] overflow-auto">
                            <table className="w-full text-left text-xs font-mono">
                                <thead className="bg-[#121212] text-gray-500 sticky top-0">
                                    <tr>
                                        <th className="p-3 border-r border-[#333]">Store</th>
                                        <th className="p-3 text-right">Lbs/Guest</th>
                                        <th className="p-3 text-right">$/Guest</th>
                                        <th className="p-3 text-right text-brand-gold">Impact (PTD)</th>
                                        <th className="p-3 text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#333]">
                                    {data.matrix.map((row: any, i: number) => (
                                        <tr key={i} className="hover:bg-[#222] transition-all">
                                            <td className="p-3 border-r border-[#333] text-white font-bold">{row.name}</td>
                                            <td className="p-3 text-right text-gray-300">{row.lbsPerGuest.toFixed(2)}</td>
                                            <td className="p-3 text-right text-gray-300">${row.costPerGuest.toFixed(2)}</td>
                                            <td className={`p-3 text-right font-bold ${row.impactYTD > 0 ? 'text-[#FF2A6D]' : 'text-[#00FF94]'}`}>
                                                {row.impactYTD > 0 ? '+' : ''}${row.impactYTD.toLocaleString()}
                                            </td>
                                            <td className="p-3 text-center">
                                                <div className={`w-2 h-2 rounded-full mx-auto ${row.impactYTD > 5000 ? 'bg-[#FF2A6D] animate-pulse' : row.impactYTD > 0 ? 'bg-orange-500' : 'bg-[#00FF94]'}`}></div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
                    <Zap className="w-12 h-12 text-[#333] animate-pulse" />
                    <p className="text-gray-600 font-mono text-[10px] uppercase tracking-[0.3em]">System analysis in standby...</p>
                </div>
            )}
        </div>
    );
};

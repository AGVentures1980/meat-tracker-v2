import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

interface ActionRecommendation {
    code: string;
    severity: string;
    title: string;
    description: string;
    financialImpactEstimateUSD: number;
    externalReferenceId: string;
    recommendation: string;
}

interface ExecutiveOverview {
    health: {
        operatingIntegrityScore: { value: number; confidence: string; sources: string[] };
        executiveRiskLevel: { value: string; confidence: string; sources: string[] };
        weeklyVarianceUSD: { value: number; confidence: string; sources: string[] };
        lbsPerGuestDiningRoom: { value: number; confidence: string; sources: string[] };
        storeIntegrityDegradation: { value: string; confidence: string; sources: string[] };
    };
    actionPanel: ActionRecommendation[];
}

export const ExecutiveDashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [data, setData] = useState<ExecutiveOverview | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Feature Flag mode
    const isPilotMode = true;

    useEffect(() => {
        const fetchOverview = async () => {
            try {
                const response = await axios.get('/api/v1/executive/overview/cache', {
                    headers: { 'Authorization': `Bearer ${user?.token}` }
                });
                setData(response.data.data);
            } catch (err: any) {
                setError(err.response?.data?.error || err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchOverview();
    }, [user?.token]);

    const handleActionClick = (action: ActionRecommendation, decision: string) => {
        console.log(`Action Logged: ${decision} for ${action.code}`);
        setData(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                actionPanel: prev.actionPanel.filter(a => a.code !== action.code)
            };
        });
    };

    if (loading) return <div className="p-8 text-[#C5A059] flex animate-pulse">Establishing Secure Executive Connection...</div>;
    if (error) return <div className="p-8 text-red-500 border border-red-500 bg-red-900 bg-opacity-20">SECURITY ABORT: {error}</div>;
    if (!data) return null;

    return (
        <div className="p-4 md:p-8 min-h-screen bg-[#070707] text-[#E0E0E0] font-sans selection:bg-[#C5A059] selection:text-black">
            
            <div className="mb-8 border-b border-[#222] pb-6 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-light text-white uppercase tracking-wider mb-2">Command Center</h1>
                    <div className="text-xs text-[#888] flex items-center space-x-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        <span>Zero-Trust Link Active</span>
                        <span className="px-2">|</span>
                        {isPilotMode && <span className="bg-[#C5A059] text-black px-2 py-0.5 rounded font-bold uppercase text-[10px]">Pilot Mode</span>}
                    </div>
                </div>
                <div 
                    onClick={() => navigate('/executive-analyst?metric=integrity')}
                    className="text-right cursor-pointer hover:opacity-80 transition-opacity"
                >
                    <p className="text-sm text-[#888]">Operating Integrity</p>
                    <p className={`text-4xl font-bold ${data.health.operatingIntegrityScore.value > 90 ? 'text-green-500' : 'text-[#C5A059]'}`}>
                        {data.health.operatingIntegrityScore.value}%
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-6">
                    <div 
                        onClick={() => navigate('/executive-analyst?metric=variance')}
                        className="bg-[#111] border border-[#333] p-6 rounded-lg shadow-2xl hover:border-red-900 transition-colors duration-300 cursor-pointer"
                    >
                        <p className="text-[#888] text-xs uppercase tracking-widest mb-1">Weekly Capital Bleed</p>
                        <h2 className={`text-5xl font-light mb-2 tracking-tight ${data.health.weeklyVarianceUSD.value > 500 ? 'text-red-500' : 'text-white'}`}>
                            ${data.health.weeklyVarianceUSD.value}
                        </h2>
                        <div className="flex items-center text-[10px] uppercase text-[#666] tracking-wider mt-4">
                            <span className="border border-[#333] px-1.5 py-0.5 rounded">Confidence: {data.health.weeklyVarianceUSD.confidence}</span>
                        </div>
                    </div>

                    <div 
                        onClick={() => navigate('/executive-analyst?metric=lbs_pax')}
                        className="bg-[#111] border border-[#333] p-6 rounded-lg shadow-2xl cursor-pointer hover:border-[#666]"
                    >
                        <p className="text-[#888] text-xs uppercase tracking-widest mb-1">A La Carte Compass (Lbs/Pax)</p>
                        <h2 className="text-4xl font-light text-white mb-2">{data.health.lbsPerGuestDiningRoom.value ?? '-.-'} <span className="text-xl text-[#666]">Lbs</span></h2>
                        {data.health.lbsPerGuestDiningRoom.value && data.health.lbsPerGuestDiningRoom.value > 2.0 && (
                            <p className="text-red-400 text-xs mt-2">↑ Anomaly Driven By Heavy Shrink</p>
                        )}
                    </div>

                    <div 
                        onClick={() => navigate('/executive-analyst?metric=risk')}
                        className={`bg-[#111] border ${data.health.executiveRiskLevel.value === 'CRITICAL' ? 'border-red-600' : 'border-[#333]'} p-6 rounded-lg shadow-2xl cursor-pointer hover:opacity-80`}
                    >
                        <p className="text-[#888] text-xs uppercase tracking-widest mb-1">Governance Status</p>
                        <h2 className={`text-3xl uppercase font-bold tracking-widest ${data.health.executiveRiskLevel.value === 'CRITICAL' ? 'text-red-500' : 'text-green-500'}`}>
                            {data.health.executiveRiskLevel.value}
                        </h2>
                    </div>
                </div>

                {/* Right Column: The Action Panel */}
                <div className="lg:col-span-2">
                    <div className="bg-[#111] border border-[#333] rounded-lg shadow-2xl overflow-hidden min-h-full">
                        <div className="bg-[#1A1A1A] p-4 text-xs font-bold text-[#888] uppercase tracking-widest border-b border-[#333] flex justify-between">
                            <span>Pending Decisions</span>
                            <span>{data.actionPanel.length} Open</span>
                        </div>
                        
                        <div className="p-0">
                            {data.actionPanel.length === 0 ? (
                                <div className="p-12 text-center text-[#555]">
                                    <div className="w-16 h-16 border border-[#333] rounded-full flex items-center justify-center mx-auto mb-4">
                                        <svg className="w-6 h-6 text-[#444]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <p className="uppercase tracking-widest text-sm">No Pending Operations</p>
                                </div>
                            ) : (
                                <ul className="divide-y divide-[#222]">
                                    {data.actionPanel.map((action, idx) => (
                                        <li key={idx} className="p-6 hover:bg-[#151515] transition-colors relative group">
                                            {action.severity === 'CRITICAL' && (
                                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-600"></div>
                                            )}
                                            {action.severity === 'HIGH' && (
                                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500"></div>
                                            )}
                                            
                                            <div className="flex justify-between items-start mb-2">
                                                <h3 className="text-xl font-medium text-white">{action.title}</h3>
                                                <span className="text-[#C5A059] font-mono text-sm border border-[#333] px-2 py-1 rounded bg-[#222]">
                                                    Impact: ~${action.financialImpactEstimateUSD}
                                                </span>
                                            </div>
                                            
                                            <p className="text-[#999] text-sm mb-4 leading-relaxed max-w-2xl">
                                                {action.description}
                                            </p>

                                            <div className="bg-[#1a1a1a] p-4 rounded border border-[#333] mb-4">
                                                <span className="text-xs uppercase text-[#666] tracking-widest block mb-1">Recommendation</span>
                                                <p className="text-[#E0E0E0] text-sm">{action.recommendation}</p>
                                            </div>

                                            <div className="flex space-x-3 mt-4">
                                                <button onClick={() => handleActionClick(action, 'APPROVED')} className="bg-[#C5A059] text-black px-5 py-2 text-sm font-bold uppercase tracking-wider hover:bg-white transition-colors rounded-sm shadow-lg">
                                                    Approve Execution
                                                </button>
                                                <button onClick={() => handleActionClick(action, 'FORWARDED')} className="bg-transparent text-white border border-[#444] px-5 py-2 text-sm font-medium uppercase tracking-wider hover:border-white transition-colors rounded-sm">
                                                    Forward to Area Manager
                                                </button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
    AlertOctagon, 
    CheckCircle2, 
    AlertTriangle, 
    TrendingDown, 
    TrendingUp,
    MapPin,
    ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function JVPDashboard() {
    const { user, selectedCompany } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);

    // Mock JVP Region Data (To be replaced with real backend fetch filtering by User.region or AreaManager)
    const [regionData] = useState({
        regionName: "Texas North - Region 42",
        jvpName: user?.first_name ? `${user.first_name} ${user.last_name}` : "Regional Director",
        totalStores: 14,
        criticalStores: 2,
        warningStores: 3,
        passingStores: 9,
        stores: [
            { id: 101, name: "Addison #3102", status: "PASS", variancePct: 1.2, ghostMathSavings: 340.50, amName: "John Smith" },
            { id: 102, name: "Dallas Galleria #1150", status: "FAIL", variancePct: 6.8, ghostMathSavings: -1200.00, amName: "Sarah Connor" },
            { id: 103, name: "Plano #4099", status: "PASS", variancePct: 0.5, ghostMathSavings: 560.20, amName: "Mike Johnson" },
            { id: 104, name: "Frisco #2210", status: "REVIEW", variancePct: 3.1, ghostMathSavings: -150.00, amName: "Amanda Reed" },
            { id: 105, name: "McKinney #5011", status: "PASS", variancePct: 1.8, ghostMathSavings: 210.00, amName: "David Kim" },
            { id: 106, name: "Allen #6022", status: "FAIL", variancePct: 8.2, ghostMathSavings: -1500.00, amName: "Chris Evans" },
            { id: 107, name: "Richardson #7033", status: "REVIEW", variancePct: 4.5, ghostMathSavings: -300.00, amName: "Laura Croft" },
        ]
    });

    useEffect(() => {
        // Simulate API Load
        setTimeout(() => setLoading(false), 800);
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C5A059]"></div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
            
            {/* Header: JVP Profile */}
            <div className="bg-[#1a1a1a] border border-white/5 rounded-2xl p-6 md:p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                    <MapPin className="w-64 h-64" />
                </div>
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
                    <div>
                        <p className="text-[#C5A059] text-xs font-bold tracking-widest uppercase mb-1">Joint Venture Partner Dashboard</p>
                        <h1 className="text-3xl md:text-4xl font-black text-white">{regionData.regionName}</h1>
                        <p className="text-gray-400 mt-2">Managing Director: <span className="text-white font-medium">{regionData.jvpName}</span></p>
                    </div>
                    
                    <div className="flex gap-4">
                        <div className="bg-black/50 border border-white/10 rounded-xl p-4 text-center min-w-[120px]">
                            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1">Total Stores</p>
                            <p className="text-3xl font-black text-white">{regionData.totalStores}</p>
                        </div>
                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center min-w-[120px]">
                            <p className="text-[10px] text-red-500 uppercase tracking-widest font-bold mb-1">EOD Critical Failures</p>
                            <p className="text-3xl font-black text-red-500 animate-pulse">{regionData.criticalStores}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Ghost Math Global Analytics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#121212] border border-white/5 rounded-xl p-6 hover:bg-[#1a1a1a] transition-all">
                    <div className="flex items-center gap-3 mb-4">
                        <CheckCircle2 className="w-6 h-6 text-[#00FF94]" />
                        <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider">Stores in Compliance</h3>
                    </div>
                    <p className="text-4xl font-black text-white">{regionData.passingStores} <span className="text-sm text-gray-500 font-medium">/ {regionData.totalStores}</span></p>
                    <p className="text-xs text-gray-500 mt-2">Under 2% Meat Variance</p>
                </div>

                <div className="bg-[#121212] border border-white/5 rounded-xl p-6 hover:bg-[#1a1a1a] transition-all">
                    <div className="flex items-center gap-3 mb-4">
                        <AlertTriangle className="w-6 h-6 text-[#FFD700]" />
                        <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider">Manager Review Needed</h3>
                    </div>
                    <p className="text-4xl font-black text-white">{regionData.warningStores}</p>
                    <p className="text-xs text-[#FFD700] mt-2">2% - 5% Meat Variance Detected</p>
                </div>

                <div className="bg-[#121212] border border-red-500/20 rounded-xl p-6 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <AlertOctagon className="w-6 h-6 text-red-500" />
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Critical Theft/Waste</h3>
                        </div>
                        <span className="px-2 py-1 bg-red-500/20 text-red-500 text-[10px] font-bold uppercase rounded">Action Req</span>
                    </div>
                    <p className="text-4xl font-black text-red-500">{regionData.criticalStores}</p>
                    <p className="text-xs text-gray-400 mt-2">Over 5% Meat Variance (Ghost Math Failed)</p>
                </div>
            </div>

            {/* Traffic Light Store List */}
            <div className="bg-[#1a1a1a] rounded-xl border border-white/5 overflow-hidden">
                <div className="p-6 border-b border-white/5 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-white uppercase tracking-widest">Regional Store Traffic Light</h2>
                    <span className="text-xs text-gray-500 font-mono">End of Shift Audits</span>
                </div>

                <div className="divide-y divide-white/5">
                    {regionData.stores.sort((a,b) => b.variancePct - a.variancePct).map(store => (
                        <div key={store.id} className="p-4 md:p-6 flex flex-col md:flex-row items-center justify-between gap-4 hover:bg-white/5 transition-colors group">
                            
                            <div className="flex items-center gap-4 w-full md:w-auto">
                                <div className={`w-3 h-3 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)] ${
                                    store.status === 'PASS' ? 'bg-[#00FF94] shadow-[#00FF94]/50' :
                                    store.status === 'REVIEW' ? 'bg-[#FFD700] shadow-[#FFD700]/50' :
                                    'bg-[#FF2A6D] shadow-[#FF2A6D]/80 animate-pulse'
                                }`}></div>
                                <div>
                                    <h3 className="text-lg font-bold text-white group-hover:text-[#C5A059] transition-colors cursor-pointer">{store.name}</h3>
                                    <p className="text-xs text-gray-500">Managing Partner: <span className="text-gray-300">{store.amName}</span></p>
                                </div>
                            </div>

                            <div className="flex items-center gap-8 w-full md:w-auto">
                                <div className="text-right">
                                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">Meat Variance</p>
                                    <p className={`text-xl font-black font-mono ${
                                        store.status === 'PASS' ? 'text-[#00FF94]' :
                                        store.status === 'REVIEW' ? 'text-[#FFD700]' :
                                        'text-[#FF2A6D]'
                                    }`}>
                                        {store.variancePct}%
                                    </p>
                                </div>

                                <div className="text-right min-w-[120px]">
                                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">Financial Impact</p>
                                    <p className={`text-lg font-bold flex items-center justify-end gap-1 ${store.ghostMathSavings < 0 ? 'text-red-400' : 'text-[#00FF94]'}`}>
                                        {store.ghostMathSavings < 0 ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                                        ${Math.abs(store.ghostMathSavings).toFixed(2)}
                                    </p>
                                </div>

                                <button 
                                    onClick={() => navigate(`/dashboard/${store.id}`)}
                                    className="p-3 bg-black/50 border border-white/10 rounded-lg hover:border-[#C5A059] hover:bg-[#C5A059]/10 transition-all"
                                >
                                    <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-[#C5A059]" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

        </div>
    );
}

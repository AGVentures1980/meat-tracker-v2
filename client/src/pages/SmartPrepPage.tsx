
import { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/layouts/DashboardLayout';
import { Users, ChefHat, Scale } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const SmartPrepPage = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [forecast, setForecast] = useState<number>(150);
    const [prepData, setPrepData] = useState<any>(null);

    // Debounce forecast updates to avoid API spam
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchPrepData();
        }, 500);
        return () => clearTimeout(timer);
    }, [forecast]);

    const fetchPrepData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('auth_token');
            // Allow forecast override via query param
            const res = await fetch(`/api/v1/dashboard/smart-prep?guests=${forecast}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setPrepData(data);
                // Only set forecast from API if we haven't touched it? 
                // Actually, the API returns what we sent or its default. 
                // Let's just trust the response data for display, but keep input controlled.
                if (!prepData) { // Initial load
                    setForecast(data.forecast_guests);
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="p-6 max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                            <ChefHat className="w-8 h-8 text-[#00FF94]" />
                            Smart Prep
                        </h1>
                        <p className="text-gray-500 text-sm mt-1 font-mono uppercase tracking-wider">Kitchen Production Guide</p>
                    </div>
                    <div className="text-right">
                        <div className="text-sm text-gray-400">Target</div>
                        <div className="text-xl font-bold text-[#00FF94] font-mono">{prepData?.target_lbs_guest || '1.76'} <span className="text-xs text-gray-500">LBS/GUEST</span></div>
                    </div>
                </div>

                {/* Control Panel */}
                <div className="bg-[#1a1a1a] border border-[#333] rounded-lg p-6 mb-8 shadow-xl">
                    <div className="flex flex-col md:flex-row items-center gap-8">

                        <div className="bg-[#252525] p-4 rounded w-full md:w-auto text-center min-w-[200px]">
                            <h3 className="text-gray-400 text-xs uppercase tracking-widest mb-1">Projected Guests</h3>
                            <div className="text-4xl font-black text-white flex items-center justify-center gap-2">
                                <Users className="w-6 h-6 text-gray-500" />
                                {forecast}
                            </div>
                        </div>

                        <div className="flex-1 w-full space-y-2">
                            <label className="text-sm text-gray-400 flex justify-between">
                                <span>Adjust Projection</span>
                                <span className="text-xs text-brand-gold">Real-time Recalculation</span>
                            </label>
                            <input
                                type="range"
                                min="50"
                                max="1000"
                                step="10"
                                value={forecast}
                                onChange={(e) => setForecast(parseInt(e.target.value))}
                                className="w-full h-2 bg-[#333] rounded-lg appearance-none cursor-pointer accent-[#00FF94]"
                            />
                            <div className="flex justify-between text-xs text-gray-600 font-mono">
                                <span>50</span>
                                <span>500</span>
                                <span>1000</span>
                            </div>
                        </div>

                        <div className="bg-[#252525] p-4 rounded w-full md:w-auto text-center min-w-[200px] border border-[#333]">
                            <h3 className="text-gray-400 text-xs uppercase tracking-widest mb-1">Total Meat Needed</h3>
                            <div className="text-3xl font-bold text-white flex items-center justify-center gap-2">
                                <Scale className="w-5 h-5 text-gray-500" />
                                {prepData ? Math.round(prepData.forecast_guests * prepData.target_lbs_guest) : 0} <span className="text-sm text-gray-500">LBS</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Prep Grid */}
                {loading && !prepData ? (
                    <div className="text-center py-20 text-gray-500">Calculating optimal prep levels...</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {prepData?.prep_list.map((item: any) => (
                            <div key={item.protein} className="bg-[#121212] border border-[#333] rounded p-4 hover:border-[#00FF94]/50 transition-colors group">
                                <div className="flex justify-between items-start mb-3">
                                    <h3 className="font-bold text-lg text-white group-hover:text-[#00FF94] transition-colors">{item.protein}</h3>
                                    <span className="text-xs bg-[#222] text-gray-400 px-2 py-1 rounded font-mono">{item.mix_percentage}</span>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex justify-between items-end border-b border-[#333] pb-2">
                                        <span className="text-xs text-gray-500 uppercase">Prep Qty</span>
                                        <div className="text-right">
                                            <div className="text-3xl font-black text-white leading-none">{Math.ceil(item.recommended_units)}</div>
                                            <div className="text-[10px] text-gray-500 uppercase mt-1">Pieces / Packs</div>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-gray-500">Total Weight</span>
                                        <span className="text-gray-300 font-mono">{item.recommended_lbs} lbs</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-gray-500">Avg Unit</span>
                                        <span className="text-gray-300 font-mono">{item.avg_weight} lbs</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { NavigationBreadcrumb } from '../../components/enterprise/NavigationBreadcrumb';
import { OutletInboundReconciliation } from '../../components/enterprise/OutletInboundReconciliation';
import { ForecastSubmissionForm } from '../../components/enterprise/ForecastSubmissionForm';
import { ActualCloseForm } from '../../components/enterprise/ActualCloseForm';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, BarChart, Bar, Legend } from 'recharts';
import { AlertCircle, TrendingDown, TrendingUp, Minus } from 'lucide-react';

export const OutletKPIDashboard = () => {
    const { outletSlug } = useParams();
    const { user } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const propertyName = location.state?.propertyName || 'Property';

    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [accuracy, setAccuracy] = useState<any>(null);
    const [showForecastForm, setShowForecastForm] = useState(false);
    const [showCloseForm, setShowCloseForm] = useState(false);

    const isChef = user?.role === 'executive_chef' || user?.role === 'kitchen_operator';

    useEffect(() => {
        const fetchKPI = async () => {
            try {
                const res = await fetch(`/api/v1/enterprise/outlet/${outletSlug}/kpi`, {
                    headers: { 'Authorization': `Bearer ${user?.token}` }
                });
                if (res.ok) {
                    const json = await res.json();
                    setData(json.data);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        const fetchAccuracy = async () => {
            const res = await fetch(`/api/v1/enterprise/outlet/${outletSlug}/forecast-accuracy`, {
                headers: { 'Authorization': `Bearer ${user?.token}` }
            });
            if (res.ok) setAccuracy((await res.json()).data);
        };
        fetchKPI();
        fetchAccuracy();
    }, [outletSlug, user]);

    if (loading) return <div className="p-8 text-[#C5A059] animate-pulse font-mono tracking-widest text-center">Loading Data Source...</div>;
    if (!data) return <div className="p-8 text-center text-red-500 font-mono">Outlet Not Found or Unauthorized</div>;

    const { today, trend, channels, flags, outlet } = data;
    const isRestaurant = outlet.type === 'RESTAURANT';
    const variance = today.target ? ((today.lbsGuest - today.target) / today.target) * 100 : 0;
    const varianceColor = variance > 15 ? 'text-red-500' : variance > 8 ? 'text-yellow-500' : 'text-green-500';

    return (
        <div className="max-w-7xl mx-auto py-8 text-white space-y-6">
            <NavigationBreadcrumb levels={[
                { label: 'Network', href: '/dashboard/network' },
                { label: propertyName, href: `/dashboard/property/${outlet.store_id}` },
                { label: outlet.name, href: '#' }
            ]} />

            <div className="flex justify-between items-start">
                <div className="flex items-center gap-4 mb-4">
                    <button onClick={() => navigate(`/dashboard/property/${outlet.store_id}`)} className="px-3 py-1.5 text-xs font-mono font-bold uppercase tracking-widest border border-[#333] hover:border-[#C5A059] text-gray-400 hover:text-[#C5A059] rounded transition-colors">&larr; Back</button>
                    <h1 className="text-2xl font-bold text-[#C5A059] tracking-widest uppercase pb-1">{outlet.name} / KPI</h1>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => { setShowForecastForm(!showForecastForm); setShowCloseForm(false); }} className="px-4 py-2 bg-[#C5A059] text-black font-bold tracking-widest uppercase rounded text-sm hover:opacity-90">
                        Submit Forecast
                    </button>
                    <button onClick={() => { setShowCloseForm(!showCloseForm); setShowForecastForm(false); }} className="px-4 py-2 bg-[#00FF94] text-black font-bold tracking-widest uppercase rounded text-sm hover:opacity-90">
                        Close Shift
                    </button>
                </div>
            </div>

            {showForecastForm && <ForecastSubmissionForm outletSlug={outletSlug!} onSuccess={() => setShowForecastForm(false)} />}
            {showCloseForm && <ActualCloseForm outletSlug={outletSlug!} onSuccess={() => setShowCloseForm(false)} />}

            {/* FLAGS (Inline) */}
            {flags.length > 0 && (
                <div className="flex flex-col gap-2">
                    {flags.includes('no_data') && (
                        <div className="bg-yellow-500/10 border border-yellow-500/50 p-3 rounded flex items-center gap-3">
                            <AlertCircle className="text-yellow-500 w-5 h-5" />
                            <span className="text-yellow-500 font-mono text-sm uppercase tracking-wider">Warning: No meat usage submitted today.</span>
                        </div>
                    )}
                    {flags.includes('no_guests') && (
                        <div className="bg-orange-500/10 border border-orange-500/50 p-3 rounded flex items-center gap-3">
                            <AlertCircle className="text-orange-500 w-5 h-5" />
                            <span className="text-orange-500 font-mono text-sm uppercase tracking-wider">Warning: Guest count missing for property.</span>
                        </div>
                    )}
                    {flags.includes('variance_critical') && (
                        <div className="bg-red-500/10 border border-red-500/50 p-3 rounded flex items-center gap-3">
                            <AlertCircle className="text-red-500 w-5 h-5" />
                            <span className="text-red-500 font-mono text-sm uppercase tracking-wider">Critical Alert: Consumption variance exceeded 15% threshold.</span>
                        </div>
                    )}
                </div>
            )}

            {/* SECTION A: KPI HEADER BAR */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-[#1a1a1a] p-4 border border-[#333] rounded overflow-visible relative">
                    <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">Lbs / Guest</div>
                    <div className="text-3xl font-bold text-white relative">
                        {today.lbsGuest.toFixed(2)}
                    </div>
                    {!isChef && (
                        <div className="text-xs text-gray-400 mt-2">Target: {today.target.toFixed(2)}</div>
                    )}
                </div>
                <div className="bg-[#1a1a1a] p-4 border border-[#333] rounded">
                    <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">Total Guests</div>
                    <div className="text-3xl font-bold text-white">{today.guests}</div>
                    <div className="text-xs text-gray-400 mt-2">Outlet Localized</div>
                </div>
                <div className="bg-[#1a1a1a] p-4 border border-[#333] rounded">
                    <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">Total Lbs</div>
                    <div className="text-3xl font-bold text-white">{today.lbs.toFixed(1)}</div>
                    <div className="text-xs text-gray-400 mt-2">Today</div>
                </div>
                {!isChef && (
                    <div className={`bg-[#1a1a1a] p-4 border border-[#333] rounded`}>
                        <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">Target Variance</div>
                        <div className={`text-3xl font-bold flex items-center gap-2 ${varianceColor}`}>
                            {variance > 0 ? <TrendingUp className="w-6 h-6" /> : variance < 0 ? <TrendingDown className="w-6 h-6" /> : <Minus className="w-6 h-6" />}
                            {Math.abs(variance).toFixed(1)}%
                        </div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                {/* SECTION B: 7-DAY TREND */}
                <div className="lg:col-span-2 bg-[#1a1a1a] border border-[#333] p-4 rounded h-[400px]">
                    <h2 className="text-sm text-[#C5A059] uppercase tracking-widest mb-4">7-Day Trend (Lbs/Guest)</h2>
                    <ResponsiveContainer width="100%" height="85%">
                        <LineChart data={trend}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                            <XAxis dataKey="day" stroke="#666" tick={{ fill: '#666', fontSize: 12 }} />
                            <YAxis stroke="#666" tick={{ fill: '#666', fontSize: 12 }} domain={['dataMin - 0.5', 'dataMax + 0.5']} />
                            <Tooltip contentStyle={{ backgroundColor: '#111', borderColor: '#333' }} />
                            {!isChef && <ReferenceLine y={today.target} stroke="#FF2A6D" strokeDasharray="5 5" />}
                            <Line type="monotone" dataKey="lbsGuest" stroke="#00FF94" strokeWidth={3} dot={{ r: 4, fill: '#00FF94' }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* SECTION C: CHANNEL CONSUMPTION */}
                {isRestaurant && (
                    <div className="flex flex-col gap-4">
                        <div className="bg-[#1a1a1a] border border-[#333] p-4 rounded flex-1">
                            <h2 className="text-sm text-[#C5A059] uppercase tracking-widest mb-4">Channel Breakdown</h2>
                            {channels && channels.length > 0 ? (
                                <ResponsiveContainer width="100%" height={200}>
                                    <BarChart data={channels}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                        <XAxis dataKey="source_type" stroke="#666" tick={{ fill: '#666', fontSize: 10 }} />
                                        <Tooltip contentStyle={{ backgroundColor: '#111', borderColor: '#333' }} />
                                        <Bar dataKey="_sum.lbs_total" fill="#C5A059" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-[200px] flex items-center justify-center text-gray-600 font-mono text-sm">No Channel Data</div>
                            )}
                        </div>
                        
                        <div className="bg-[#1a1a1a] border border-[#333] p-4 rounded h-[120px] flex flex-col justify-center">
                            <h2 className="text-xs text-gray-500 uppercase tracking-widest mb-3">Forecast Intelligence</h2>
                            <div className="flex justify-between items-center">
                                <div>
                                    <div className="text-[10px] text-gray-400 uppercase tracking-widest">Today's Fcst vs Actual</div>
                                    <div className="text-lg font-bold text-white">{today.guests || '--'} <span className="text-gray-500 font-normal">/</span> {data.today?.manager_forecast || '--'}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] text-gray-400 uppercase tracking-widest">Accuracy (30d)</div>
                                    <div className={`text-lg font-bold ${accuracy?.manager_accuracy_pct >= 90 ? 'text-[#00FF94]' : accuracy?.manager_accuracy_pct >= 80 ? 'text-yellow-500' : 'text-red-500'}`}>
                                        {accuracy?.manager_accuracy_pct ? accuracy.manager_accuracy_pct.toFixed(1) + '%' : '--%'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            
            {/* INBOUND SNAPSHOT FOR KITCHEN */}
            {outlet.type === 'KITCHEN' && (
                <div className="mt-6 h-[400px]">
                    <OutletInboundReconciliation outletSlug={outletSlug!} />
                </div>
            )}
        </div>
    );
};

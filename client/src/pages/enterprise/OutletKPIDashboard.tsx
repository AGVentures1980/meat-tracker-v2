import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { NavigationBreadcrumb } from '../../components/enterprise/NavigationBreadcrumb';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, BarChart, Bar, Legend } from 'recharts';
import { AlertCircle, TrendingDown, TrendingUp, Minus } from 'lucide-react';

export const OutletKPIDashboard = () => {
    const { outletSlug } = useParams();
    const { user } = useAuth();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

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
        fetchKPI();
    }, [outletSlug, user]);

    if (loading) return <div className="p-8 text-[#C5A059] animate-pulse font-mono tracking-widest text-center">Loading Data Source...</div>;
    if (!data) return <div className="p-8 text-center text-red-500 font-mono">Outlet Not Found or Unauthorized</div>;

    const { today, trend, channels, flags, outlet } = data;
    const isRestaurant = outlet.type === 'RESTAURANT';
    const variance = today.target ? ((today.lbsGuest - today.target) / today.target) * 100 : 0;
    const varianceColor = variance > 15 ? 'text-red-500' : variance > 8 ? 'text-yellow-500' : 'text-green-500';

    return (
        <div className="max-w-7xl mx-auto py-8 text-white space-y-6">
            <h1 className="text-2xl font-bold text-[#C5A059] tracking-widest uppercase pb-2">{outlet.name} / KPI</h1>
            <NavigationBreadcrumb />

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
                <div className="bg-[#1a1a1a] p-4 border border-[#333] rounded overflow-visible">
                    <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">Lbs / Guest</div>
                    <div className="text-3xl font-bold text-white relative">
                        {today.lbsGuest.toFixed(2)}
                    </div>
                    {!isChef && (
                        <div className="text-xs text-gray-400 mt-2">Target: {today.target.toFixed(2)}</div>
                    )}
                    <div className="text-[10px] text-yellow-500 mt-2 flex items-start gap-1 leading-tight">
                        <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                        <span>Guest count is property-wide. Outlet-level guest tracking coming in Phase 5.</span>
                    </div>
                </div>
                <div className="bg-[#1a1a1a] p-4 border border-[#333] rounded">
                    <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">Total Guests</div>
                    <div className="text-3xl font-bold text-white">{today.guests}</div>
                    <div className="text-xs text-gray-400 mt-2">Property-Wide Estimate</div>
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
                    <div className="bg-[#1a1a1a] border border-[#333] p-4 rounded h-[400px]">
                        <h2 className="text-sm text-[#C5A059] uppercase tracking-widest mb-4">Channel Breakdown</h2>
                        {channels && channels.length > 0 ? (
                            <ResponsiveContainer width="100%" height="85%">
                                <BarChart data={channels}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                    <XAxis dataKey="source_type" stroke="#666" tick={{ fill: '#666', fontSize: 10 }} />
                                    <Tooltip contentStyle={{ backgroundColor: '#111', borderColor: '#333' }} />
                                    <Bar dataKey="_sum.lbs_total" fill="#C5A059" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-600 font-mono text-sm">No Channel Data</div>
                        )}
                    </div>
                )}
            </div>
            
            {/* INBOUND SNAPSHOT FOR KITCHEN IN THE FUTURE OR IF EXTENDED (Dashboard 1 spec says KITCHEN skip channel, use inbound snapshot) */}
            {outlet.type === 'KITCHEN' && (
                <InboundSnapshot outletSlug={outletSlug!} />
            )}
        </div>
    );
};

const InboundSnapshot = ({ outletSlug }: { outletSlug: string }) => {
    const { user } = useAuth();
    const [snapshot, setSnapshot] = useState<any[]>([]);

    useEffect(() => {
        fetch(`/api/v1/enterprise/outlet/${outletSlug}/inbound-snapshot`, { headers: { 'Authorization': `Bearer ${user?.token}` } })
            .then(res => res.json())
            .then(data => { if (data.success) setSnapshot(data.data); });
    }, [outletSlug, user]);

    return (
        <div className="bg-[#1a1a1a] border border-[#333] p-4 rounded mt-6">
            <h2 className="text-sm text-[#C5A059] uppercase tracking-widest mb-4">Inbound Snapshot (Last 3 Boxes)</h2>
            <div className="space-y-2">
                {snapshot.length === 0 ? <div className="text-gray-500 font-mono text-sm py-4">No recent deliveries.</div> : snapshot.map((box, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-[#111] border border-[#222]">
                        <div className="font-bold text-gray-300">{box.product_code || box.scanned_barcode}</div>
                        <div className="text-[#00FF94] font-mono">{box.weight} lbs</div>
                        <div className="text-xs text-gray-500">{new Date(box.created_at).toLocaleDateString()}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}

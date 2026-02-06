
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { StatCard } from '../components/StatCard';
import { ManualEntryForm } from '../components/ManualEntryForm';
import { Modal } from '../components/Modal';
import { LucideIcon, Scale, Users, Trophy, Activity, LogOut, LayoutGrid, PlusCircle, Upload, Camera } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';

interface DashboardStats {
    totalLbsMonth: number;
    extraCustomers: number;
    dailyAverage: number;
    projectedTotal: number;
    topMeats: {
        name: string;
        value: number;
        actualPerGuest: number;
        goalPerGuest: number;
        variance: number;
    }[];
    weeklyChart: any[];
}

export const Dashboard = () => {
    const { user, logout } = useAuth();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [showManualModal, setShowManualModal] = useState(false);
    const [uploading, setUploading] = useState(false);

    const COLORS = ['#D4AF37', '#8B0000', '#333333']; // Gold, Red, Dark Gray

    const fetchStats = async () => {
        if (!user || !user.id) return;
        try {
            // Fetch from our new API
            const storeId = isNaN(parseInt(user.id)) ? 180 : user.id;
            const response = await fetch(`http://localhost:3001/api/v1/dashboard/${storeId}`, {
                headers: { 'Authorization': 'Bearer mock-token' }
            });
            if (response.ok) {
                const data = await response.json();
                setStats(data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, [user]);

    const handleManualSubmit = async (data: { type: string; lbs: number; date: string }) => {
        try {
            const response = await fetch('http://localhost:3001/api/v1/orders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer mock-token'
                },
                body: JSON.stringify({
                    store_id: isNaN(parseInt(user?.id || "0")) ? 180 : parseInt(user?.id || "0"), // Fallback to Tampa (180) for Master testing
                    source: 'Manual',
                    order_date: data.date,
                    items: [
                        { item_name: data.type, lbs: data.lbs }
                    ]
                })
            });

            if (response.ok) {
                setShowManualModal(false);
                fetchStats(); // Refresh data
            } else {
                alert("Failed to save entry");
            }
        } catch (err) {
            console.error(err);
            alert("Error saving entry");
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'OLO' | 'Ticket') => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('store_id', (isNaN(parseInt(user?.id || "0")) ? 180 : parseInt(user?.id || "0")).toString());
        formData.append('type', type);

        try {
            const response = await fetch('http://localhost:3001/api/v1/upload', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer mock-token'
                },
                body: formData
            });

            if (response.ok) {
                const result = await response.json();
                alert(`${type} Upload Successful!\n${result.message}`);
                fetchStats();
            } else {
                alert("Upload failed");
            }
        } catch (error) {
            console.error(error);
            alert("Error uploading file");
        } finally {
            setUploading(false);
            // Clear input
            e.target.value = '';
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center text-brand-gold">
                <div className="animate-pulse flex flex-col items-center">
                    <Activity className="w-10 h-10 mb-4 animate-spin" />
                    <p className="font-serif tracking-widest uppercase text-sm">Loading Intelligence...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white pb-20 font-sans">
            {/* Header */}
            <header className="bg-black border-b border-white/10 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-20">
                        <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-gradient-to-br from-red-800 to-red-900 rounded-lg flex items-center justify-center shadow-lg shadow-red-900/20">
                                <span className="font-serif font-bold text-white text-lg">TB</span>
                            </div>
                            <div>
                                <h1 className="font-serif font-bold tracking-widest text-lg text-brand-gold">BRASA</h1>
                                <p className="text-[10px] uppercase tracking-[0.3em] text-gray-500">Meat Intelligence</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-6">
                            <div className="px-4 py-1.5 bg-white/5 rounded-full border border-white/10 text-xs tracking-wide">
                                <span className="text-gray-400 uppercase mr-2">Unit</span>
                                <span className="text-white font-bold">#{user?.id} {user?.name}</span>
                            </div>
                            <button onClick={logout} className="text-gray-500 hover:text-white transition-colors">
                                <LogOut className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">

                {/* Welcome */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-white/5 pb-8">
                    <div>
                        <h2 className="text-3xl font-serif text-white mb-2">Performance Overview</h2>
                        <p className="text-gray-400 text-sm font-light tracking-wide">Real-time consumption analytics and projections.</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setShowManualModal(true)}
                            className="flex items-center space-x-2 bg-white/10 text-white px-4 py-2 rounded-lg font-bold hover:bg-white/20 transition-colors border border-white/10 uppercase text-xs tracking-wider"
                        >
                            <PlusCircle className="w-4 h-4" />
                            <span>Add New Entry</span>
                        </button>

                        <label className="flex items-center space-x-2 bg-brand-gold text-black px-4 py-2 rounded-lg font-bold hover:bg-yellow-500 transition-colors cursor-pointer uppercase text-xs tracking-wider">
                            <Upload className="w-4 h-4" />
                            <span>Import OLO</span>
                            <input type="file" accept=".csv" className="hidden" onChange={(e) => handleFileUpload(e, 'OLO')} disabled={uploading} />
                        </label>

                        <label className="flex items-center space-x-2 bg-brand-red text-white px-4 py-2 rounded-lg font-bold hover:bg-red-700 transition-colors cursor-pointer uppercase text-xs tracking-wider">
                            <Camera className="w-4 h-4" />
                            <span>Scan Ticket</span>
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'Ticket')} disabled={uploading} />
                        </label>
                    </div>
                </div>

                {/* KPI Grid */}
                {stats && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard
                            title="Month Volume"
                            value={`${stats.totalLbsMonth.toLocaleString()} lbs`}
                            subtext="Total consumption"
                            icon="scale"
                        />
                        <StatCard
                            title="Extra Customers"
                            value={`+${stats.extraCustomers}`}
                            subtext="Based on 0.5lb avg"
                            icon="users"
                            highlight={true}
                        />
                        <StatCard
                            title="Daily Average"
                            value={`${stats.dailyAverage} lbs`}
                            subtext="Actual daily usage"
                            icon="activity"
                        />
                        <StatCard
                            title="Proj. Month End"
                            value={`${stats.projectedTotal.toLocaleString()} lbs`}
                            subtext="At current pace"
                            icon="trophy"
                        />
                    </div>
                )}

                {/* Charts Area */}
                {stats && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Main Chart (Weekly Trends) */}
                        <div className="lg:col-span-2 bg-[#1E1E1E] rounded-xl p-6 border border-white/5">
                            <h3 className="text-lg font-bold mb-6 font-serif tracking-wide text-white">Weekly Consumption Trends (Top 3)</h3>
                            <div className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={stats.weeklyChart}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                        <XAxis dataKey="day" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '8px' }}
                                            itemStyle={{ color: '#fff' }}
                                        />
                                        <Legend />
                                        {stats.topMeats.map((meat, index) => (
                                            <Bar
                                                key={meat.name}
                                                dataKey={meat.name}
                                                stackId="a"
                                                fill={COLORS[index % COLORS.length]}
                                                radius={[4, 4, 0, 0]}
                                            />
                                        ))}
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Secondary Chart (Ideal Meat Consumption) */}
                        <div className="bg-[#1E1E1E] rounded-xl p-6 border border-white/5">
                            <h3 className="text-lg font-bold mb-6 font-serif tracking-wide text-white">Ideal Meat Consumption</h3>
                            <div className="space-y-6">
                                {stats.topMeats.map((meat, index) => (
                                    <div key={meat.name} className="group">
                                        <div className="flex justify-between items-end mb-2">
                                            <div>
                                                <span className="text-white font-bold tracking-wide block">{meat.name}</span>
                                                <span className="text-xs text-gray-500">
                                                    Goal: <span className="text-gray-300">{meat.goalPerGuest.toFixed(2)}</span> / Actual: <span className={meat.variance > 0.05 ? 'text-red-400' : 'text-green-400'}>{meat.actualPerGuest.toFixed(2)}</span>
                                                </span>
                                            </div>
                                            <div className="text-right">
                                                <span className="font-mono text-brand-gold text-lg">{meat.value.toFixed(0)} lbs</span>
                                                <div className={`text-[10px] font-bold uppercase tracking-widest ${meat.variance > 0.05 ? 'text-red-500' : meat.variance < -0.05 ? 'text-blue-500' : 'text-green-500'}`}>
                                                    {meat.variance > 0.05 ? 'Over' : meat.variance < -0.05 ? 'Under' : 'Ideal'}
                                                </div>
                                            </div>
                                        </div>
                                        {/* Progress Bar: Base is Goal (100%), Actual is relative */}
                                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden relative">
                                            {/* Goal Marker (Virtual) */}
                                            <div
                                                className={`h-full rounded-full transition-all duration-1000 ease-out ${meat.variance > 0.05 ? 'bg-red-600' : 'bg-green-600'}`}
                                                style={{ width: `${Math.min((meat.actualPerGuest / (meat.goalPerGuest * 1.5)) * 100, 100)}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

            </main>

            <Modal title="Add Manual Entry" isOpen={showManualModal} onClose={() => setShowManualModal(false)}>
                <ManualEntryForm onSubmit={handleManualSubmit} onClose={() => setShowManualModal(false)} />
            </Modal>
        </div>
    );
};

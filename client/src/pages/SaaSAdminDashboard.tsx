import {
    Users,
    DollarSign,
    CreditCard,
    ShieldCheck,
    ArrowUpRight,
    Briefcase,
    Zap,
    LayoutDashboard,
    Building2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AIProspectingEngine } from '../components/SaaS/AIProspectingEngine';

export const SaaSAdminDashboard = () => {
    const navigate = useNavigate();

    const stats = [
        { label: 'Active Companies', value: '12', trend: '+2 this month', icon: Building2, color: 'text-blue-400' },
        { label: 'Total Stores', value: '48', trend: '+15% growth', icon: LayoutDashboard, color: 'text-[#C5A059]' },
        { label: 'Monthly Revenue', value: '$24,500', trend: 'Reached target!', icon: DollarSign, color: 'text-green-400' },
        { label: 'Active Users', value: '1,240', trend: '98% uptime', icon: Users, color: 'text-purple-400' }
    ];

    const growthMetrics = [
        { month: 'Jan', revenue: 15.2, users: 800 },
        { month: 'Feb', revenue: 18.5, users: 950 },
        { month: 'Mar', revenue: 22.1, users: 1100 },
        { month: 'Apr', revenue: 24.5, users: 1240 }
    ];

    return (
        <div className="min-h-screen bg-[#050505] p-8 font-sans">
            <div className="max-w-7xl mx-auto">
                {/* Upper Navbar */}
                <div className="flex justify-between items-center mb-12">
                    <div>
                        <h1 className="text-3xl font-black text-white tracking-tighter flex items-center gap-3">
                            <ShieldCheck className="text-[#FF2A6D]" />
                            PLATFORM <span className="opacity-50">HUB</span>
                        </h1>
                        <p className="text-gray-500 text-[10px] uppercase tracking-widest font-bold">System Advisor Console v4.3.0</p>
                    </div>
                    <button
                        onClick={() => navigate('/select-company')}
                        className="px-6 py-2 bg-white/5 border border-white/10 text-white rounded-full text-xs font-bold hover:bg-white/10 transition-all flex items-center gap-2"
                    >
                        Switch to Company View <ArrowUpRight size={14} />
                    </button>
                </div>

                {/* Big Cards Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                    {stats.map((s, i) => (
                        <div key={i} className="bg-[#111] border border-white/5 p-6 rounded-3xl relative overflow-hidden group hover:border-[#C5A059]/30 transition-all">
                            <div className="flex justify-between items-start mb-4">
                                <div className={`p-3 rounded-2xl bg-white/5 ${s.color}`}>
                                    <s.icon size={20} />
                                </div>
                                <span className="text-[10px] font-bold text-gray-600 uppercase tracking-tighter">{s.trend}</span>
                            </div>
                            <h3 className="text-gray-400 text-xs font-bold uppercase mb-1">{s.label}</h3>
                            <p className="text-3xl font-black text-white">{s.value}</p>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Panel: Growth Chart (Mock) */}
                    <div className="lg:col-span-2 bg-[#111] border border-white/5 rounded-3xl p-8">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-xl font-bold text-white tracking-tight">System Growth (Revenue)</h3>
                            <div className="flex gap-2">
                                <span className="px-3 py-1 bg-green-400/10 text-green-400 text-[10px] font-bold rounded-full">LIVE DATA</span>
                            </div>
                        </div>
                        <div className="h-64 flex items-end gap-4">
                            {growthMetrics.map((m, i) => (
                                <div key={i} className="flex-1 flex flex-col items-center gap-4 group">
                                    <div
                                        className="w-full bg-gradient-to-t from-[#C5A059] to-[#D5B069] rounded-t-xl transition-all duration-700 group-hover:shadow-[0_0_30px_rgba(197,160,89,0.3)]"
                                        style={{ height: `${(m.revenue / 25) * 100}%` }}
                                    ></div>
                                    <span className="text-gray-600 font-mono text-[10px] font-bold uppercase">{m.month}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right Panel: Modules */}
                    <div className="space-y-6">
                        {/* Payment Integration Card */}
                        <div className="bg-gradient-to-br from-[#1a1a1a] to-[#050505] border border-white/5 rounded-3xl p-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <CreditCard size={100} className="text-white" />
                            </div>
                            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                                <Zap className="text-[#C5A059] fill-[#C5A059]" size={16} /> Payment Gateway
                            </h3>
                            <div className="flex items-center gap-4 bg-white/5 border border-white/10 p-4 rounded-2xl mb-4">
                                <div className="h-10 w-16 bg-[#1a1a1a] rounded-lg border border-white/10 flex items-center justify-center">
                                    <div className="w-8 h-8 rounded-full bg-[#6772E5] shadow-lg"></div>
                                </div>
                                <div>
                                    <p className="text-white text-xs font-bold">Stripe Integrated</p>
                                    <p className="text-[9px] text-gray-500 font-mono">ID: ACC_9281_REALTIME</p>
                                </div>
                            </div>
                            <button className="w-full py-3 bg-[#C5A059] text-black text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-[#D5B069] transition-all">
                                Manage Payouts
                            </button>
                        </div>

                        {/* HR / Corporate Placeholder */}
                        <div className="bg-[#111] border border-white/5 rounded-3xl p-6 opacity-60 grayscale hover:grayscale-0 transition-all cursor-not-allowed group">
                            <h3 className="text-white font-bold mb-2 flex items-center gap-2">
                                <Briefcase size={16} className="text-gray-500 group-hover:text-blue-400" /> HR & Payroll
                            </h3>
                            <p className="text-gray-500 text-[10px] leading-relaxed">
                                Centralized employee management and payroll automation. (Unlocks v4.4)
                            </p>
                            <div className="mt-4 flex gap-2">
                                <div className="h-1.5 w-12 bg-white/10 rounded-full"></div>
                                <div className="h-1.5 w-12 bg-white/10 rounded-full"></div>
                                <div className="h-1.5 w-12 bg-white/10 rounded-full"></div>
                            </div>
                        </div>
                    </div>

                    {/* Full Width AI Prospecting Engine */}
                    <div className="lg:col-span-3 mt-12 bg-[#050505] border border-white/5 p-8 rounded-[40px] shadow-2xl">
                        <AIProspectingEngine />
                    </div>
                </div>
            </div>
        </div>
    );
};


import React, { useState, useEffect } from 'react';
import {
    LayoutDashboard,
    TrendingUp,
    Settings,
    LogOut,
    Menu,
    ChefHat,
    StickyNote,
    ArrowUpRight,
    AlertTriangle,
    Users,
    Network,
    DollarSign,
    Trash,
    Truck,
    Zap,
    Calendar
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface DashboardLayoutProps {
    children: React.ReactNode;
}

import { useLanguage } from '../../context/LanguageContext';

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
    const { logout, user } = useAuth();
    const { t } = useLanguage();
    const location = useLocation();
    const [collapsed, setCollapsed] = useState(false);
    const [showAlerts, setShowAlerts] = useState(false);
    const [showProfileMenu, setShowProfileMenu] = useState(false);

    const navigate = useNavigate();

    const navItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
        { icon: TrendingUp, label: 'Projections', path: '/projections' },
        { icon: Calendar, label: 'Forecast', path: '/forecast' },
        { icon: StickyNote, label: 'Reports', path: '/reports' },
        { icon: ArrowUpRight, label: 'Meat Prices', path: '/prices' },
        { id: 'smart-prep', label: 'Smart Prep', icon: ChefHat, path: '/smart-prep' },
        { id: 'delivery', label: 'Delivery (OLO)', icon: Truck, path: '/delivery' },
        { id: 'waste', label: 'Waste Log', icon: Trash, path: '/waste' },
        { id: 'settings', label: 'Settings', icon: Settings, path: '/settings' }
    ];

    const [alerts, setAlerts] = useState([
        { id: 1, type: 'WARNING', time: '2m ago', message: 'Inventory Variance Detected: Dallas (1.89 vs 1.76 Target). Action Required.', path: '/dashboard/1', color: '#FF9F1C' },
        { id: 2, type: 'INFO', time: '15m ago', message: 'OLO Sync Latency > 300ms. Operations normal but monitoring.', path: '/reports', color: 'gray-400' },
        { id: 3, type: 'REMINDER', time: '1h ago', message: 'Weekly Close Pending for 3 Stores. Due by 5:00 PM EST.', path: '/dashboard', color: 'gray-400' }
    ]);

    const handleAlertClick = (id: number, path: string) => {
        setAlerts(prev => prev.filter(a => a.id !== id));
        setShowAlerts(false);
        navigate(path);
    };

    const [networkStats, setNetworkStats] = useState({
        system_sales: 0,
        active_stores: 0,
        system_labor: 0,
        active_alerts: 0,
        status: 'OFFLINE'
    });

    useEffect(() => {
        const fetchHealth = async () => {
            if (!user?.token) return;
            try {
                const res = await fetch('/api/v1/dashboard/network-health', {
                    headers: { 'Authorization': `Bearer ${user.token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setNetworkStats(data);
                }
            } catch (err) {
                console.error("Failed to fetch network health", err);
            }
        };

        fetchHealth();
        // Poll every 60 seconds
        const interval = setInterval(fetchHealth, 60000);
        return () => clearInterval(interval);
    }, [user]);

    return (
        <div className="flex h-screen bg-[#121212] text-white font-sans overflow-hidden">
            {/* Sidebar (Desktop Only) */}
            <aside className={`${collapsed ? 'w-16' : 'w-64'} bg-[#1a1a1a] border-r border-[#333] transition-all duration-300 hidden md:flex flex-col print:hidden`}>
                <div className="p-4 border-b border-[#333] flex items-center justify-between">
                    {!collapsed && (
                        <div className="flex items-center gap-2">
                            <span className="text-xl font-bold tracking-tighter text-[#C5A059]">BRASA</span>
                            <span className="text-xs text-gray-500 uppercase tracking-widest">INTEL</span>
                        </div>
                    )}
                    <button onClick={() => setCollapsed(!collapsed)} className="p-1 hover:bg-[#333] rounded">
                        <Menu className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
                    {navItems.map((item) => {
                        const active = location.pathname.includes(item.path.split('/')[1]);
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`w-full flex items-center gap-3 p-3 rounded transition-colors ${active
                                    ? 'bg-[#C5A059]/10 text-[#C5A059] border-l-2 border-[#C5A059]'
                                    : 'text-gray-400 hover:bg-[#2a2a2a] hover:text-white'
                                    } `}
                            >
                                <item.icon className="w-5 h-5 min-w-[20px]" />
                                {!collapsed && <span className="text-sm font-medium tracking-wide">{item.label}</span>}
                            </Link>
                        );
                    })}


                    {/* Executive View (Admin/Director Only) */}
                    {(user?.role === 'admin' || user?.role === 'director' || user?.email?.includes('admin')) && (
                        <>
                            <Link
                                to="/executive"
                                className={`w-full flex items-center gap-3 p-3 rounded transition-colors ${location.pathname === '/executive'
                                    ? 'bg-[#FF2A6D]/10 text-[#FF2A6D] border-l-2 border-[#FF2A6D]'
                                    : 'text-gray-400 hover:bg-[#2a2a2a] hover:text-white'
                                    } `}
                            >
                                <AlertTriangle className="w-5 h-5 min-w-[20px]" />
                                {!collapsed && <span className="text-sm font-medium tracking-wide">{t('nav_executive')}</span>}
                            </Link>
                            <Link
                                to="/executive-analyst"
                                className={`w-full flex items-center gap-3 p-3 rounded transition-colors ${location.pathname === '/executive-analyst'
                                    ? 'bg-[#C5A059]/10 text-[#C5A059] border-l-2 border-[#C5A059]'
                                    : 'text-gray-400 hover:bg-[#2a2a2a] hover:text-white'
                                    } `}
                            >
                                <Zap className="w-5 h-5 min-w-[20px] text-[#C5A059] fill-[#C5A059]/20" />
                                {!collapsed && <span className="text-sm font-medium tracking-wide">{t('nav_data_analyst')}</span>}
                            </Link>
                        </>
                    )}

                    {/* Logout Button */}
                    <button
                        onClick={logout}
                        className="w-full flex items-center gap-3 p-3 rounded transition-colors text-gray-400 hover:bg-[#FF2A6D]/10 hover:text-[#FF2A6D] mt-2"
                    >
                        <LogOut className="w-5 h-5 min-w-[20px]" />
                        {!collapsed && <span className="text-sm font-medium tracking-wide">{t('logout')}</span>}
                    </button>
                </nav>

                <div className="p-4 border-t border-[#333]">
                    {!collapsed && (
                        <div className="text-xs text-gray-600 font-mono">
                            {t('system_version')} - {t('system_live')}
                            <br />
                            {t('conn_label')}: <span className="text-[#00FF94]">POSTGRES-CL-V3</span>
                            <br />
                            <span className="text-[10px] text-gray-500">Build: {new Date().toLocaleString()}</span>
                        </div>
                    )}
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 relative pb-20 md:pb-0">
                {/* Ticker Header */}
                <header className="h-12 bg-[#1a1a1a] border-b border-[#333] flex items-center px-4 justify-between print:hidden">
                    <div className="flex items-center gap-6 overflow-hidden text-xs font-mono">
                        <div className="flex items-center gap-2 text-gray-400">
                            <span className="w-2 h-2 rounded-full bg-[#00FF94] animate-pulse"></span>
                            <span className="hidden md:inline">{t('system_online')}</span>
                        </div>
                        {/* Ticker */}
                        <div className="hidden md:flex items-center space-x-6 ml-4">
                            <div className="flex items-center space-x-2 px-3 py-1 bg-[#222] rounded-full border border-[#333]">
                                <Network className="w-4 h-4 text-[#C5A059]" />
                                <span className="text-xs text-gray-400 uppercase tracking-wider">Store Network</span>
                                <span className="text-sm font-bold text-white">{networkStats.active_stores} <span className="text-[10px] text-gray-500 font-normal">ACTIVE</span></span>
                            </div>
                            <div className="h-4 w-px bg-[#333]"></div>
                            <div className="flex items-center space-x-2">
                                <DollarSign className="w-4 h-4 text-green-500" />
                                <span className="text-xs text-gray-400 uppercase">System Sales</span>
                                <span className="text-sm font-mono text-white">${networkStats.system_sales.toLocaleString()}</span>
                            </div>
                            <div className="h-4 w-px bg-[#333]"></div>
                            <div className="flex items-center space-x-2">
                                <Users className="w-4 h-4 text-blue-500" />
                                <span className="text-xs text-gray-400 uppercase">System Labor</span>
                                <span className="text-sm font-mono text-white">{networkStats.system_labor}%</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 relative">
                        <button
                            onClick={() => setShowAlerts(!showAlerts)}
                            className={`flex items-center gap-2 px-3 py-1 rounded border transition-colors cursor-pointer ${showAlerts ? 'bg-[#FF9F1C]/20 border-[#FF9F1C]' : 'bg-[#252525] border-[#333] hover:bg-[#333]'
                                } `}
                        >
                            <AlertTriangle className={`w-3 h-3 ${alerts.length > 0 ? 'text-[#FF9F1C]' : 'text-gray-500'} `} />
                            <span className={`text-xs font-mono ${alerts.length > 0 ? 'text-[#FF9F1C] blinking' : 'text-gray-500'} `}>
                                {alerts.length} {t('alerts')}
                            </span>
                        </button>

                        {/* Alerts Dropdown/Modal */}
                        {showAlerts && (
                            <div className="absolute top-10 right-0 w-80 bg-[#1a1a1a] border border-[#333] shadow-2xl z-50 rounded-sm overflow-hidden">
                                <div className="p-2 bg-[#252525] border-b border-[#333] flex justify-between items-center">
                                    <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">System Alerts</span>
                                    {alerts.length > 0 ? (
                                        <span className="text-[10px] bg-[#FF9F1C] text-black px-1 rounded font-bold">{alerts.length} NEW</span>
                                    ) : (
                                        <span className="text-[10px] text-gray-500">NO NEW ALERTS</span>
                                    )}
                                </div>
                                <div className="divide-y divide-[#333]">
                                    {alerts.length === 0 ? (
                                        <div className="p-4 text-center text-xs text-gray-500 italic">
                                            {t('all_systems_op')}
                                        </div>
                                    ) : (
                                        alerts.map(alert => (
                                            <div
                                                key={alert.id}
                                                className="p-3 hover:bg-white/5 cursor-pointer group"
                                                onClick={() => handleAlertClick(alert.id, alert.path)}
                                            >
                                                <div className="flex justify-between mb-1">
                                                    <span className={`text-[${alert.color}] text-xs font-bold font-mono`} style={{ color: alert.type === 'WARNING' ? '#FF9F1C' : undefined }}>{alert.type}</span>
                                                    <span className="text-[10px] text-gray-600">{alert.time}</span>
                                                </div>
                                                <p className="text-xs text-gray-300" dangerouslySetInnerHTML={{
                                                    __html: alert.message.replace(
                                                        /(Dallas|3 Stores)/g,
                                                        '<strong>$1</strong>'
                                                    )
                                                }} />
                                            </div>
                                        ))
                                    )}
                                </div>
                                <div className="p-2 bg-[#151515] border-t border-[#333] text-center">
                                    <button onClick={() => navigate('/reports')} className="text-[10px] text-gray-500 hover:text-white uppercase tracking-wider">{t('view_all_logs')}</button>
                                </div>
                            </div>
                        )}

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowProfileMenu(!showProfileMenu)}
                                className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#C5A059] to-[#F0E68C] border-2 border-[#121212] cursor-pointer hover:ring-2 hover:ring-[#C5A059] transition-all overflow-hidden"
                            >
                                <img src={`https://ui-avatars.com/api/?name=${user?.email}&background=C5A059&color=fff`} alt="User" />
                            </button >

                            {showProfileMenu && (
                                <div className="absolute top-10 right-0 w-48 bg-[#1a1a1a] border border-[#333] shadow-2xl z-[60] rounded-sm py-1 animate-in fade-in slide-in-from-top-2">
                                    <div className="px-4 py-2 border-b border-[#333]">
                                        <p className="text-xs text-gray-500 font-mono underline uppercase tracking-tighter">{t('profile_current_user')}</p>
                                        <p className="text-[11px] text-white font-bold truncate">{user?.email}</p>
                                        <p className="text-[10px] text-[#C5A059] font-mono uppercase">{user?.role}</p>
                                    </div>
                                    <button
                                        onClick={() => { navigate('/settings'); setShowProfileMenu(false); }}
                                        className="w-full text-left px-4 py-2 text-xs text-gray-300 hover:bg-[#C5A059]/10 hover:text-[#C5A059] flex items-center gap-2"
                                    >
                                        <Users className="w-3 h-3" /> {t('profile_settings')}
                                    </button>
                                    <button
                                        onClick={() => { navigate('/reports'); setShowProfileMenu(false); }}
                                        className="w-full text-left px-4 py-2 text-xs text-gray-300 hover:bg-[#C5A059]/10 hover:text-[#C5A059] flex items-center gap-2"
                                    >
                                        <StickyNote className="w-3 h-3" /> {t('security_logs')}
                                    </button>
                                    <div className="border-t border-[#333] mt-1 pt-1">
                                        <button
                                            onClick={logout}
                                            className="w-full text-left px-4 py-2 text-xs text-[#FF2A6D] hover:bg-[#FF2A6D]/10 flex items-center gap-2"
                                        >
                                            <LogOut className="w-3 h-3" /> {t('profile_logout_system')}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div >
                    </div >
                </header >

                {/* Page Content */}
                < div className="flex-1 overflow-auto p-6 bg-[#121212]" onClick={() => setShowAlerts(false)}>
                    {children}
                </div >

                {/* Mobile Bottom Navigation */}
                <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#1a1a1a] border-t border-[#333] flex justify-around p-2 z-50 pb-safe">
                    <button onClick={() => navigate('/dashboard')} className={`flex flex-col items-center p-2 rounded ${location.pathname === '/dashboard' ? 'text-[#C5A059]' : 'text-gray-500'}`}>
                        <LayoutDashboard size={20} />
                        <span className="text-[10px] mt-1">Home</span>
                    </button>
                    <button onClick={() => navigate('/prices')} className={`flex flex-col items-center p-2 rounded ${location.pathname === '/prices' ? 'text-[#C5A059]' : 'text-gray-500'}`}>
                        <ArrowUpRight size={20} />
                        <span className="text-[10px] mt-1">Prices</span>
                    </button>
                    <button onClick={() => navigate('/waste')} className={`flex flex-col items-center p-2 rounded ${location.pathname === '/waste' ? 'text-[#C5A059]' : 'text-gray-500'}`}>
                        <Trash size={20} />
                        <span className="text-[10px] mt-1">Waste</span>
                    </button>
                    <button onClick={() => navigate('/reports')} className={`flex flex-col items-center p-2 rounded ${location.pathname === '/reports' ? 'text-[#C5A059]' : 'text-gray-500'}`}>
                        <StickyNote size={20} />
                        <span className="text-[10px] mt-1">Reports</span>
                    </button>
                </div>
            </main >
        </div >
    );
};

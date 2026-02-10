
import React, { useState } from 'react';
import {
    LayoutDashboard,
    TrendingUp,
    FileText,
    Settings,
    LogOut,
    Menu,
    X,
    ChevronRight,
    ChefHat,
    StickyNote,
    ArrowUpRight,
    ArrowDownRight,
    AlertTriangle,
    Users
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface DashboardLayoutProps {
    children: React.ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
    const { logout, user } = useAuth();
    const location = useLocation();
    const [collapsed, setCollapsed] = useState(false);
    const [showAlerts, setShowAlerts] = useState(false);
    const [showProfileMenu, setShowProfileMenu] = useState(false);

    const navigate = useNavigate();

    const navItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
        { icon: TrendingUp, label: 'Projections', path: '/projections' }, // New Annual BI
        { icon: StickyNote, label: 'Reports', path: '/reports' },
        { icon: ArrowUpRight, label: 'Meat Prices', path: '/prices' }, // New Financial Input
        { id: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
        { id: 'smart-prep', label: 'Smart Prep', icon: ChefHat, path: '/smart-prep' }
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

    return (
        <div className="flex h-screen bg-[#121212] text-white font-sans overflow-hidden">
            {/* Sidebar */}
            <aside className={`${collapsed ? 'w-16' : 'w-64'} bg - [#1a1a1a] border - r border - [#333] transition - all duration - 300 flex flex - col`}>
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

                <nav className="flex-1 p-2 space-y-1">
                    {navItems.map((item) => {
                        const active = location.pathname.includes(item.path.split('/')[1]);
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`w - full flex items - center gap - 3 p - 3 rounded transition - colors ${active
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
                        <Link
                            to="/executive"
                            className={`w - full flex items - center gap - 3 p - 3 rounded transition - colors ${location.pathname === '/executive'
                                ? 'bg-[#FF2A6D]/10 text-[#FF2A6D] border-l-2 border-[#FF2A6D]'
                                : 'text-gray-400 hover:bg-[#2a2a2a] hover:text-white'
                                } `}
                        >
                            <AlertTriangle className="w-5 h-5 min-w-[20px]" />
                            {!collapsed && <span className="text-sm font-medium tracking-wide">Executive View</span>}
                        </Link>
                    )}

                    {/* Logout Button */}
                    <button
                        onClick={logout}
                        className="w-full flex items-center gap-3 p-3 rounded transition-colors text-gray-400 hover:bg-[#FF2A6D]/10 hover:text-[#FF2A6D] mt-2"
                    >
                        <LogOut className="w-5 h-5 min-w-[20px]" />
                        {!collapsed && <span className="text-sm font-medium tracking-wide">Log Out</span>}
                    </button>
                </nav>

                <div className="p-4 border-t border-[#333]">
                    {!collapsed && (
                        <div className="text-xs text-gray-600 font-mono">
                            v2.4.0 (Beta) - LIVE
                            <br />
                            CONN: <span className="text-[#00FF94]">POSTGRES-20Hr</span>
                        </div>
                    )}
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 relative">
                {/* Ticker Header */}
                <header className="h-12 bg-[#1a1a1a] border-b border-[#333] flex items-center px-4 justify-between">
                    <div className="flex items-center gap-6 overflow-hidden text-xs font-mono">
                        <div className="flex items-center gap-2 text-gray-400">
                            <span className="w-2 h-2 rounded-full bg-[#00FF94] animate-pulse"></span>
                            SYSTEM ONLINE
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="text-gray-500">NY:</span>
                            <span className="text-[#00FF94] flex items-center">
                                98.2% <ArrowUpRight className="w-3 h-3" />
                            </span>
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="text-gray-500">MIA:</span>
                            <span className="text-[#00FF94] flex items-center">
                                97.5% <ArrowUpRight className="w-3 h-3" />
                            </span>
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="text-gray-500">DAL:</span>
                            <span className="text-[#FF2A6D] flex items-center">
                                89.1% <ArrowDownRight className="w-3 h-3" />
                            </span>
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="text-gray-500">LAS:</span>
                            <span className="text-[#FF9F1C] flex items-center">
                                92.0% <ArrowDownRight className="w-3 h-3" />
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 relative">
                        <button
                            onClick={() => setShowAlerts(!showAlerts)}
                            className={`flex items - center gap - 2 px - 3 py - 1 rounded border transition - colors cursor - pointer ${showAlerts ? 'bg-[#FF9F1C]/20 border-[#FF9F1C]' : 'bg-[#252525] border-[#333] hover:bg-[#333]'
                                } `}
                        >
                            <AlertTriangle className={`w - 3 h - 3 ${alerts.length > 0 ? 'text-[#FF9F1C]' : 'text-gray-500'} `} />
                            <span className={`text - xs font - mono ${alerts.length > 0 ? 'text-[#FF9F1C] blinking' : 'text-gray-500'} `}>
                                {alerts.length} ALERTS
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
                                            All systems operational.
                                        </div>
                                    ) : (
                                        alerts.map(alert => (
                                            <div
                                                key={alert.id}
                                                className="p-3 hover:bg-white/5 cursor-pointer group"
                                                onClick={() => handleAlertClick(alert.id, alert.path)}
                                            >
                                                <div className="flex justify-between mb-1">
                                                    <span className={`text - [${alert.color}] text - xs font - bold font - mono`} style={{ color: alert.type === 'WARNING' ? '#FF9F1C' : undefined }}>{alert.type}</span>
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
                                    <button className="text-[10px] text-gray-500 hover:text-white uppercase tracking-wider">View All Logs</button>
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
                                        <p className="text-xs text-gray-500 font-mono underline uppercase tracking-tighter">Current User</p>
                                        <p className="text-[11px] text-white font-bold truncate">{user?.email}</p>
                                        <p className="text-[10px] text-[#C5A059] font-mono uppercase">{user?.role}</p>
                                    </div>
                                    <button className="w-full text-left px-4 py-2 text-xs text-gray-300 hover:bg-[#C5A059]/10 hover:text-[#C5A059] flex items-center gap-2">
                                        <Users className="w-3 h-3" /> Profile Settings
                                    </button>
                                    <button className="w-full text-left px-4 py-2 text-xs text-gray-300 hover:bg-[#C5A059]/10 hover:text-[#C5A059] flex items-center gap-2">
                                        <StickyNote className="w-3 h-3" /> Security Logs
                                    </button>
                                    <div className="border-t border-[#333] mt-1 pt-1">
                                        <button
                                            onClick={logout}
                                            className="w-full text-left px-4 py-2 text-xs text-[#FF2A6D] hover:bg-[#FF2A6D]/10 flex items-center gap-2"
                                        >
                                            <LogOut className="w-3 h-3" /> Log Out System
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
            </main >
        </div >
    );
};

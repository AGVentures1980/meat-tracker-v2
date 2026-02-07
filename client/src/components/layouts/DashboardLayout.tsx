import React, { useState } from 'react';
import { LayoutDashboard, ShoppingCart, Users, StickyNote, Settings, Menu, TrendingUp, AlertTriangle, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

interface DashboardLayoutProps {
    children: React.ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [collapsed, setCollapsed] = useState(false);

    const navItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard/1' },
        { icon: ShoppingCart, label: 'Inventory', path: '/inventory' },
        { icon: StickyNote, label: 'Reports', path: '/reports' },
        { icon: Users, label: 'Users', path: '/users' },
        { icon: Settings, label: 'Settings', path: '/settings' },
    ];

    return (
        <div className="flex h-screen bg-[#121212] text-white font-sans overflow-hidden">
            {/* Sidebar */}
            <aside className={`${collapsed ? 'w-16' : 'w-64'} bg-[#1a1a1a] border-r border-[#333] transition-all duration-300 flex flex-col`}>
                <div className="p-4 border-b border-[#333] flex items-center justify-between">
                    {!collapsed && (
                        <div className="flex items-center gap-2">
                            <span className="text-xl font-bold tracking-tighter text-[#00FF94]">BRASA</span>
                            <span className="text-xs text-gray-500 uppercase tracking-widest">INTEL</span>
                        </div>
                    )}
                    <button onClick={() => setCollapsed(!collapsed)} className="p-1 hover:bg-[#333] rounded">
                        <Menu className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                <nav className="flex-1 p-2 space-y-1">
                    {navItems.map((item) => {
                        const active = location.pathname.includes(item.path);
                        return (
                            <button
                                key={item.path}
                                onClick={() => navigate(item.path)}
                                className={`w-full flex items-center gap-3 p-3 rounded transition-colors ${active
                                        ? 'bg-[#00FF94]/10 text-[#00FF94] border-l-2 border-[#00FF94]'
                                        : 'text-gray-400 hover:bg-[#2a2a2a] hover:text-white'
                                    }`}
                            >
                                <item.icon className="w-5 h-5 min-w-[20px]" />
                                {!collapsed && <span className="text-sm font-medium tracking-wide">{item.label}</span>}
                            </button>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-[#333]">
                    {!collapsed && (
                        <div className="text-xs text-gray-600 font-mono">
                            v2.1.0-RC1
                            <br />
                            CONN: <span className="text-[#00FF94]">SECURE</span>
                        </div>
                    )}
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0">
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

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 px-3 py-1 bg-[#252525] rounded border border-[#333]">
                            <AlertTriangle className="w-3 h-3 text-[#FF9F1C]" />
                            <span className="text-xs font-mono text-[#FF9F1C]">3 ALERTS</span>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#00FF94] to-[#00f2ea] border-2 border-[#121212]"></div>
                    </div>
                </header>

                {/* Page Content */}
                <div className="flex-1 overflow-auto p-6 bg-[#121212]">
                    {children}
                </div>
            </main>
        </div>
    );
};


import React, { useState, useEffect } from 'react';
import {
    LayoutDashboard,
    TrendingUp,
    LogOut,
    Menu,
    StickyNote,
    ArrowUpRight,
    AlertTriangle,
    Users,
    Network,
    DollarSign,
    Trash,
    Truck,
    Zap,
    Building2,
    PlayCircle,
    GraduationCap,
    FileText,
    Activity,
    ShieldAlert,
    BrainCircuit,
    ShieldCheck,
    Database,
    ScanLine
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface DashboardLayoutProps {
    children: React.ReactNode;
}

import { useLanguage } from '../../context/LanguageContext';

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
    const { logout, user, selectedCompany } = useAuth();
    const { t } = useLanguage();
    const location = useLocation();
    const [showAlerts, setShowAlerts] = useState(false);
    const [showProfileMenu, setShowProfileMenu] = useState(false);

    const navigate = useNavigate();
    const isMaster = user?.email?.toLowerCase()?.includes('alexandre@alexgarciaventures.co') || false;
    const isDavid = user?.email?.toLowerCase()?.includes('davidcastro') || false;
    const isRodrigo = user?.email?.toLowerCase()?.includes('rodrigo') || false;
    const isSystemAdmin = user?.role === 'admin' || isRodrigo || isMaster;

    let navItems: any[] = [];

    // Global Executive Items (Always visible for Master, but require a selected company for context)
    if (isMaster && selectedCompany) {
        navItems.push({
            section: 'EXECUTIVE STEALTH',
            items: [
                { icon: DollarSign, label: 'Corp Procurement (Stealth)', path: '/procurement' },
                { icon: BrainCircuit, label: 'A.I. Procurement (Shadow)', path: '/intelligence/procurement-shadow' },
                { icon: ShieldCheck, label: 'Master Contracts Vault', path: '/agv-vault' }
            ]
        });
    }

    if (selectedCompany) {
        if (isDavid) {
            // David's account is STRICTLY for registering Corporate Specs
            navItems.push({
                section: 'CORPORATE SPECS',
                items: [
                    { icon: ShieldCheck, label: 'Corporate DB Specs', path: '/executive/specs' }
                ]
            });
        } else {
            // Standard Navigation for all other roles
            const isStoreLevel = user?.scope?.type === 'STORE';
            const isAreaLevel = user?.scope?.type === 'AREA';
            const isCompanyOrGlobal = user?.scope?.type === 'COMPANY' || user?.scope?.type === 'GLOBAL';

            navItems.push(
                {
                    section: t('nav.section_gate') || (isStoreLevel ? 'GATE (Accountability)' : 'MARKET DATA'), items: [
                        { icon: ArrowUpRight, label: isStoreLevel ? (t('nav.invoices') || 'Meat Prices / Invoices') : 'Protein Market Cost', path: '/prices' },
                        { icon: ScanLine, label: 'Receiving Dock QC', path: '/receiving' },
                        { icon: Trash, label: isStoreLevel ? 'Process Waste' : 'Network Waste Status', path: '/waste' },
                        ...(isStoreLevel || isAreaLevel ? [{ icon: ShieldAlert, label: 'Weekly Pulse (Inventory)', path: '/inventory' }] : []),
                    ]
                }
            );

            if (isStoreLevel || isAreaLevel) {
                navItems.push({
                    section: t('nav.section_run') || 'RUN (Shift Command)', items: [
                        { icon: PlayCircle, label: t('nav.commandCenter') || 'Shift Command Center', path: '/command-center' },
                        { icon: Truck, label: 'Delivery (OLO)', path: '/delivery' },
                    ]
                });
            }

            navItems.push(
                {
                    section: t('nav.section_view') || 'VIEW (Performance)', items: [
                        { icon: LayoutDashboard, label: t('nav.performanceHub') || 'Performance Hub', path: '/dashboard' },
                        { icon: TrendingUp, label: t('nav.projections') || 'Projections', path: '/projections' },
                        { icon: StickyNote, label: t('nav.reports') || 'Executive Reports', path: '/reports' },
                    ]
                },
                {
                    section: t('nav.section_learn') || 'LEARN (Training)', items: [
                        { icon: GraduationCap, label: t('nav.training') || 'Training Center', path: '/training' },
                        { icon: FileText, label: 'AGV Support Hub', path: '/support' },
                    ]
                },
                {
                    section: t('nav.section_team') || 'TEAM (Store)', 
                    hideOnMobile: true,
                    items: [
                        { icon: Users, label: t('nav.team') || 'Team Management', path: '/users' },
                    ]
                }
            );

            // Add Company Settings for Directors/Admins/Master (Company or Global Scope)
            if (isCompanyOrGlobal) {
                const isSystemAdmin = user?.role === 'admin' || isRodrigo || isMaster;
                const manageItems = [];
                
                manageItems.push(
                    { icon: Activity, label: 'Network Command Center', path: '/owner' },
                    { icon: ShieldAlert, label: 'Support Triage', path: '/admin-support' }
                );

                if (isSystemAdmin) {
                    manageItems.push(
                        { icon: Users, label: t('nav.performance_audit') || 'Performance Audit', path: '/audit' },
                        { icon: FileText, label: t('nav.cfo_report') || 'CFO Monthly Report', path: '/cfo-report' },
                        { icon: Building2, label: t('nav.settings') || 'Company Settings', path: '/settings/company' }
                    );
                }

                // Push Corporate DB Specs for Rodrigo and Master/Admin too, so they can see what David does
                navItems.push({
                    section: t('nav.section_manage') || 'MANAGE (Company)',
                    items: [
                        ...manageItems,
                        { icon: ShieldCheck, label: 'Corporate DB Specs', path: '/executive/specs' }
                    ]
                });
            }
        }
    }

    const [networkStats, setNetworkStats] = useState<{ totalStores: number, activeReporting: number } | null>(null);
    const [alerts, setAlerts] = useState<any[]>([]);
    const [companyName, setCompanyName] = useState<string | null>(null);

    useEffect(() => {
        if (selectedCompany && user?.token) {
            fetch(`/api/v1/users/company-name/${selectedCompany}`, {
                headers: { 'Authorization': `Bearer ${user.token}` }
            })
            .then(res => res.json())
            .then(data => {
                if (data.name) setCompanyName(data.name);
            })
            .catch(err => console.error('Failed to fetch company name:', err));
        } else {
            setCompanyName(null);
        }
    }, [selectedCompany, user?.token]);

    useEffect(() => {
        const fetchNetworkStats = async () => {
            if (!user?.token) return;
            try {
                const res = await fetch('/api/v1/dashboard/stats/network', {
                    headers: { 
                        'Authorization': `Bearer ${user.token}`,
                        'x-company-id': selectedCompany || ''
                    }
                });
                if (res.ok) {
                    const data = await res.json();
                    setNetworkStats(data);
                }
            } catch (err) { }
        };
        fetchNetworkStats();
    }, [user, selectedCompany]);

    useEffect(() => {
        const isMaster = user?.email?.toLowerCase().trim() === 'alexandre@alexgarciaventures.co';
        if (user?.role === 'admin' || user?.role === 'director' || user?.email?.toLowerCase().includes('admin') || isMaster) {
            const fetchEscalationsAndVault = async () => {
                try {
                    const token = user?.token;
                    if (!token) return;

                    let escalationAlerts: any[] = [];
                    const res = await fetch('/api/v1/support/tickets', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (res.ok) {
                        const tickets = await res.json();
                        escalationAlerts = tickets.map((t: any) => ({
                            id: `escalation-${t.id}`,
                            type: 'ESCALATION',
                            time: 'Just now',
                            message: `Store ${t.store.store_name} reported an issue: ${t.title}`,
                            path: '/admin-support',
                            color: '#FF2A6D'
                        }));
                    }

                    let vaultAlerts: any[] = [];
                    if (isMaster) {
                        if ('Notification' in window && Notification.permission === 'default') {
                            Notification.requestPermission();
                        }

                        const vRes = await fetch('/api/v1/vault/unread', {
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        if (vRes.ok) {
                            const vData = await vRes.json();
                            if (vData.count > 0) {
                                vaultAlerts.push({
                                    id: 'vault-unread',
                                    type: 'VAULT ALERT',
                                    time: 'Just now',
                                    message: `You have ${vData.count} unread message(s) in the Idea Vault. Click to view.`,
                                    path: '/vault',
                                    color: '#00FF94'
                                });

                                const lastCount = parseInt(localStorage.getItem('lastNotifiedVaultCount') || '0');
                                if (vData.count > lastCount) {
                                    if ('Notification' in window && Notification.permission === 'granted') {
                                        new Notification('AGV Idea Vault', {
                                            body: `New Sentinel Alert! You have ${vData.count} unread messages.`,
                                            icon: '/favicon.ico'
                                        });
                                    }
                                    localStorage.setItem('lastNotifiedVaultCount', vData.count.toString());
                                }
                            } else {
                                localStorage.setItem('lastNotifiedVaultCount', '0');
                            }
                        }
                    }

                    setAlerts(prev => {
                        const systemAlerts = prev.filter(a => typeof a.id === 'number');
                        return [...vaultAlerts, ...escalationAlerts, ...systemAlerts];
                    });
                } catch (error) {
                    console.error('Failed to fetch alerts', error);
                }
            };

            fetchEscalationsAndVault();
            const interval = setInterval(fetchEscalationsAndVault, 15000);
            return () => clearInterval(interval);
        }
    }, [user]);

    const handleAlertClick = (id: string | number, path: string) => {
        setAlerts(prev => prev.filter(a => a.id !== id));
        setShowAlerts(false);
        navigate(path);
    };

    const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024);

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 1024) setIsSidebarOpen(true);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <div className="flex h-screen bg-[#121212] text-white font-sans overflow-hidden print:h-auto print:overflow-visible">
            {/* Overlay for mobile/retractable mode */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] md:hidden print:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Retractable Sidebar */}
            <aside className={`fixed md:relative inset-y-0 left-0 z-[100] w-64 bg-[#1a1a1a] border-r border-[#333] transition-all duration-300 transform ${isSidebarOpen ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0 md:w-0 md:pointer-events-none'} flex flex-col print:hidden`}>
                <div className="p-4 border-b border-[#333] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-xl font-bold tracking-tighter text-[#C5A059]">BRASA</span>
                        <span className="text-xs text-gray-500 uppercase tracking-widest">INTEL</span>
                    </div>
                    <button onClick={() => setIsSidebarOpen(false)} className="p-1 hover:bg-[#333] rounded">
                        <Menu className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                <nav className="flex-1 p-2 space-y-4 overflow-y-auto">
                    {navItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-48 px-4 text-center">
                            <Building2 className="w-8 h-8 text-[#C5A059] mb-3 opacity-50" />
                            <p className="text-sm font-medium text-gray-300">No Location Selected</p>
                            <p className="text-xs text-gray-500 mt-2">Please select a store from the top menu to view the operational command center.</p>
                        </div>
                    ) : (
                        navItems.map((section: any) => (
                            <div key={section.section} className={`space-y-1 ${section.hideOnMobile ? 'hidden md:block' : ''}`}>
                                <h3 className="px-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">{section.section}</h3>
                                {section.items.map((item: any) => {
                                    const active = location.pathname === item.path || (item.path === '/settings/company' && location.pathname.startsWith('/settings/'));
                                    const isGlobalExecutivePath = item.path === '/procurement' || item.path === '/intelligence/procurement-shadow';
                                    const isLocked = !selectedCompany && item.path !== '/dashboard' && !isGlobalExecutivePath;

                                    return (
                                        <Link
                                            key={item.path}
                                            to={isLocked ? '#' : item.path}
                                            onClick={(e) => isLocked && e.preventDefault()}
                                            className={`w-full flex items-center gap-3 p-3 rounded transition-colors ${active
                                                ? 'bg-[#C5A059]/10 text-[#C5A059] border-l-2 border-[#C5A059]'
                                                : isLocked
                                                    ? 'text-gray-600 cursor-not-allowed opacity-50'
                                                    : 'text-gray-400 hover:bg-[#2a2a2a] hover:text-white'
                                                } `}
                                        >
                                            <item.icon className={`w-5 h-5 min-w-[20px] ${isLocked ? 'text-gray-700' : ''}`} />
                                            <div className="flex flex-1 items-center justify-between">
                                                <span className="text-sm font-medium tracking-wide">{item.label}</span>
                                                {isLocked && <AlertTriangle className="w-3 h-3 text-red-900/50" />}
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        ))
                    )}


                    {/* Executive View (Admin/Director Only) */}
                    {selectedCompany && (user?.role === 'admin' || user?.role === 'director' || user?.email?.includes('admin')) && (
                        <>
                            {!isDavid && (
                                <Link
                                    to="/executive"
                                    className={`w-full flex items-center gap-3 p-3 rounded transition-colors ${location.pathname === '/executive'
                                        ? 'bg-[#FF2A6D]/10 text-[#FF2A6D] border-l-2 border-[#FF2A6D]'
                                        : 'text-gray-400 hover:bg-[#2a2a2a] hover:text-white'
                                        } `}
                                >
                                    <AlertTriangle className="w-5 h-5 min-w-[20px]" />
                                    <div className="flex flex-1 items-center justify-between">
                                        <span className="text-sm font-medium tracking-wide">{t('nav_executive')}</span>
                                    </div>
                                </Link>
                            )}
                            <Link
                                to="/executive/specs"
                                className={`w-full flex items-center gap-3 p-3 rounded transition-colors ${location.pathname === '/executive/specs'
                                    ? 'bg-[#00FF94]/10 text-[#00FF94] border-l-2 border-[#00FF94]'
                                    : 'text-gray-400 hover:bg-[#2a2a2a] hover:text-white'
                                    } `}
                            >
                                <ShieldCheck className="w-5 h-5 min-w-[20px]" />
                                <div className="flex flex-1 items-center justify-between">
                                    <span className="text-sm font-medium tracking-wide">Corporate DB Specs</span>
                                </div>
                            </Link>
                            {!isDavid && (
                                <Link
                                    to="/data-analyst"
                                    className={`w-full flex items-center gap-3 p-3 rounded transition-colors ${location.pathname === '/data-analyst'
                                        ? 'bg-[#C5A059]/10 text-[#C5A059] border-l-2 border-[#C5A059]'
                                        : 'text-gray-400 hover:bg-[#2a2a2a] hover:text-white'
                                        } `}
                                >
                                    <Zap className="w-5 h-5 min-w-[20px] text-[#C5A059] fill-[#C5A059]/20" />
                                    <div className="flex flex-1 items-center justify-between">
                                        <span className="text-sm font-medium tracking-wide">{t('nav_data_analyst')}</span>
                                    </div>
                                </Link>
                            )}
                        </>
                    )}


                    {/* Switch Company (Master Owner Only) */}
                    {isMaster && (
                        <>
                            <Link
                                to="/select-company"
                                className="w-full flex items-center gap-3 p-3 rounded transition-colors text-[#C5A059] hover:bg-[#C5A059]/10 mt-4 border border-[#C5A059]/20 border-dashed"
                            >
                                <Building2 className="w-5 h-5 min-w-[20px]" />
                                <span className="text-sm font-bold tracking-tight">Switch Company</span>
                            </Link>
                            
                            <Link
                                to="/agv-network"
                                className="w-full flex items-center gap-3 p-3 rounded transition-colors text-indigo-400 hover:bg-indigo-900/20 mt-2 border border-indigo-500/20 border-solid shadow-sm shadow-indigo-900/10"
                            >
                                <Network className="w-5 h-5 min-w-[20px]" />
                                <span className="text-sm font-bold tracking-tight">Global Partner Network</span>
                            </Link>

                            <Link
                                to="/agv-vault"
                                className="w-full flex items-center gap-3 p-3 rounded transition-colors text-emerald-400 hover:bg-emerald-900/20 mt-2 border border-emerald-500/20 border-solid shadow-sm shadow-emerald-900/10"
                            >
                                <ShieldCheck className="w-5 h-5 min-w-[20px]" />
                                <span className="text-sm font-bold tracking-tight">Master Contracts Vault</span>
                            </Link>
                        </>
                    )}
                </nav>

                <div className="p-5 border-t border-[#333] bg-[#121212] mt-auto relative shadow-[0_-10px_30px_rgba(0,0,0,0.5)] z-10">
                    <button
                        onClick={logout}
                        className="flex items-center gap-3 px-4 py-3 w-full text-left rounded border border-transparent text-sm font-bold transition-all text-gray-400 hover:text-[#FF2A6D] hover:bg-[#FF2A6D]/10 hover:border-[#FF2A6D]/30"
                    >
                        <LogOut className="w-5 h-5 flex-shrink-0" />
                        <span className="tracking-widest uppercase text-xs">{t('nav_logout')}</span>
                    </button>
                    
                    <div className="mt-8 px-1 space-y-2">
                        <div className="text-[10px] text-gray-500 font-mono tracking-wider flex items-center justify-between">
                            VERSION 4.2.0
                            <span className="text-[#00FF94] flex items-center gap-1.5 py-0.5 px-2 bg-[#00FF94]/10 rounded border border-[#00FF94]/20"><span className="w-1.5 h-1.5 bg-[#00FF94] rounded-full animate-pulse" /> LIVE</span>
                        </div>
                        
                        <div className="text-[10px] text-[#C5A059] font-mono font-bold tracking-widest flex items-center gap-2 bg-[#C5A059]/5 p-2 rounded border border-[#C5A059]/10">
                            <Database className="w-3 h-3 text-[#C5A059]" />
                            POSTGRES_V3_LINK
                        </div>
                        
                        <div className="text-[9px] text-gray-600 font-mono tracking-widest uppercase pt-3 border-t border-[#333] mt-4 flex flex-col gap-1">
                            <span>Build Stamp:</span>
                            <span className="text-gray-500">{new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })} // {new Date().toLocaleTimeString()}</span>
                        </div>
                        
                        <div className="pt-5 mt-2 flex items-center gap-2 opacity-30 hover:opacity-100 transition-opacity justify-center w-full">
                            <span className="text-[9px] font-bold text-white uppercase tracking-[0.3em] font-sans">POWERED BY AGV INTEL</span>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 relative pb-20 md:pb-0 print:block print:pb-0">
                {/* Ticker Header */}
                <header className="h-12 bg-[#1a1a1a] border-b border-[#333] flex items-center px-4 justify-between print:hidden">
                    <div className="flex items-center gap-4 overflow-hidden text-xs font-mono">
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="p-2 hover:bg-[#2a2a2a] rounded-lg transition-colors border border-white/5"
                        >
                            <Menu className="w-5 h-5 text-[#C5A059]" />
                        </button>
                        <div className="flex items-center gap-2 text-gray-400">
                            <span className="w-2 h-2 rounded-full bg-[#00FF94] animate-pulse"></span>
                            <span className="hidden md:inline">{t('system_online')}</span>
                        </div>
                        {selectedCompany && (
                            <div className="hidden lg:flex items-center gap-2 ml-4 px-3 py-1 bg-[#C5A059]/10 border border-[#C5A059]/30 rounded-full shadow-[0_0_10px_rgba(197,160,89,0.2)]">
                                <Building2 className="w-3 h-3 text-[#C5A059]" />
                                <span className="text-[10px] text-[#C5A059] font-bold uppercase tracking-widest">{companyName || selectedCompany}</span>
                            </div>
                        )}
                        {/* Ticker */}
                        <div className="hidden md:flex items-center space-x-6 ml-4">
                            <div className="flex items-center space-x-2 px-3 py-1 bg-[#222] rounded-full border border-[#333]">
                                <Network className="w-4 h-4 text-[#C5A059]" />
                                <span className="text-xs text-gray-400 uppercase tracking-wider">Store Network</span>
                                <span className="text-sm font-bold text-white">{networkStats ? networkStats.totalStores : 57} <span className="text-[10px] text-gray-500 font-normal">ACTIVE</span></span>
                            </div>
                            <div className="h-4 w-px bg-[#333]"></div>
                            <div className="flex items-center space-x-2">
                                <DollarSign className="w-4 h-4 text-green-500" />
                                <span className="text-xs text-gray-400 uppercase">System Sales</span>
                                <span className="text-sm font-mono text-white">$45.5</span>
                            </div>
                            <div className="h-4 w-px bg-[#333]"></div>
                            <div className="flex items-center space-x-2">
                                <Users className="w-4 h-4 text-blue-500" />
                                <span className="text-xs text-gray-400 uppercase">System Labor</span>
                                <span className="text-sm font-mono text-white">28.4%</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 relative">
                        {/* Welcome Personalization */}
                        {user?.email && (
                            <div className="hidden lg:flex items-center gap-2 mr-2 bg-[#222] px-3 py-1 rounded-full border border-[#333] shadow-sm">
                                <span className="text-[10px] text-gray-500 uppercase tracking-widest font-mono">Welcome</span>
                                <span className="text-xs font-bold text-[#C5A059] tracking-wide">
                                    {user.first_name || (user.email.toLowerCase().includes('rodrigo') ? 'Rodrigo' : user.email.toLowerCase().includes('alexandre') ? 'Alexandre' : user.email.toLowerCase().includes('carlos') ? 'Carlos' : user.email.split('@')[0].split('.')[0].replace(/^\w/, (c: string) => c.toUpperCase()))}
                                </span>
                            </div>
                        )}

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
                <div className="flex-1 overflow-auto p-4 md:p-6 bg-[#121212] print:overflow-visible print:p-0 print:bg-white" onClick={() => setShowAlerts(false)}>
                    {children}
                </div>

                {/* Mobile Bottom Navigation */}
                <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#1a1a1a] border-t border-[#333] flex justify-around p-2 z-[9999] pb-safe print:hidden">
                    <button onClick={() => navigate('/dashboard')} className={`flex flex-col items-center p-2 rounded ${location.pathname === '/dashboard' ? 'text-[#C5A059]' : 'text-gray-500'}`}>
                        <LayoutDashboard size={20} />
                        <span className="text-[10px] mt-1">Home</span>
                    </button>
                    <button
                        onClick={() => selectedCompany && navigate('/prices')}
                        className={`flex flex-col items-center p-2 rounded ${location.pathname === '/prices' ? 'text-[#C5A059]' : !selectedCompany ? 'text-gray-700 opacity-50 cursor-not-allowed' : 'text-gray-500'}`}
                    >
                        <ArrowUpRight size={20} />
                        <span className="text-[10px] mt-1">Prices</span>
                    </button>
                    <button
                        onClick={() => selectedCompany && navigate('/waste')}
                        className={`flex flex-col items-center p-2 rounded ${location.pathname === '/waste' ? 'text-[#C5A059]' : !selectedCompany ? 'text-gray-700 opacity-50 cursor-not-allowed' : 'text-gray-500'}`}
                    >
                        <Trash size={20} />
                        <span className="text-[10px] mt-1">Waste</span>
                    </button>
                    <button
                        onClick={() => selectedCompany && navigate('/inventory')}
                        className={`flex flex-col items-center p-2 rounded ${location.pathname === '/inventory' ? 'text-[#C5A059]' : !selectedCompany ? 'text-gray-700 opacity-50 cursor-not-allowed' : 'text-gray-500'}`}
                    >
                        <ShieldAlert size={20} />
                        <span className="text-[10px] mt-1">Inventory</span>
                    </button>
                    <button
                        onClick={() => selectedCompany && navigate('/reports')}
                        className={`flex flex-col items-center p-2 rounded ${location.pathname === '/reports' ? 'text-[#C5A059]' : !selectedCompany ? 'text-gray-700 opacity-50 cursor-not-allowed' : 'text-gray-500'}`}
                    >
                        <StickyNote size={20} />
                        <span className="text-[10px] mt-1">Reports</span>
                    </button>
                </div>
            </main >
        </div >
    );
};

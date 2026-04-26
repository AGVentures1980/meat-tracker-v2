import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Activity, Database, Zap, Users, ShieldAlert, ArrowUpRight, Copy, Terminal, CheckCircle2, Clock, X } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export const SRECommandCenter = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [health, setHealth] = useState<any>(null);
    const [issues, setIssues] = useState<any[]>([]);
    const [tenants, setTenants] = useState<any[]>([]);
    const [metrics, setMetrics] = useState<any>(null);
    const [lastCheck, setLastCheck] = useState<Date>(new Date());
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [showCopyModal, setShowCopyModal] = useState<string | null>(null);

    useEffect(() => {
        if (user?.email !== 'alexandre@alexgarciaventures.co') {
            navigate('/dashboard', { replace: true });
        }
    }, [user, navigate]);

    const fetchData = async () => {
        if (!user?.token) return;
        setLoading(true);
        try {
            const headers = { 'Authorization': `Bearer ${user.token}` };
            const [healthRes, issuesRes, tenantsRes, metricsRes] = await Promise.all([
                fetch('/api/v1/sre/health', { headers }),
                fetch('/api/v1/sre/issues', { headers }),
                fetch('/api/v1/sre/tenants', { headers }),
                fetch('/api/v1/sre/metrics?range=7d', { headers })
            ]);

            if (healthRes.ok) setHealth(await healthRes.json());
            if (issuesRes.ok) setIssues((await issuesRes.json()).issues);
            if (tenantsRes.ok) setTenants((await tenantsRes.json()).tenants);
            if (metricsRes.ok) setMetrics(await metricsRes.json());
            
            setLastCheck(new Date());
        } catch (err) {
            console.error('SRE Fetch failed', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        let interval: any;
        if (autoRefresh) {
            interval = setInterval(fetchData, 5 * 60 * 1000); // 5 mins
        }
        return () => clearInterval(interval);
    }, [user?.token, autoRefresh]);

    const handleCopy = (text: string, buttonId: string) => {
        console.log(`[SRE Copy] Type: ${typeof text}`, text);
        
        // Method 1: Modern clipboard API (requires HTTPS/Secure Context)
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text).then(() => {
                setCopiedId(buttonId);
                setTimeout(() => setCopiedId(null), 2000);
            }).catch(() => executeCopy(text, buttonId));
        } else {
            // Method 2: Synchronous Fallback (required for HTTP or prompt execution)
            executeCopy(text, buttonId);
        }
    };

    const executeCopy = (text: string, buttonId: string) => {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        textArea.style.top = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            const successful = document.execCommand('copy');
            if (successful) {
                setCopiedId(buttonId);
                setTimeout(() => setCopiedId(null), 2000);
            } else {
                setShowCopyModal(text);
            }
        } catch (e) {
            setShowCopyModal(text);
        }
        document.body.removeChild(textArea);
    };

    if (!health || !metrics) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="w-12 h-12 rounded-full border-t-2 border-r-2 border-[#C5A059] animate-spin"></div>
            </div>
        );
    }

    const minutesAgo = Math.floor((new Date().getTime() - lastCheck.getTime()) / 60000);

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#333] pb-4">
                <div>
                    <h1 className="text-2xl font-black text-white tracking-tighter uppercase flex items-center gap-2">
                        <ShieldCheck className="w-6 h-6 text-[#C5A059]" />
                        SRE COMMAND CENTER
                    </h1>
                    <p className="text-sm text-gray-400 font-mono tracking-widest uppercase">
                        BRASA Meat Intelligence OS — Production
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-xs font-mono text-gray-400">
                        <Clock className="w-4 h-4" />
                        Last check: {minutesAgo === 0 ? 'Just now' : `${minutesAgo} minutes ago`}
                    </div>
                    <button 
                        onClick={() => setAutoRefresh(!autoRefresh)}
                        className={`text-xs font-bold px-3 py-1.5 rounded border transition-colors ${autoRefresh ? 'bg-[#00FF94]/10 text-[#00FF94] border-[#00FF94]/30' : 'bg-transparent text-gray-500 border-[#333] hover:text-white'}`}
                    >
                        AUTO REFRESH: {autoRefresh ? 'ON' : 'OFF'}
                    </button>
                    <button 
                        onClick={fetchData}
                        disabled={loading}
                        className="bg-[#C5A059] text-black text-xs font-bold px-4 py-1.5 rounded hover:bg-[#D4AF37] transition-colors disabled:opacity-50"
                    >
                        {loading ? 'CHECKING...' : 'RUN CHECKS NOW'}
                    </button>
                </div>
            </div>

            {/* System Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-[#1a1a1a] border border-[#333] p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs text-gray-400 font-mono tracking-widest uppercase">Database</span>
                        {health.checks.database.status === 'OK' ? <span className="text-[#00FF94]">✅</span> : <span className="text-[#FF2A6D]">❌</span>}
                    </div>
                    <div className="text-xl font-bold text-white flex items-center gap-2">
                        <Database className="w-5 h-5 text-gray-500" />
                        {health.checks.database.latency_ms} ms
                    </div>
                </div>

                <div className="bg-[#1a1a1a] border border-[#333] p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs text-gray-400 font-mono tracking-widest uppercase">Redis</span>
                        {health.checks.redis.status === 'OK' ? <span className="text-[#00FF94]">✅</span> : <span className="text-[#FF2A6D]">❌</span>}
                    </div>
                    <div className="text-xl font-bold text-white flex items-center gap-2">
                        <Zap className="w-5 h-5 text-gray-500" />
                        {health.checks.redis.mode} <span className="text-sm font-normal text-gray-500">({health.checks.redis.latency_ms}ms)</span>
                    </div>
                </div>

                <div className="bg-[#1a1a1a] border border-[#333] p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs text-gray-400 font-mono tracking-widest uppercase">Railway</span>
                        {health.checks.railway.environment === 'production' ? <span className="text-[#00FF94]">✅</span> : <span className="text-yellow-500">⚠️</span>}
                    </div>
                    <div className="text-xl font-bold text-white flex items-center gap-2">
                        <Terminal className="w-5 h-5 text-gray-500" />
                        {health.checks.railway.environment}
                    </div>
                </div>

                <div className="bg-[#1a1a1a] border border-[#333] p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs text-gray-400 font-mono tracking-widest uppercase">Tenants</span>
                        {health.checks.tenants.active > 0 ? <span className="text-[#00FF94]">✅</span> : <span className="text-yellow-500">⚠️</span>}
                    </div>
                    <div className="text-xl font-bold text-white flex items-center gap-2">
                        <Users className="w-5 h-5 text-gray-500" />
                        {health.checks.tenants.total} Total / <span className="text-[#C5A059]">{health.checks.tenants.active} Active</span>
                    </div>
                </div>
            </div>

            {/* Active Issues */}
            <div>
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">Active Issues</h2>
                {issues.length === 0 ? (
                    <div className="bg-[#00FF94]/10 border border-[#00FF94]/30 rounded-lg p-4 flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-[#00FF94]" />
                        <span className="text-sm font-bold text-[#00FF94]">All systems operational. No issues detected.</span>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {issues.sort((a, b) => {
                            const scores: any = { 'CRITICAL': 3, 'WARNING': 2, 'INFO': 1 };
                            return scores[b.severity] - scores[a.severity];
                        }).map((issue, idx) => {
                            const isCritical = issue.severity === 'CRITICAL';
                            const isWarning = issue.severity === 'WARNING';
                            const color = isCritical ? 'text-[#FF2A6D] border-[#FF2A6D]/30 bg-[#FF2A6D]/10' : 
                                         isWarning ? 'text-[#FF9F1C] border-[#FF9F1C]/30 bg-[#FF9F1C]/10' : 
                                         'text-blue-400 border-blue-400/30 bg-blue-400/10';

                            return (
                                <div key={idx} className={`border p-4 rounded-lg flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center ${color}`}>
                                    <div className="flex items-start gap-3 flex-1">
                                        <ShieldAlert className="w-6 h-6 shrink-0 mt-1" />
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-[10px] font-black uppercase tracking-widest bg-black/50 px-2 py-0.5 rounded">{issue.severity}</span>
                                                <h3 className="text-sm font-bold">{issue.title}</h3>
                                            </div>
                                            <p className="text-xs opacity-80 mb-2">{issue.description}</p>
                                            <p className="text-[10px] font-mono opacity-60 uppercase">Detected {new Date(issue.detected_at).toLocaleTimeString()}</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2 w-full lg:w-auto">
                                        <button 
                                            type="button"
                                            onClick={() => handleCopy(issue.antigravity_prompt, `prompt-${issue.id}`)}
                                            className="flex items-center justify-center gap-2 px-3 py-1.5 bg-black/40 hover:bg-black/60 rounded text-xs font-bold transition-colors border border-white/10 whitespace-nowrap"
                                        >
                                            <Copy className="w-3 h-3" />
                                            {copiedId === `prompt-${issue.id}` ? 'Copied! ✓' : 'COPY ANTIGRAVITY PROMPT'}
                                        </button>
                                        {issue.railway_command && (
                                            <button 
                                                type="button"
                                                onClick={() => handleCopy(issue.railway_command, `cmd-${issue.id}`)}
                                                className="flex items-center justify-center gap-2 px-3 py-1.5 bg-black/40 hover:bg-black/60 rounded text-xs font-bold transition-colors border border-white/10 whitespace-nowrap"
                                            >
                                                <Terminal className="w-3 h-3" />
                                                {copiedId === `cmd-${issue.id}` ? 'Copied! ✓' : 'COPY RAILWAY CMD'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Charts & Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="bg-[#1a1a1a] border border-[#333] p-4 rounded-lg col-span-1 lg:col-span-2">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Audit Events ({metrics.range})</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={metrics.series.audit_events_by_day}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                <XAxis dataKey="date" stroke="#666" tick={{ fill: '#666', fontSize: 10 }} tickFormatter={val => val.split('-').slice(1).join('/')} />
                                <YAxis stroke="#666" tick={{ fill: '#666', fontSize: 10 }} />
                                <Tooltip contentStyle={{ backgroundColor: '#111', border: '1px solid #333' }} itemStyle={{ color: '#C5A059' }} />
                                <Line type="monotone" dataKey="value" stroke="#C5A059" strokeWidth={2} dot={{ r: 4, fill: '#111', stroke: '#C5A059' }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="space-y-4">
                    <div className="bg-[#1a1a1a] border border-[#333] p-4 rounded-lg">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Total Active Stores</h3>
                        <div className="text-3xl font-black text-white">{metrics.totals.stores_active}</div>
                    </div>
                    <div className="bg-[#1a1a1a] border border-[#333] p-4 rounded-lg">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Total Outlets</h3>
                        <div className="text-3xl font-black text-white">{metrics.totals.outlets_total}</div>
                    </div>
                    <div className="bg-[#1a1a1a] border border-[#333] p-4 rounded-lg">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Total Users</h3>
                        <div className="text-3xl font-black text-white">{metrics.totals.users_total}</div>
                    </div>
                </div>
            </div>

            {/* Tenant Health Table */}
            <div className="bg-[#1a1a1a] border border-[#333] rounded-lg overflow-hidden">
                <div className="p-4 border-b border-[#333]">
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest">ALL TENANTS</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-[#222] border-b border-[#333] text-xs font-mono text-gray-400 uppercase tracking-wider">
                            <tr>
                                <th className="px-4 py-3">Tenant</th>
                                <th className="px-4 py-3">Stores</th>
                                <th className="px-4 py-3">Outlets</th>
                                <th className="px-4 py-3">Users</th>
                                <th className="px-4 py-3">Last Activity</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Health</th>
                                <th className="px-4 py-3 text-right">Open</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#333]">
                            {tenants.sort((a, b) => {
                                const order: any = { 'ACTIVE': 0, 'PILOT': 1, 'INACTIVE': 2 };
                                return order[a.status] - order[b.status];
                            }).map(tenant => (
                                <tr key={tenant.company_id} className="hover:bg-[#252525] transition-colors">
                                    <td className="px-4 py-3 font-bold text-white">{tenant.name}</td>
                                    <td className="px-4 py-3 text-gray-300 font-mono">{tenant.stores_count}</td>
                                    <td className="px-4 py-3 text-gray-300 font-mono">{tenant.outlets_count}</td>
                                    <td className="px-4 py-3 text-gray-300 font-mono">{tenant.users_count}</td>
                                    <td className="px-4 py-3 text-gray-400 font-mono text-xs">
                                        {tenant.last_activity ? new Date(tenant.last_activity).toLocaleDateString() : 'Never'}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`text-[10px] font-bold px-2 py-1 rounded tracking-widest uppercase ${
                                            tenant.status === 'ACTIVE' ? 'bg-[#00FF94]/10 text-[#00FF94]' :
                                            tenant.status === 'PILOT' ? 'bg-[#C5A059]/10 text-[#C5A059]' :
                                            'bg-gray-800 text-gray-400'
                                        }`}>
                                            {tenant.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`text-[10px] font-bold px-2 py-1 rounded tracking-widest uppercase ${
                                            tenant.health === 'HEALTHY' ? 'bg-[#00FF94]/10 text-[#00FF94]' :
                                            tenant.health === 'STALE' ? 'bg-[#FF9F1C]/10 text-[#FF9F1C]' :
                                            'bg-gray-800 text-gray-400'
                                        }`}>
                                            {tenant.health}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        {tenant.subdomain ? (
                                            <a 
                                                href={`https://${tenant.subdomain}.brasameat.com`} 
                                                target="_blank" 
                                                rel="noreferrer"
                                                className="inline-flex items-center justify-center p-1.5 hover:bg-[#333] rounded text-gray-400 hover:text-white transition-colors"
                                            >
                                                <ArrowUpRight className="w-4 h-4" />
                                            </a>
                                        ) : (
                                            <span className="text-gray-600">-</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-[#1a1a1a] border border-[#333] p-4 rounded-lg">
                <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4">QUICK ACTIONS</h3>
                <div className="flex flex-wrap gap-3">
                    <button 
                        type="button"
                        onClick={() => handleCopy("railway environment\nrailway service\nrailway redeploy", 'qa-redeploy')}
                        className="flex items-center gap-2 px-4 py-2 bg-[#252525] hover:bg-[#333] border border-[#444] rounded text-xs font-bold text-gray-300 transition-colors"
                    >
                        <Copy className="w-4 h-4 text-[#C5A059]" />
                        {copiedId === 'qa-redeploy' ? 'Copied! ✓' : '📋 REDEPLOY'}
                    </button>
                    <button 
                        type="button"
                        onClick={() => handleCopy("railway logs --service meat-tracker-v2 | tail -50", 'qa-logs')}
                        className="flex items-center gap-2 px-4 py-2 bg-[#252525] hover:bg-[#333] border border-[#444] rounded text-xs font-bold text-gray-300 transition-colors"
                    >
                        <Copy className="w-4 h-4 text-[#C5A059]" />
                        {copiedId === 'qa-logs' ? 'Copied! ✓' : '📋 CHECK LOGS'}
                    </button>
                    <button 
                        type="button"
                        onClick={() => handleCopy(`pg_dump "postgresql://postgres:jGGSjkxLCUhXQYntCHXoJQKGVRuWhIWu@yamanote.proxy.rlwy.net:48358/railway" -f backup_$(date +%Y%m%d).sql`, 'qa-backup')}
                        className="flex items-center gap-2 px-4 py-2 bg-[#252525] hover:bg-[#333] border border-[#444] rounded text-xs font-bold text-gray-300 transition-colors"
                    >
                        <Copy className="w-4 h-4 text-[#C5A059]" />
                        {copiedId === 'qa-backup' ? 'Copied! ✓' : '📋 BACKUP DB'}
                    </button>
                    <button 
                        type="button"
                        onClick={() => handleCopy('railway variables set REDIS_URL="redis://default:PyJBKWWhOqskNXLREeMHNLeZZiezdlZZ@redis-j0qr.railway.internal:6379"', 'qa-redis')}
                        className="flex items-center gap-2 px-4 py-2 bg-[#252525] hover:bg-[#333] border border-[#444] rounded text-xs font-bold text-gray-300 transition-colors"
                    >
                        <Copy className="w-4 h-4 text-[#C5A059]" />
                        {copiedId === 'qa-redis' ? 'Copied! ✓' : '📋 FIX REDIS'}
                    </button>
                </div>
            </div>

            {/* Copy Prompt Modal Fallback */}
            {showCopyModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
                    <div className="bg-[#1a1a1a] border border-[#333] w-full max-w-lg rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                        <div className="p-4 border-b border-[#333] flex justify-between items-center bg-[#111]">
                            <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                                <Copy className="w-4 h-4 text-[#C5A059]" />
                                Copy this prompt
                            </h3>
                            <button onClick={() => setShowCopyModal(null)} className="text-gray-500 hover:text-white transition-colors">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-xs text-gray-400 mb-4 font-mono uppercase">Please use Cmd+C / Ctrl+C to copy manually:</p>
                            <textarea 
                                readOnly
                                autoFocus
                                onFocus={(e) => e.target.select()}
                                value={showCopyModal}
                                className="w-full h-48 bg-black border border-[#333] rounded-lg p-4 text-xs text-gray-300 font-mono resize-none focus:outline-none focus:border-[#C5A059]/50"
                            />
                        </div>
                        <div className="p-4 border-t border-[#333] bg-[#111] flex justify-end">
                            <button 
                                onClick={() => setShowCopyModal(null)}
                                className="px-6 py-2 bg-[#C5A059] text-black text-xs font-bold uppercase tracking-widest rounded-lg hover:bg-[#D4AF37] transition-all"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

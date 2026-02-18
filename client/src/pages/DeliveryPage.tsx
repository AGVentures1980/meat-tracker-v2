
import { useState, useEffect } from 'react';
import { Truck, RefreshCw, Camera, Upload, CheckCircle2, ShoppingCart } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

export const DeliveryPage = () => {
    const { t } = useLanguage();
    const { user } = useAuth();
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncStats, setSyncStats] = useState<any>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [scanResult, setScanResult] = useState<any>(null);
    const [timeRange, setTimeRange] = useState<'W' | 'M' | 'Q' | 'Y'>('W');
    const [pageError, setPageError] = useState<string | null>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [selectedEntry, setSelectedEntry] = useState<any>(null);
    const [networkStatus, setNetworkStatus] = useState<any[]>([]);

    const fetchHistory = async () => {
        try {
            const response = await fetch('/api/v1/delivery/history', {
                headers: { 'Authorization': `Bearer ${user?.token}` }
            });
            const data = await response.json();
            if (data.success) setHistory(data.history);
        } catch (error) {
            console.error('Failed to fetch history', error);
        }
    };

    const fetchNetworkStatus = async () => {
        try {
            const response = await fetch('/api/v1/delivery/network-status', {
                headers: { 'Authorization': `Bearer ${user?.token}` }
            });
            const data = await response.json();
            if (data.success) setNetworkStatus(data.stores);
        } catch (error) {
            console.error('Failed to fetch network status', error);
        }
    };

    useEffect(() => {
        fetchHistory();
        if (['admin', 'director'].includes(user?.role || '')) {
            fetchNetworkStatus();
        }
    }, [user]);

    const handleOloSync = async () => {
        setIsSyncing(true);
        setPageError(null);
        try {
            const response = await fetch('/api/v1/delivery/sync-olo', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user?.token}`
                },
                body: JSON.stringify({ storeId: 1, date: new Date().toISOString() })
            });

            if (!response.ok) {
                throw new Error(`Sync Error: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();
            if (result.success) {
                setSyncStats({
                    meatLbs: result.metrics.totalLbs,
                    guests: result.metrics.calculatedGuests,
                    proteins: result.proteinBreakdown,
                    calculatedAt: new Date().toLocaleTimeString(),
                    status: 'success'
                });
                fetchHistory(); // Refresh BI
            }
        } catch (error: any) {
            setPageError(error.message);
            console.error('Sync failed', error);
        } finally {
            setIsSyncing(false);
        }
    };

    const handleTicketUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsScanning(true);
        setPageError(null);
        const formData = new FormData();
        formData.append('ticket', file);

        try {
            const response = await fetch('/api/v1/delivery/process-ticket', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${user?.token}`
                },
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Upload failed (${response.status})`);
            }

            const result = await response.json();
            if (result.success) {
                setScanResult(result);
                fetchHistory(); // Refresh BI
            } else {
                setPageError(result.error || 'Unknown error');
            }
        } catch (error: any) {
            setPageError(error.message);
            console.error('Scan failed', error);
        } finally {
            setIsScanning(false);
        }
    };

    const isDirectorOrAdmin = ['admin', 'director'].includes(user?.role || '');

    return (
        <div className="p-6 h-[calc(100vh-6rem)] overflow-y-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                        <Truck className="w-8 h-8 text-brand-gold" />
                        {t('delivery_title')}
                    </h1>
                    <p className="text-gray-500 text-sm mt-1 font-mono uppercase tracking-wider">{t('delivery_subtitle')}</p>
                </div>

                {pageError && (
                    <div className="flex-1 mx-8 bg-red-500/10 border border-red-500/50 p-3 rounded-sm flex items-center gap-3 animate-in slide-in-from-top-2">
                        <span className="text-red-500 text-xs font-bold uppercase font-mono">System Error: {pageError}</span>
                    </div>
                )}

                <div className="flex bg-[#1a1a1a] p-1 rounded-sm border border-[#333]">
                    {['W', 'M', 'Q', 'Y'].map((range) => (
                        <button
                            key={range}
                            onClick={() => setTimeRange(range as any)}
                            className={`px-4 py-2 text-[10px] font-bold transition-all ${timeRange === range
                                ? 'bg-brand-gold text-black shadow-lg'
                                : 'text-gray-500 hover:text-white'
                                }`}
                        >
                            {range === 'W' ? 'WEEKLY' : range === 'M' ? 'MONTHLY' : range === 'Q' ? 'QUARTERLY' : 'ANNUAL'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Director/Admin View: Network Status Grid */}
            {(user?.role === 'admin' || user?.role === 'director') ? (
                <div className="mb-8">
                    <div className="bg-[#1a1a1a] border border-[#333] rounded-sm p-6">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <RefreshCw className="w-5 h-5 text-[#00FF94]" />
                            Live Network Status
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                            {networkStatus.map((store) => {
                                return (
                                    <div key={store.id} className={`p-4 border ${store.status === 'online' ? 'border-[#333] bg-[#1a1a1a]' : 'border-red-900/20 bg-red-900/5'} rounded-sm relative group hover:border-[#C5A059]/30 transition-all`}>
                                        <div className="flex justify-between items-start mb-3">
                                            <span className={`text-[10px] font-bold uppercase tracking-widest ${store.status === 'online' ? 'text-white' : 'text-red-500'}`}>
                                                {store.name}
                                            </span>
                                            <span className={`w-1.5 h-1.5 rounded-full ${store.status === 'online' ? 'bg-[#00FF94] shadow-[0_0_8px_#00FF94]' : 'bg-red-500'}`}></span>
                                        </div>

                                        <div className="space-y-1">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[9px] text-gray-500 uppercase font-bold tracking-tighter">Deliveries:</span>
                                                <span className="text-sm font-bold text-white font-mono">{store.deliveryCount}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-[9px] text-gray-500 uppercase font-bold tracking-tighter">Volume:</span>
                                                <span className="text-sm font-bold text-gray-300 font-mono">{store.totalLbs.toFixed(0)} <span className="text-[10px] text-gray-500">lbs</span></span>
                                            </div>
                                            <div className="flex justify-between items-center pt-2">
                                                <span className="text-[9px] text-gray-500 uppercase font-bold tracking-tighter">Last Sync:</span>
                                                <span className="text-[9px] text-gray-400 font-mono">{store.lastSync}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    {/* OLO Sync Card */}
                    <div className="bg-[#1a1a1a] border border-[#333] rounded-sm p-6 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <ShoppingCart className="w-24 h-24" />
                        </div>

                        <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                            <RefreshCw className={`w-5 h-5 text-blue-400 ${isSyncing ? 'animate-spin' : ''}`} />
                            OLO Cloud Integration
                        </h3>
                        <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                            Direct connection to Texas de Brazil's OLO API.
                            Calculates guest counts using standard meat metrics.
                        </p>

                        {syncStats ? (
                            <div className="animate-in slide-in-from-bottom-2 duration-500">
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div className="bg-[#121212] p-4 border border-[#333] rounded-sm">
                                        <p className="text-[10px] text-gray-500 uppercase font-mono mb-1">Meat Yield (Lbs)</p>
                                        <p className="text-2xl font-bold text-brand-gold">{syncStats.meatLbs}</p>
                                    </div>
                                    <div className="bg-[#121212] p-4 border border-[#333] rounded-sm">
                                        <p className="text-[10px] text-gray-500 uppercase font-mono mb-1">Calculated Guests</p>
                                        <p className="text-2xl font-bold text-[#00FF94]">{syncStats.guests}</p>
                                    </div>
                                </div>

                                {/* Protein Breakdown */}
                                <div className="bg-[#121212] p-4 border border-[#333] rounded-sm mb-6 max-h-48 overflow-y-auto">
                                    <h4 className="text-[9px] uppercase text-gray-400 font-bold mb-3 flex justify-between border-b border-[#333] pb-2">
                                        <span>Protein Distribution</span>
                                        <span>Lbs</span>
                                    </h4>
                                    <div className="space-y-2">
                                        {(syncStats.proteins || []).map((p: any, i: number) => (
                                            <div key={i} className="flex justify-between items-center text-xs">
                                                <span className="text-gray-300">{p.protein}</span>
                                                <span className="text-brand-gold font-mono font-bold">{p.lbs.toFixed(1)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="h-48 flex flex-col items-center justify-center border-2 border-dashed border-[#333] rounded-sm mb-6 bg-[#121212]">
                                <p className="text-xs text-gray-600 font-mono uppercase italic">Awaiting API Synchronization</p>
                            </div>
                        )}

                        <button
                            onClick={handleOloSync}
                            disabled={isSyncing}
                            className="w-full bg-brand-gold hover:bg-yellow-500 text-black px-6 py-3 rounded-sm font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all disabled:opacity-50 active:scale-[0.98]"
                        >
                            {isSyncing ? 'Syncing Cloud...' : t('sync_olo')}
                        </button>
                    </div>

                    {/* OCR Upload Card */}
                    <div className="bg-[#1a1a1a] border border-[#333] rounded-sm p-6 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Camera className="w-24 h-24" />
                        </div>

                        <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                            <Camera className="w-5 h-5 text-[#FF2A6D]" />
                            OCR Receipt Processing
                        </h3>
                        <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                            Upload delivery tickets (PDF/JPG). Decomposes mixed
                            tickets (e.g. 5LB) into specific proteins.
                        </p>

                        {scanResult ? (
                            <div className="animate-in fade-in duration-500">
                                <div className="bg-[#121212] p-4 border border-brand-gold/30 rounded-sm mb-6">
                                    <h4 className="text-[9px] uppercase text-gray-400 font-bold mb-3 flex justify-between border-b border-[#333] pb-2">
                                        <span>OCR Meat Identified</span>
                                        <span>Weight (Lbs)</span>
                                    </h4>
                                    <div className="space-y-2">
                                        {(scanResult.proteinBreakdown || []).map((p: any, i: number) => (
                                            <div key={i} className="flex justify-between items-center text-xs">
                                                <span className="text-white font-medium">{p.protein}</span>
                                                <span className="text-brand-gold font-mono font-bold">{p.lbs.toFixed(1)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <button
                                    onClick={() => setScanResult(null)}
                                    className="w-full border border-[#444] text-gray-400 hover:text-white hover:bg-[#333] px-6 py-2 rounded-sm font-bold text-[10px] uppercase tracking-widest transition-all mb-4"
                                >
                                    Reset & Scan New Ticket
                                </button>
                            </div>
                        ) : (
                            <label className="h-48 border-2 border-dashed border-[#333] hover:border-brand-gold/50 transition-all rounded-sm flex flex-col items-center justify-center bg-[#121212] cursor-pointer group/upload mb-6">
                                <input type="file" className="hidden" onChange={handleTicketUpload} accept="image/*" />
                                {isScanning ? (
                                    <>
                                        <RefreshCw className="w-8 h-8 text-brand-gold animate-spin mb-2" />
                                        <p className="text-xs text-brand-gold font-mono uppercase animate-pulse italic">Scanning Protein ID...</p>
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-8 h-8 text-gray-600 group-hover/upload:text-brand-gold transition-colors mb-2" />
                                        <p className="text-xs text-gray-500 font-mono uppercase group-hover/upload:text-gray-300">{t('scan_ticket')}</p>
                                    </>
                                )}
                            </label>
                        )}

                        {!scanResult && (
                            <div className="p-4 border border-[#333] rounded-sm bg-[#151515]">
                                <h4 className="text-[10px] uppercase text-gray-500 font-bold mb-3 tracking-widest">Identification Engine</h4>
                                <p className="text-[11px] text-gray-400 italic">Standard decomposition active for mixed packs</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* PERSISTENT BI HISTORY SECTION */}
            <div className="bg-[#1a1a1a] border border-[#333] rounded-sm p-6 overflow-hidden">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-[#00FF94]" />
                            Delivery Protein Intelligence (BI)
                        </h3>
                        <p className="text-xs text-gray-500 font-mono uppercase italic">Historical consumption volume from OLO & OCR</p>
                    </div>
                </div>

                {history.length > 0 ? (
                    <div className="space-y-6">
                        <div className="h-48 w-full bg-[#121212] border border-[#333] rounded-sm relative p-4 flex items-end gap-2">
                            {history.slice(-14).map((h, i) => (
                                <div
                                    key={i}
                                    className="flex-1 flex flex-col items-center group/bar cursor-pointer"
                                    onClick={() => setSelectedEntry(h)}
                                >
                                    <div
                                        className={`w-full border-t transition-all ${selectedEntry?.id === h.id ? 'bg-brand-gold border-white' : 'bg-brand-gold/20 border-brand-gold group-hover/bar:bg-brand-gold/40'}`}
                                        style={{ height: `${(h.total_lbs / Math.max(...history.map(x => x.total_lbs))) * 100}%` }}
                                    ></div>
                                    <p className="text-[8px] text-gray-600 mt-2 font-mono">
                                        {new Date(h.date).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' })}
                                    </p>
                                    <div className="absolute opacity-0 group-hover/bar:opacity-100 bottom-full mb-2 bg-brand-gold text-black text-[10px] font-bold p-1 rounded-sm whitespace-nowrap pointer-events-none z-10">
                                        {h.source}: {h.total_lbs} LBS (Click for Detail)
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* selectedEntry Detail Overlay */}
                        {selectedEntry && (
                            <div className="bg-[#121212] border border-brand-gold/50 p-4 rounded-sm animate-in slide-in-from-top-4">
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="text-xs font-bold text-brand-gold uppercase tracking-widest">
                                        Detailed Breakdown: {new Date(selectedEntry.date).toLocaleDateString()} ({selectedEntry.source})
                                    </h4>
                                    <button onClick={() => setSelectedEntry(null)} className="text-gray-500 hover:text-white text-xs">✕ CLOSE</button>
                                </div>
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                    {(selectedEntry.protein_breakdown || []).map((p: any, idx: number) => (
                                        <div key={idx} className="bg-[#1a1a1a] p-2 border border-[#333] rounded-sm flex justify-between items-center">
                                            <span className="text-[10px] text-gray-400 capitalize">{p.protein}</span>
                                            <span className="text-xs font-bold text-white font-mono">{p.lbs.toFixed(1)} LB</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-[#121212] p-3 border border-[#333] rounded-sm">
                                <p className="text-[9px] text-gray-500 uppercase font-bold mb-1">Cycle Total (Lbs)</p>
                                <p className="text-xl font-serif text-white">{history.reduce((acc, curr) => acc + curr.total_lbs, 0).toFixed(1)} LB</p>
                            </div>
                            <div className="bg-[#121212] p-3 border border-[#333] rounded-sm">
                                <p className="text-[9px] text-gray-500 uppercase font-bold mb-1">Active Database Entries</p>
                                <p className="text-xl font-serif text-brand-gold">{history.length}</p>
                            </div>
                            <div className="bg-[#121212] p-3 border border-[#333] rounded-sm">
                                <p className="text-[9px] text-gray-500 uppercase font-bold mb-1">Latest Order Source</p>
                                <p className="text-xl font-serif text-[#00FF94]">{history[history.length - 1]?.source || 'None'}</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="h-48 border border-dashed border-[#333] rounded-sm flex items-center justify-center bg-[#121212]">
                        <p className="text-xs text-gray-600 font-mono uppercase italic animate-pulse">No Historical Data Found. Sync APIs to begin persistence.</p>
                    </div>
                )}
            </div>

            {/* Legend */}
            <div className="mt-8 flex gap-6 px-2">
                <div className="flex items-center gap-2 text-[10px] text-gray-500 uppercase font-mono">
                    <div className="w-2 h-2 bg-brand-gold"></div>
                    Verified Consumption
                </div>
                <div className="flex items-center gap-2 text-[10px] text-gray-500 uppercase font-mono">
                    <div className="w-2 h-2 bg-blue-500"></div>
                    OLO Integration
                </div>
                <div className="flex items-center gap-2 text-[10px] text-gray-500 uppercase font-mono">
                    <div className="w-2 h-2 bg-[#FF2A6D]"></div>
                    OCR Scan ID
                </div>
            </div>
        </div >
    );
};

import { useState } from 'react';
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
            console.log('Scan result received:', result);

            if (result.success) {
                setScanResult(result);
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="bg-[#121212] p-4 border border-[#333] rounded-sm">
                                    <p className="text-[10px] text-gray-500 uppercase font-mono mb-1">Meat Yield (Lbs)</p>
                                    <p className="text-2xl font-bold text-brand-gold">{syncStats.meatLbs}</p>
                                </div>
                                <div className="bg-[#121212] p-4 border border-[#333] rounded-sm">
                                    <p className="text-[10px] text-gray-500 uppercase font-mono mb-1">Calculated Guests</p>
                                    <p className="text-2xl font-bold text-[#00FF94]">{syncStats.guests}</p>
                                </div>
                            </div>

                            {/* Protein Breakdown Table */}
                            <div className="bg-[#121212] border border-[#333] rounded-sm p-4 mb-6">
                                <h4 className="text-[10px] uppercase text-gray-500 font-bold mb-3 tracking-widest flex justify-between">
                                    Protein Distribution
                                    <span className="text-brand-gold">ACTUAL LBS</span>
                                </h4>
                                <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                                    {syncStats.proteins?.map((p: any, i: number) => (
                                        <div key={i} className="flex flex-col gap-1">
                                            <div className="flex justify-between text-[11px]">
                                                <span className="text-gray-300">{p.protein}</span>
                                                <span className="text-white font-mono">{p.lbs} LB</span>
                                            </div>
                                            <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-brand-gold"
                                                    style={{ width: `${(p.lbs / syncStats.meatLbs) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-48 flex flex-col items-center justify-center border-2 border-dashed border-[#333] rounded-sm mb-6 bg-[#121212]">
                            <p className="text-xs text-gray-600 font-mono">AWAITING {timeRange} SYNC</p>
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
                        <div className="mb-6 animate-in fade-in duration-500">
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div className="bg-[#121212] p-3 border border-brand-gold/30 rounded-sm">
                                    <p className="text-[9px] text-gray-500 uppercase font-mono mb-1">Total Lbs Scan</p>
                                    <p className="text-xl font-bold text-white">{scanResult.metrics.totalLbs}</p>
                                </div>
                                <div className="bg-[#121212] p-3 border border-brand-gold/30 rounded-sm">
                                    <p className="text-[9px] text-gray-500 uppercase font-mono mb-1">Calculated Guests</p>
                                    <p className="text-xl font-bold text-brand-gold">{scanResult.metrics.calculatedGuests}</p>
                                </div>
                            </div>

                            {/* OCR breakdown */}
                            <div className="bg-[#121212] border border-[#333] rounded-sm p-3 mb-4">
                                <p className="text-[10px] text-gray-500 uppercase font-bold mb-3 flex justify-between">
                                    Protein Identification
                                    <span className="text-brand-gold">ORDER: {scanResult.items[0]?.id.slice(-5)}</span>
                                </p>
                                {scanResult.proteinBreakdown?.map((p: any, i: number) => (
                                    <div key={i} className="flex flex-col gap-2 mb-3 last:mb-0">
                                        <div className="flex justify-between text-[11px]">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-brand-gold shadow-[0_0_8px_rgba(223,178,89,0.5)]" />
                                                <span className="text-gray-200 font-bold">{p.protein}</span>
                                            </div>
                                            <span className="text-white font-mono">{p.lbs} LB</span>
                                        </div>
                                        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-brand-gold transition-all duration-1000"
                                                style={{ width: `${(p.lbs / scanResult.metrics.totalLbs) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <label className="h-32 border-2 border-dashed border-[#333] hover:border-brand-gold/50 transition-all rounded-sm flex flex-col items-center justify-center bg-[#121212] cursor-pointer group/upload mb-6">
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

                    {scanResult ? (
                        <button
                            onClick={() => setScanResult(null)}
                            className="w-full border border-[#444] text-gray-400 hover:text-white hover:bg-[#333] px-6 py-2 rounded-sm font-bold text-[10px] uppercase tracking-widest transition-all"
                        >
                            Reset & Scan New Ticket
                        </button>
                    ) : (
                        <div className="mt-6 p-4 border border-[#333] rounded-sm bg-[#151515]">
                            <h4 className="text-[10px] uppercase text-gray-500 font-bold mb-3 tracking-widest">Identification Engine</h4>
                            <p className="text-[11px] text-gray-400 mb-2 italic">Standard decomposition active for mixed packs:</p>
                            <div className="space-y-1">
                                <div className="flex justify-between text-[10px]">
                                    <span className="text-gray-500 tracking-tighter italic">Picanha / Flank / Chicken / Sausage Mapping...</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Compliance Sidebar Mockup */}
            <div className="mt-8 bg-[#1a1a1a] border border-[#333] rounded-sm p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-[#00FF94]/10 rounded-full">
                        <CheckCircle2 className="w-6 h-6 text-[#00FF94]" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-white">Protein Intelligence Active</p>
                        <p className="text-[10px] text-gray-500 font-mono uppercase italic">Identifying specific meat types from mixed orders...</p>
                    </div>
                </div>
                <div className="flex gap-4">
                    <div className="text-right">
                        <p className="text-[10px] text-gray-500 uppercase font-mono">Sync Accuracy</p>
                        <p className="text-sm font-bold text-[#00FF94]">99.2%</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] text-gray-500 uppercase font-mono">Active Target</p>
                        <p className="text-sm font-bold text-white">0.5 LB/2G</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

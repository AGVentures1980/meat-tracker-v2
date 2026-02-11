import { useState } from 'react';
import { Truck, RefreshCw, Camera, Upload, CheckCircle2, AlertCircle, ShoppingCart } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export const DeliveryPage = () => {
    const { t } = useLanguage();
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncStats, setSyncStats] = useState<any>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [scanResult, setScanResult] = useState<any>(null);

    const handleOloSync = async () => {
        setIsSyncing(true);
        try {
            const response = await fetch('/api/v1/delivery/sync-olo', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('brasa_token')}`
                },
                body: JSON.stringify({ storeId: 1, date: new Date().toISOString() })
            });

            const result = await response.json();
            if (result.success) {
                setSyncStats({
                    meatLbs: result.metrics.totalLbs,
                    guests: result.metrics.calculatedGuests,
                    calculatedAt: new Date().toLocaleTimeString(),
                    status: 'success'
                });
            }
        } catch (error) {
            console.error('Sync failed', error);
        } finally {
            setIsSyncing(false);
        }
    };

    const handleTicketUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsScanning(true);
        const formData = new FormData();
        formData.append('ticket', file);

        try {
            const token = localStorage.getItem('brasa_token');
            const response = await fetch('/api/v1/delivery/process-ticket', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            const result = await response.json();
            if (result.success) {
                setScanResult(result);
            }
        } catch (error) {
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
                    ) : (
                        <div className="h-24 flex items-center justify-center border-2 border-dashed border-[#333] rounded-sm mb-6 bg-[#121212]">
                            <p className="text-xs text-gray-600 font-mono">NO SYNC DATA FOR THIS PERIOD</p>
                        </div>
                    )}

                    <button
                        onClick={handleOloSync}
                        disabled={isSyncing}
                        className="w-full bg-brand-gold hover:bg-yellow-500 text-black px-6 py-3 rounded-sm font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all disabled:opacity-50 active:scale-[0.98]"
                    >
                        {isSyncing ? 'Syncing Cloud...' : t('sync_olo')}
                    </button>

                    {syncStats && (
                        <p className="text-[10px] text-gray-600 mt-3 font-mono text-center">
                            LAST SYNC: {syncStats.calculatedAt}
                        </p>
                    )}
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
                        Upload delivery tickets or receipts to manually verify consumption.
                        Uses AI to map items to protein categories.
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
                            <div className="bg-[#121212] border border-[#333] rounded-sm p-3 max-h-32 overflow-y-auto">
                                <p className="text-[10px] text-gray-500 uppercase font-bold mb-2">Detected Items</p>
                                {scanResult.items.map((item: any, i: number) => (
                                    <div key={i} className="flex justify-between text-[11px] py-1 border-b border-[#222]">
                                        <span className="text-gray-300">{item.item}</span>
                                        <span className="text-brand-gold">x{item.qty}</span>
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
                                    <p className="text-xs text-brand-gold font-mono uppercase animate-pulse italic">Scanning Meat Data...</p>
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
                        <div className="mt-6 p-4 border border-[#333] rounded-sm bg-[#151515]">
                            <h4 className="text-[10px] uppercase text-gray-500 font-bold mb-3 tracking-widest">Processing Logic</h4>
                            <div className="space-y-2">
                                <div className="flex justify-between text-[11px]">
                                    <span className="text-gray-400">Churrasco Feast</span>
                                    <span className="text-brand-gold font-bold">2.0 LBS = 4 GUESTS</span>
                                </div>
                                <div className="flex justify-between text-[11px]">
                                    <span className="text-gray-400">Churrasco Plate</span>
                                    <span className="text-brand-gold font-bold">1.0 LB = 1 GUEST</span>
                                </div>
                                <div className="flex justify-between text-[11px]">
                                    <span className="text-gray-400">Loose Meat (Rules)</span>
                                    <span className="text-brand-gold font-bold">0.5 LB = 2 GUESTS</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {scanResult && (
                        <button
                            onClick={() => setScanResult(null)}
                            className="w-full border border-[#444] text-gray-400 hover:text-white hover:bg-[#333] px-6 py-2 rounded-sm font-bold text-[10px] uppercase tracking-widest transition-all"
                        >
                            Reset & Scan New Ticket
                        </button>
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
                        <p className="text-sm font-bold text-white">Conversion Rules Applied</p>
                        <p className="text-[10px] text-gray-500 font-mono uppercase">Version 1.2 "Garcia Logic" Active</p>
                    </div>
                </div>
                <div className="flex gap-4">
                    <div className="text-right">
                        <p className="text-[10px] text-gray-500 uppercase font-mono">Olo Reliability</p>
                        <p className="text-sm font-bold text-[#00FF94]">99.8%</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] text-gray-500 uppercase font-mono">Avg Variance</p>
                        <p className="text-sm font-bold text-white">±0.2 lbs</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

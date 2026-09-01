import React, { useState } from 'react';
import { Activity, ArrowUpRight, ShieldCheck, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface BrandPulseTileProps {
    variant?: 'card' | 'banner' | 'nav_button' | 'compact';
    className?: string;
}

export const BrandPulseTile: React.FC<BrandPulseTileProps> = ({ variant = 'card', className = '' }) => {
    const { user, selectedCompany } = useAuth();
    const [loading, setLoading] = useState(false);
    const [modalInfo, setModalInfo] = useState<{
        open: boolean;
        title: string;
        status: string;
        message: string;
        fullRedirectUrl?: string;
    } | null>(null);

    const handleHandoff = async (e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        if (!user?.token || loading) return;
        setLoading(true);

        try {
            const res = await fetch('/api/v1/pulse/handoff', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token}`,
                    'x-company-id': selectedCompany || user.companyId || ''
                }
            });

            const data = await res.json();

            if (res.ok && data.success && data.fullRedirectUrl) {
                // Requirement 6: DIRECT LIVE SSO REDIRECT TO BRAND PULSE RECEIVER
                window.open(data.fullRedirectUrl, '_blank', 'noopener,noreferrer');
            } else {
                // Requirement 12: Controlled user-facing error message without exposing secrets
                setModalInfo({
                    open: true,
                    title: 'BRASA Pulse Access Notice',
                    status: data.status || 'SERVICE_UNAVAILABLE',
                    message: data.message || 'BRASA Pulse service is temporarily unavailable. Please try again or contact your administrator.',
                    fullRedirectUrl: data.fullRedirectUrl
                });
            }
        } catch (err: any) {
            console.error('Pulse SSO Handoff Error:', err);
            setModalInfo({
                open: true,
                title: 'Connection Error',
                status: 'NETWORK_ERROR',
                message: 'BRASA Pulse service is temporarily unreachable. Please check network connection.'
            });
        } finally {
            setLoading(false);
        }
    };

    if (variant === 'nav_button') {
        return (
            <>
                <button
                    onClick={handleHandoff}
                    disabled={loading}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-all group ${
                        loading ? 'opacity-70 cursor-wait' : 'hover:bg-amber-500/10 hover:border-amber-500/30'
                    } border border-transparent ${className}`}
                >
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-md bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
                            <Activity className="w-4 h-4" />
                        </div>
                        <div>
                            <div className="font-bold text-sm text-white flex items-center gap-1.5">
                                BRASA Pulse
                                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                    Guest AI
                                </span>
                            </div>
                            <div className="text-[11px] text-gray-400 font-normal">
                                Reputation & Guest Intelligence
                            </div>
                        </div>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-gray-500 group-hover:text-amber-400 transition-colors" />
                </button>

                {modalInfo?.open && <HandoffModal info={modalInfo} onClose={() => setModalInfo(null)} />}
            </>
        );
    }

    if (variant === 'compact') {
        return (
            <>
                <div
                    onClick={handleHandoff}
                    className={`cursor-pointer p-4 rounded-xl bg-gradient-to-r from-neutral-900 via-neutral-900 to-amber-950/30 border border-amber-500/20 hover:border-amber-500/40 transition-all ${className}`}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                                <Activity className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="text-base font-bold text-white tracking-wide">BRASA Pulse</h4>
                                <p className="text-xs text-amber-200/70">Reputation & Guest Intelligence</p>
                            </div>
                        </div>
                        <button
                            disabled={loading}
                            className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500 hover:text-black transition-all flex items-center gap-1"
                        >
                            {loading ? 'Authenticating...' : 'Open Pulse'}
                            <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>

                {modalInfo?.open && <HandoffModal info={modalInfo} onClose={() => setModalInfo(null)} />}
            </>
        );
    }

    // Default 'card' variant for Main Dashboard Integration (Requirement 4)
    return (
        <>
            <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#141414] via-[#1a1813] to-[#241c0e] border border-[#C5A059]/30 p-6 shadow-2xl transition-all hover:border-[#C5A059]/60 ${className}`}>
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                    <Sparkles className="w-40 h-40 text-[#C5A059]" />
                </div>

                <div className="flex items-start justify-between relative z-10 mb-4">
                    <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-xl bg-[#C5A059]/15 border border-[#C5A059]/40 flex items-center justify-center text-[#C5A059] shadow-inner">
                            <Activity className="w-6 h-6 animate-pulse" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-xl font-extrabold text-white tracking-wide">BRASA Pulse</h3>
                                <span className="text-[10px] font-mono font-bold tracking-widest px-2 py-0.5 rounded-full bg-[#C5A059]/20 text-[#C5A059] border border-[#C5A059]/40 uppercase">
                                    Guest AI
                                </span>
                            </div>
                            <p className="text-sm text-[#C5A059]/80 font-medium">
                                Reputation & Guest Intelligence
                            </p>
                        </div>
                    </div>
                </div>

                <p className="text-xs text-gray-400 mb-6 relative z-10 leading-relaxed">
                    Direct single sign-on access to guest sentiment, Google/Yelp reviews, competitive intelligence, and reputation analytics. Automatically scoped to your assigned stores.
                </p>

                <div className="flex items-center justify-between pt-4 border-t border-[#333]/60 relative z-10">
                    <div className="flex items-center gap-2 text-[11px] text-gray-400 font-mono">
                        <ShieldCheck className="w-3.5 h-3.5 text-[#C5A059]" />
                        <span>Scope: Derived from Session</span>
                    </div>

                    <button
                        onClick={handleHandoff}
                        disabled={loading}
                        className="px-5 py-2.5 bg-gradient-to-r from-[#C5A059] to-[#E5C158] hover:from-[#d4b068] hover:to-[#f5d168] text-black font-extrabold text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg hover:shadow-[#C5A059]/20 flex items-center gap-2 disabled:opacity-50"
                    >
                        {loading ? (
                            <span>Generating SSO Token...</span>
                        ) : (
                            <>
                                <span>Open Pulse</span>
                                <ArrowUpRight className="w-4 h-4" />
                            </>
                        )}
                    </button>
                </div>
            </div>

            {modalInfo?.open && <HandoffModal info={modalInfo} onClose={() => setModalInfo(null)} />}
        </>
    );
};

const HandoffModal: React.FC<{ info: any; onClose: () => void }> = ({ info, onClose }) => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
            <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-[#121212] border border-[#C5A059]/40 p-6 shadow-2xl text-white">
                <div className="flex items-center gap-3 mb-4">
                    <AlertCircle className="w-6 h-6 text-[#C5A059]" />
                    <h3 className="text-lg font-bold tracking-wide">{info.title}</h3>
                </div>

                <p className="text-xs text-gray-300 mb-6 leading-relaxed">
                    {info.message}
                </p>

                <div className="flex justify-end gap-3 pt-2 border-t border-neutral-800">
                    <button
                        onClick={onClose}
                        className="px-5 py-2 text-xs font-bold uppercase tracking-wider rounded-lg border border-neutral-700 hover:bg-neutral-800 text-gray-300 transition-all"
                    >
                        Close
                    </button>
                    {info.fullRedirectUrl && (
                        <a
                            href={info.fullRedirectUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-5 py-2 text-xs font-bold uppercase tracking-wider rounded-lg bg-[#C5A059] text-black hover:bg-[#d4b068] transition-all flex items-center gap-1.5"
                        >
                            <span>Retry Connection</span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                        </a>
                    )}
                </div>
            </div>
        </div>
    );
};

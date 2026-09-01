import React, { useState, useEffect } from 'react';
import { Activity, ArrowUpRight, ShieldCheck, Sparkles, AlertCircle, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface BrandPulseTileProps {
    variant?: 'card' | 'banner' | 'nav_button' | 'compact';
    className?: string;
}

export const BrandPulseTile: React.FC<BrandPulseTileProps> = ({ variant = 'card', className = '' }) => {
    const { user, selectedCompany } = useAuth();
    const [loading, setLoading] = useState(false);
    const [entitlementChecked, setEntitlementChecked] = useState(false);
    const [isEntitled, setIsEntitled] = useState(true); // Default optimistic while checking
    const [modalInfo, setModalInfo] = useState<{
        open: boolean;
        title: string;
        status: string;
        message: string;
        fullRedirectUrl?: string;
    } | null>(null);

    useEffect(() => {
        let mounted = true;
        const checkEntitlement = async () => {
            if (!user?.token) return;
            try {
                const res = await fetch('/api/v1/pulse/entitlement/status', {
                    headers: {
                        'Authorization': `Bearer ${user.token}`,
                        'x-company-id': selectedCompany || user.companyId || ''
                    }
                });
                if (res.ok) {
                    const data = await res.json();
                    if (mounted) {
                        setIsEntitled(data.entitled === true);
                        setEntitlementChecked(true);
                    }
                }
            } catch (err) {
                // Keep default optimistic if network fails
            }
        };
        checkEntitlement();
        return () => { mounted = false; };
    }, [user?.token, selectedCompany, user?.companyId]);

    const handleHandoff = async (e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        if (!isEntitled) {
            setModalInfo({
                open: true,
                title: 'BRASA Pulse — Module Not Enabled',
                status: 'PULSE_NOT_ENTITLED',
                message: 'BRASA Pulse (Reputation & Guest Intelligence) is not currently enabled for your organization. Please contact a BRASA Administrator to activate this module.'
            });
            return;
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
                // DIRECT LIVE SSO REDIRECT TO BRAND PULSE RECEIVER
                window.open(data.fullRedirectUrl, '_blank', 'noopener,noreferrer');
            } else if (data.error === 'PULSE_ENTITLEMENT_REQUIRED' || data.status === 'PULSE_NOT_ENTITLED') {
                setIsEntitled(false);
                setModalInfo({
                    open: true,
                    title: 'BRASA Pulse — Module Not Enabled',
                    status: 'PULSE_NOT_ENTITLED',
                    message: 'BRASA Pulse is not enabled for your organization. Contact your administrator.'
                });
            } else {
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
                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition-all group overflow-hidden ${
                        !isEntitled ? 'opacity-50 hover:bg-neutral-800/30' : loading ? 'opacity-70 cursor-wait' : 'hover:bg-amber-500/10 hover:border-amber-500/30'
                    } border border-transparent ${className}`}
                >
                    <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                        <div className={`w-7 h-7 rounded-md border flex items-center justify-center shrink-0 transition-transform ${
                            !isEntitled ? 'bg-neutral-800 border-neutral-700 text-gray-500' : 'bg-amber-500/10 border-amber-500/20 text-amber-400 group-hover:scale-105'
                        }`}>
                            {isEntitled ? <Activity className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                        </div>
                        <div className="min-w-0 flex-1 overflow-hidden">
                            <div className="flex items-center gap-1.5 whitespace-nowrap overflow-hidden">
                                <span className="font-bold text-xs text-white shrink-0 whitespace-nowrap">
                                    BRASA Pulse
                                </span>
                                <span className={`text-[8px] uppercase font-mono px-1 py-0.5 rounded border shrink-0 whitespace-nowrap leading-none ${
                                    !isEntitled ? 'bg-neutral-800 text-gray-400 border-neutral-700' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                }`}>
                                    {isEntitled ? 'Guest AI' : 'Disabled'}
                                </span>
                            </div>
                            <div className="text-[9.5px] text-gray-400 font-normal truncate leading-tight mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">
                                {isEntitled ? 'Reputation & Guest Intel' : 'Not enabled for org'}
                            </div>
                        </div>
                    </div>
                    {isEntitled ? (
                        <ArrowUpRight className="w-3.5 h-3.5 text-gray-500 shrink-0 ml-1 group-hover:text-amber-400 transition-colors" />
                    ) : (
                        <Lock className="w-3 h-3 text-gray-600 shrink-0 ml-1" />
                    )}
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
                    className={`cursor-pointer p-4 rounded-xl bg-gradient-to-r from-neutral-900 via-neutral-900 to-amber-950/30 border transition-all ${
                        !isEntitled ? 'border-neutral-800 opacity-60' : 'border-amber-500/20 hover:border-amber-500/40'
                    } ${className}`}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-10 h-10 rounded-lg border flex items-center justify-center shrink-0 ${
                                !isEntitled ? 'bg-neutral-800 border-neutral-700 text-gray-500' : 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                            }`}>
                                {isEntitled ? <Activity className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                            </div>
                            <div className="min-w-0">
                                <h4 className="text-base font-bold text-white tracking-wide whitespace-nowrap">BRASA Pulse</h4>
                                <p className="text-xs text-amber-200/70 truncate">
                                    {isEntitled ? 'Reputation & Guest Intelligence' : 'Not enabled for this organization'}
                                </p>
                            </div>
                        </div>
                        <button
                            disabled={loading || !isEntitled}
                            className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg border transition-all shrink-0 flex items-center gap-1 ${
                                !isEntitled ? 'bg-neutral-800 text-gray-500 border-neutral-700 cursor-not-allowed' : 'bg-amber-500/20 text-amber-300 border-amber-500/30 hover:bg-amber-500 hover:text-black'
                            }`}
                        >
                            {loading ? 'Authenticating...' : isEntitled ? 'Open Pulse' : 'Not Enabled'}
                            {isEntitled ? <ArrowUpRight className="w-3.5 h-3.5" /> : <Lock className="w-3 h-3" />}
                        </button>
                    </div>
                </div>

                {modalInfo?.open && <HandoffModal info={modalInfo} onClose={() => setModalInfo(null)} />}
            </>
        );
    }

    // Default 'card' variant for Main Dashboard Integration (Requirement 7)
    return (
        <>
            <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#141414] via-[#1a1813] to-[#241c0e] border p-6 shadow-2xl transition-all ${
                !isEntitled ? 'border-neutral-800/80 opacity-75' : 'border-[#C5A059]/30 hover:border-[#C5A059]/60'
            } ${className}`}>
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                    <Sparkles className="w-40 h-40 text-[#C5A059]" />
                </div>

                <div className="flex items-start justify-between relative z-10 mb-4">
                    <div className="flex items-center gap-3.5 min-w-0">
                        <div className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 shadow-inner ${
                            !isEntitled ? 'bg-neutral-800 border-neutral-700 text-gray-500' : 'bg-[#C5A059]/15 border-[#C5A059]/40 text-[#C5A059]'
                        }`}>
                            {isEntitled ? <Activity className="w-6 h-6 animate-pulse" /> : <Lock className="w-6 h-6" />}
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <h3 className="text-xl font-extrabold text-white tracking-wide whitespace-nowrap">BRASA Pulse</h3>
                                <span className={`text-[10px] font-mono font-bold tracking-widest px-2 py-0.5 rounded-full border uppercase shrink-0 whitespace-nowrap ${
                                    !isEntitled ? 'bg-neutral-800 text-gray-400 border-neutral-700' : 'bg-[#C5A059]/20 text-[#C5A059] border-[#C5A059]/40'
                                }`}>
                                    {isEntitled ? 'Guest AI' : 'Not Enabled'}
                                </span>
                            </div>
                            <p className="text-sm text-[#C5A059]/80 font-medium truncate">
                                {isEntitled ? 'Reputation & Guest Intelligence' : 'Not enabled for this organization'}
                            </p>
                        </div>
                    </div>
                </div>

                <p className="text-xs text-gray-400 mb-6 relative z-10 leading-relaxed">
                    {isEntitled
                        ? 'Direct single sign-on access to guest sentiment, Google/Yelp reviews, competitive intelligence, and reputation analytics. Automatically scoped to your assigned stores.'
                        : 'Reputation & Guest Intelligence module is currently disabled for this client organization. Contact BRASA Administrator to unlock access.'}
                </p>

                <div className="flex items-center justify-between pt-4 border-t border-[#333]/60 relative z-10">
                    <div className="flex items-center gap-2 text-[11px] text-gray-400 font-mono">
                        <ShieldCheck className="w-3.5 h-3.5 text-[#C5A059]" />
                        <span>Entitlement: {isEntitled ? 'ACTIVE' : 'INACTIVE'}</span>
                    </div>

                    <button
                        onClick={handleHandoff}
                        disabled={loading}
                        className={`px-5 py-2.5 font-extrabold text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg flex items-center gap-2 ${
                            !isEntitled
                                ? 'bg-neutral-800 text-gray-400 border border-neutral-700 cursor-pointer hover:bg-neutral-700'
                                : 'bg-gradient-to-r from-[#C5A059] to-[#E5C158] hover:from-[#d4b068] hover:to-[#f5d168] text-black hover:shadow-[#C5A059]/20 disabled:opacity-50'
                        }`}
                    >
                        {loading ? (
                            <span>Generating SSO Token...</span>
                        ) : isEntitled ? (
                            <>
                                <span>Launch BRASA Pulse</span>
                                <ArrowUpRight className="w-4 h-4" />
                            </>
                        ) : (
                            <>
                                <span>Module Not Enabled</span>
                                <Lock className="w-3.5 h-3.5" />
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

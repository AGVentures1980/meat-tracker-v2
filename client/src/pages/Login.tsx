import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PasswordResetModal } from '../components/auth/PasswordResetModal';
import { Eye, EyeOff, Lock, User, ArrowRight, Smartphone, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export const Login = () => {
    const { login } = useAuth();
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showResetModal, setShowResetModal] = useState(false);
    const [showQR, setShowQR] = useState(false);
    const [showDemoModal, setShowDemoModal] = useState(false);
    const [demoEmail, setDemoEmail] = useState("");
    const [demoSuccess, setDemoSuccess] = useState<any>(null);
    const [demoLoading, setDemoLoading] = useState(false);

    const currentUrl = window.location.href;

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const success = await login(email, password);
            if (success) {
                // Check role via localStorage or another call, but simple way is to check the user object if available.
                // Since login() updates state asynchronously, we might need to rely on the logic inside useAuth or just manual check here?
                // Actually Login component doesn't have the user object yet in this scope...
                // But wait, the `login` function returns success boolean.
                // Let's modify useAuth to return the user object or check it via context after a small delay?
                // Better: Decode the token or just check the user state in useEffect.

                // Simpler: Just redirect to dashboard, and let Dashboard redirect? 
                // No, let's look at how we can get the role.
                // The useAuth 'login' function does NOT return the user.
                // Let's rely on reading from localStorage which is set in login().
                const stored = localStorage.getItem('brasameat_user');
                if (stored) {
                    const u = JSON.parse(stored);
                    if (u.role === 'director') {
                        navigate('/executive');
                        return;
                    }
                }
                navigate('/dashboard');
            } else {
                setError("Invalid email or password");
            }
        } catch (err) {
            setError("An unexpected error occurred");
        } finally {
            setLoading(false);
        }
    };

    const handleRequestDemo = async (e: React.FormEvent) => {
        e.preventDefault();
        setDemoLoading(true);
        setError("");
        try {
            const response = await fetch('/api/v1/auth/request-demo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: demoEmail })
            });
            const data = await response.json();
            if (data.success) {
                setDemoSuccess(data);
                setDemoEmail("");
            } else {
                setError(data.error || "Failed to request demo");
            }
        } catch (err) {
            setError("Network error. Please try again.");
        } finally {
            setDemoLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-black relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-[url('/background_clean.jpeg')] opacity-60 bg-cover bg-center"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>

            <div className="relative z-10 w-full max-w-md p-10 bg-black/50 backdrop-blur-sm border-y border-brand-gold/20 shadow-2xl animate-in fade-in zoom-in duration-500">
                <div className="text-center mb-8">
                    <img
                        src="/brasa-logo-v3.png"
                        alt="Brasa Meat Intelligence"
                        // Maximum proximity
                        className="w-64 mx-auto -mb-6 drop-shadow-[0_0_15px_rgba(197,160,89,0.3)] animate-pulse-slow"
                    />
                    <div className="h-0.5 w-24 bg-gradient-to-r from-transparent via-brand-gold to-transparent mx-auto mb-1"></div>
                    <p className="text-brand-gold uppercase tracking-[0.2em] text-xs font-bold">Meat Intelligence</p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg mb-6 text-sm text-center flex items-center justify-center gap-2 animate-in slide-in-from-top-2">
                        <span className="font-bold">Error:</span> {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-5">
                    <div className="group">
                        <label className="block text-xs font-bold text-brand-gold uppercase tracking-wider mb-2 ml-1">Access ID</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <User className="h-5 w-5 text-gray-500 group-focus-within:text-brand-gold transition-colors" />
                            </div>
                            <input
                                type="email"
                                required
                                className="block w-full pl-10 pr-3 py-3 border border-white/10 rounded-lg leading-5 bg-black/40 text-white placeholder-gray-500 focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold sm:text-sm transition-all shadow-inner"
                                placeholder="store-id@texasdebrazil.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="group">
                        <label className="block text-xs font-bold text-brand-gold uppercase tracking-wider mb-2 ml-1">Security Key</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Lock className="h-5 w-5 text-gray-500 group-focus-within:text-brand-gold transition-colors" />
                            </div>
                            <input
                                type={showPassword ? "text" : "password"}
                                required
                                className="block w-full pl-10 pr-10 py-3 border border-white/10 rounded-lg leading-5 bg-black/40 text-white placeholder-gray-500 focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold sm:text-sm transition-all shadow-inner"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <button
                                type="button"
                                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ?
                                    <EyeOff className="h-5 w-5 text-gray-500 hover:text-white cursor-pointer" /> :
                                    <Eye className="h-5 w-5 text-gray-500 hover:text-white cursor-pointer" />
                                }
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                        <div className="text-xs text-gray-500">v2.0 Protected System</div>
                        <button
                            type="button"
                            onClick={() => setShowResetModal(true)}
                            className="text-sm font-medium text-brand-gold hover:text-yellow-400 transition-colors underline decoration-brand-gold/30 underline-offset-4"
                        >
                            Forgot Password?
                        </button>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex justify-center items-center gap-2 py-4 px-4 border border-transparent rounded-lg text-sm font-bold text-black bg-brand-gold hover:bg-yellow-500 focus:outline-none focus:shadow-outline-yellow active:bg-yellow-600 transition-all duration-200 uppercase tracking-widest transform hover:scale-[1.02]"
                    >
                        {loading ? 'Authenticating...' : 'Initialize Session'}
                        {!loading && <ArrowRight className="w-4 h-4" />}
                    </button>

                    <div className="text-center pt-4">
                        <button
                            type="button"
                            onClick={() => setShowDemoModal(true)}
                            className="text-xs text-gray-400 hover:text-brand-gold transition-colors font-bold uppercase tracking-widest border-b border-transparent hover:border-brand-gold pb-1"
                        >
                            Start 30-Day Free Demo
                        </button>
                    </div>
                </form>

                {/* Mobile Access Trigger */}
                <div className="mt-8 border-t border-white/5 pt-6 flex justify-center">
                    <button
                        type="button"
                        onClick={() => setShowQR(true)}
                        className="flex items-center gap-2 text-[10px] text-gray-500 hover:text-brand-gold uppercase tracking-[0.2em] transition-all group"
                    >
                        <Smartphone className="w-3 h-3 group-hover:scale-110 transition-transform" />
                        Mobile Access Link
                    </button>
                </div>
            </div>

            {/* High-Tech QR Panel Overlay */}
            {showQR && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowQR(false)}></div>
                    <div className="relative w-full max-w-[320px] bg-[#1a1a1a] border border-brand-gold/30 p-8 shadow-[0_0_50px_rgba(197,160,89,0.15)] animate-in zoom-in-95 duration-300">
                        <button
                            onClick={() => setShowQR(false)}
                            className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        <div className="text-center mb-6">
                            <div className="w-10 h-1 bg-brand-gold mx-auto mb-4"></div>
                            <h3 className="text-white text-xs font-bold uppercase tracking-widest mb-2 text-shadow-gold">Smart Access</h3>
                            <p className="text-[10px] text-gray-500 font-mono uppercase leading-tight">
                                Scan to synchronize this terminal with your mobile device
                            </p>
                        </div>

                        <div className="bg-white p-4 rounded-sm shadow-[0_0_20px_rgba(255,255,255,0.05)] mx-auto w-fit mb-6">
                            <QRCodeSVG
                                value={currentUrl}
                                size={180}
                                bgColor={"#ffffff"}
                                fgColor={"#222222"}
                                level={"H"}
                                includeMargin={false}
                            />
                        </div>

                        <div className="flex flex-col items-center gap-4">
                            <div className="flex items-center gap-2 w-full text-[9px] text-gray-600 font-mono uppercase">
                                <span className="flex-1 h-px bg-white/5"></span>
                                Security Protocol Active
                                <span className="flex-1 h-px bg-white/5"></span>
                            </div>

                            <p className="text-[9px] text-[#C5A059] font-mono text-center animate-pulse">
                                // BRASA INTEL v2.0 CONNECTED
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* High-Tech Demo Request Modal */}
            {showDemoModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => { setShowDemoModal(false); setDemoSuccess(null); }}></div>
                    <div className="relative w-full max-w-[400px] bg-[#1a1a1a] border border-brand-gold/30 p-10 shadow-[0_0_60px_rgba(197,160,89,0.2)] animate-in zoom-in-95 duration-300">
                        <button
                            onClick={() => { setShowDemoModal(false); setDemoSuccess(null); }}
                            className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        {!demoSuccess ? (
                            <>
                                <div className="text-center mb-8">
                                    <div className="w-12 h-1 bg-brand-gold shadow-[0_0_10px_#C5A059] mx-auto mb-6"></div>
                                    <h3 className="text-white text-lg font-bold uppercase tracking-[0.2em] mb-3 font-serif">SaaS Pilot Program</h3>
                                    <p className="text-xs text-gray-400 font-mono leading-relaxed">
                                        Enter your professional email to receive instant 30-day access to the Brasa Meat Intelligence platform.
                                    </p>
                                </div>

                                <form onSubmit={handleRequestDemo} className="space-y-6">
                                    <div className="group">
                                        <input
                                            type="email"
                                            required
                                            className="block w-full px-4 py-4 border border-white/10 rounded-lg bg-black/40 text-white placeholder-gray-600 focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold text-sm transition-all"
                                            placeholder="you@company.com"
                                            value={demoEmail}
                                            onChange={(e) => setDemoEmail(e.target.value)}
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={demoLoading}
                                        className="w-full py-4 bg-brand-gold hover:bg-yellow-500 text-black font-bold text-xs uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(197,160,89,0.3)] flex items-center justify-center gap-2"
                                    >
                                        {demoLoading ? 'Processing Authorization...' : 'Request Access Now'}
                                        {!demoLoading && <ArrowRight size={14} />}
                                    </button>
                                </form>

                                <p className="mt-6 text-[10px] text-gray-600 text-center uppercase tracking-tighter">
                                    * Professional validation required for enterprise features
                                </p>
                            </>
                        ) : (
                            <div className="text-center animate-in slide-in-from-bottom-4">
                                <div className="w-16 h-16 bg-brand-gold/10 border border-brand-gold rounded-full flex items-center justify-center mx-auto mb-6">
                                    <Lock className="w-8 h-8 text-brand-gold" />
                                </div>
                                <h3 className="text-[#00FF94] text-md font-bold uppercase tracking-widest mb-4">Authorization Granted</h3>
                                <div className="bg-black/60 p-6 rounded border border-white/5 space-y-4 mb-6">
                                    <p className="text-[11px] text-gray-400 font-mono leading-tight">
                                        Your trial account has been generated. Use the temporary credentials below to access the mission console.
                                    </p>
                                    <div className="space-y-2 pt-2 text-left bg-black p-3 font-mono text-xs">
                                        <p><span className="text-brand-gold">USER:</span> <span className="text-white">{demoSuccess.tempCredentials.email}</span></p>
                                        <p><span className="text-brand-gold">PASS:</span> <span className="text-white">{demoSuccess.tempCredentials.password}</span></p>
                                    </div>
                                    <p className="text-[10px] text-brand-gold pt-2 uppercase tracking-widest">
                                        Valid Until: {new Date(demoSuccess.expiresAt).toLocaleDateString()}
                                    </p>
                                </div>
                                <button
                                    onClick={() => { setShowDemoModal(false); setDemoSuccess(null); }}
                                    className="text-xs text-brand-gold border-b border-brand-gold/50 pb-1 uppercase font-bold"
                                >
                                    Login to Dashboard
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <PasswordResetModal
                isOpen={showResetModal}
                onClose={() => setShowResetModal(false)}
                defaultEmail={email}
            />

            {/* Footer / Copyright */}
            <div className="absolute bottom-6 right-8 flex flex-col items-end text-white/40 z-20">
                <div className="text-2xl font-serif font-bold tracking-widest text-brand-gold/60 mb-1">AGV</div>
                <div className="text-[10px] uppercase tracking-widest">
                    &copy; 2026 Alex Garcia Ventures. All rights reserved.
                </div>
            </div>
        </div>
    );
};

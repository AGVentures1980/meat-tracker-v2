import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PasswordResetModal } from '../components/auth/PasswordResetModal';
import { Eye, EyeOff, Lock, User, ArrowRight } from 'lucide-react';

export const Login = () => {
    const { login } = useAuth();
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showResetModal, setShowResetModal] = useState(false);

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
                </form>
            </div>

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

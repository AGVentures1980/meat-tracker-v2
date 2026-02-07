import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';

export const ChangePasswordModal = () => {
    const { user, logout } = useAuth();
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    if (!user || !user.forceChange) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (newPassword.length < 8) {
            setError('Password must be at least 8 characters.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setLoading(true);
        try {
            const baseUrl = import.meta.env.PROD ? '/api/v1' : 'http://localhost:3001/api/v1';
            const res = await fetch(`${baseUrl}/auth/change-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token}`
                },
                body: JSON.stringify({ newPassword })
            });

            const data = await res.json();

            if (res.ok) {
                setSuccess(true);
                setTimeout(() => {
                    // Update local user state to remove forceChange without logout
                    // Ideally we'd update context, but a re-login is safer/simpler
                    alert('Password changed successfully. Please log in again.');
                    logout();
                }, 2000);
            } else {
                setError(data.error || 'Failed to change password.');
            }
        } catch (err) {
            setError('Network error.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#1a1a1a] border border-red-500/30 rounded-xl shadow-2xl w-full max-w-md p-6 relative overflow-hidden">
                {/* Security Tape Effect */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 to-red-900" />

                <div className="text-center mb-6">
                    <div className="bg-red-900/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                        <Lock className="w-8 h-8 text-red-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Security Update Required</h2>
                    <p className="text-gray-400 text-sm">
                        Your password has expired or this is your first login. <br />
                        Please set a new secure password.
                    </p>
                </div>

                {success ? (
                    <div className="text-center py-8">
                        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-white">Success!</h3>
                        <p className="text-gray-400 text-sm mt-2">Redirecting to login...</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="bg-red-900/20 border border-red-500/20 p-3 rounded flex items-center text-red-200 text-xs">
                                <AlertTriangle className="w-4 h-4 mr-2" />
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-xs uppercase text-gray-500 mb-1 font-bold">New Password</label>
                            <input
                                type="password"
                                required
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full bg-black/50 border border-white/10 rounded p-3 text-white focus:border-red-500 outline-none transition-colors"
                                placeholder="Min. 8 characters"
                            />
                        </div>

                        <div>
                            <label className="block text-xs uppercase text-gray-500 mb-1 font-bold">Confirm Password</label>
                            <input
                                type="password"
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full bg-black/50 border border-white/10 rounded p-3 text-white focus:border-red-500 outline-none transition-colors"
                                placeholder="Re-type password"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded transition-all shadow-lg shadow-red-900/20 mt-4 flex justify-center items-center"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Update Password'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

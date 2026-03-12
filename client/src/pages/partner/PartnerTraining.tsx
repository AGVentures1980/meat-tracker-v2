import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { PlayCircle, CheckCircle2 } from 'lucide-react';

export const PartnerTraining: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const API_URL = (import.meta as any).env.VITE_API_URL || '';

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleComplete = async () => {
        setLoading(true);
        setError(null);

        try {
            const res = await fetch(`${API_URL}/api/v1/partner/onboarding/training`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user?.token}`
                }
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to confirm training completion.');
            }

            // Force a hard reload so PartnerLayout refetches the completed status
            window.location.href = '/partner/dashboard';
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto mt-8 animate-fade-in-up">
            <div className="bg-[#111] border border-gray-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-emerald-500 opacity-50"></div>
                
                <div className="text-center mb-10">
                    <PlayCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                    <h2 className="text-3xl font-bold text-white tracking-tight">Partner Training Vault</h2>
                    <p className="text-gray-400 mt-2 max-w-xl mx-auto">
                        Please watch the official AGV Brasa Meat Intelligence OS Reseller Briefing. This video contains crucial methodologies for successfully pitching to Enterprise clients and using the Smart Proposal Generator.
                    </p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-900/20 border border-red-500/50 rounded-lg text-red-400 text-sm text-center">
                        {error}
                    </div>
                )}

                {/* Video Placeholder Box */}
                <div className="w-full aspect-video bg-black border border-gray-800 rounded-2xl flex items-center justify-center mb-10 shadow-inner overflow-hidden relative group cursor-pointer hover:border-gray-600 transition-colors">
                    {/* Placeholder content - will be replaced with iframe embed later */}
                    <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0a] to-[#1a1a1a] flex flex-col items-center justify-center">
                        <PlayCircle className="w-20 h-20 text-gray-700 group-hover:text-emerald-500 transition-colors mb-4" />
                        <span className="text-gray-500 font-mono tracking-wider font-semibold group-hover:text-gray-300 transition-colors">
                            LOAD AGV MASTER TRAINING MODULE
                        </span>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row items-center justify-between bg-[#0a0a0a] border border-gray-800 rounded-xl p-6">
                    <div>
                        <h4 className="text-white font-bold mb-1">Training Verified</h4>
                        <p className="text-sm text-gray-400">By continuing, I confirm I have watched the entire module.</p>
                    </div>
                    
                    <button 
                        onClick={handleComplete}
                        disabled={loading}
                        className="mt-4 md:mt-0 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg flex items-center gap-3 disabled:opacity-50"
                    >
                        {loading ? 'Verifying...' : 'Access Dashboard'}
                        {!loading && <CheckCircle2 className="w-5 h-5" />}
                    </button>
                </div>

            </div>
        </div>
    );
};

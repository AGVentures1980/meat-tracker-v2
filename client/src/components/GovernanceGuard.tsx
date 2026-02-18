import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, BookOpen, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface GovernanceGuardProps {
    children: React.ReactNode;
}

export const GovernanceGuard = ({ children }: GovernanceGuardProps) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [isCertified, setIsCertified] = useState(false);

    useEffect(() => {
        const checkStatus = async () => {
            if (!user?.token) return;
            try {
                const res = await fetch(`${(import.meta as any).env?.VITE_API_URL || ''}/api/v1/dashboard/training/status`, {
                    headers: { 'Authorization': `Bearer ${user.token}` }
                });
                const data = await res.json();
                if (data.success) {
                    setIsCertified(data.isCertified);
                }
            } catch (err) {
                console.error("Governance check failed", err);
            } finally {
                setLoading(false);
            }
        };
        checkStatus();
    }, [user]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#121212] flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#C5A059]"></div>
            </div>
        );
    }

    if (!isCertified) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-[#1a1a1a] border border-[#333] rounded-2xl p-8 text-center space-y-6 shadow-2xl">
                    <div className="w-20 h-20 bg-red-900/10 rounded-full flex items-center justify-center mx-auto border border-red-500/20">
                        <Lock className="w-10 h-10 text-red-500" />
                    </div>

                    <div>
                        <h1 className="text-2xl font-black text-white uppercase tracking-tight mb-2">Feature Locked</h1>
                        <p className="text-gray-400 text-sm">
                            This feature is restricted by Governance Protocol 6.0.
                        </p>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-left">
                        <div className="flex gap-3">
                            <ShieldAlert className="w-5 h-5 text-[#C5A059] flex-shrink-0" />
                            <div>
                                <h3 className="text-white font-bold text-sm">Certification Required</h3>
                                <p className="text-xs text-gray-500 mt-1">
                                    You must complete the 5-module training and pass the certification exam to access this area.
                                </p>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => navigate('/training')}
                        className="w-full py-3 bg-[#C5A059] text-black font-bold uppercase tracking-widest rounded-lg hover:bg-[#d4b06a] transition-all flex items-center justify-center gap-2"
                    >
                        <BookOpen className="w-4 h-4" /> Go to Training Center
                    </button>

                    <button
                        onClick={() => navigate('/dashboard')}
                        className="text-xs text-gray-500 hover:text-white"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return <>{children}</>;
};

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { PlayCircle, CheckCircle2, ChevronRight, ChevronLeft, Target, TrendingUp, MonitorPlay, Wallet, Handshake } from 'lucide-react';

const SLIDES = [
    {
        title: "Introduction & The AGV Vision",
        icon: <Target className="w-8 h-8 text-emerald-500" />,
        content: [
            "Welcome to the AGV Master Training Module. You are now part of an elite network of partners deploying the most advanced meat intelligence software on the planet: The Brasa OS.",
            "We built this platform to solve a multi-million dollar problem in the premium restaurant industry: blind meat costs and inventory shrinkage. For years, executive chefs and owners ran their most expensive cost center—the meat room—on paper and intuition. AGV changes everything.",
            "As an AGV Partner, your mission is simple: identify high-volume premium steakhouses, present them with the undeniable ROI of our system, and deploy our architecture. We handle the heavy lifting; you scale your recurring revenue."
        ]
    },
    {
        title: "The Pitch - Solving 'Meat Blindness'",
        icon: <TrendingUp className="w-8 h-8 text-emerald-500" />,
        content: [
            "How do you pitch AGV? You don't sell software; you sell yield optimization.",
            "When speaking to a CEO or Director, focus on our core features:",
            "• Blind Receiving: We force chefs to blindly input received weights. We stop vendors from shorting boxes.",
            "• Yield Tracking: We track raw weight to cooked weight, catching trimming waste instantly.",
            "• The Sentinel AI: Our system actively alerts them of anomalies. It's a 24/7 digital auditor.",
            "Your closing question should always be: 'If your meat cost drops by just 2%, how much profit does that add to your bottom line this year?' The math closes the deal."
        ]
    },
    {
        title: "The Smart Proposal Generator",
        icon: <MonitorPlay className="w-8 h-8 text-emerald-500" />,
        content: [
            "Let's look at your primary tool: The Smart Proposal Generator.",
            "From your command center, you can spin up a dedicated B2B software agreement in seconds. Enter the client's language preference and their total network size.",
            "A secure, whitelabeled digital contract is instantly generated. You send this link to the prospect.",
            "Once they sign, our automated Stripe integration collects payment, and our AI Provisioning Engine builds their entire company silo instantly—databases, roles, and default items are all configured autonomously.",
            "You don't need to be a developer. Just close the deal, and the system delivers the product."
        ]
    },
    {
        title: "Managing Your Portfolio & Payouts",
        icon: <Wallet className="w-8 h-8 text-emerald-500" />,
        content: [
            "Your command center gives you complete visibility over your book of business. Track your Monthly Recurring Revenue, monitor which clients are active, and see exactly what you've earned.",
            "Our payout system is completely automated. As clients pay their monthly licensing fees, your commissions are calculated in real-time.",
            "Commissions are disbursed directly to your registered PayPal account via our AGV Ventures payout gateway."
        ]
    },
    {
        title: "Standards & Execution",
        icon: <Handshake className="w-8 h-8 text-emerald-500" />,
        content: [
            "We hold our partners to the highest standard. You are representing an Enterprise-grade intelligence firm.",
            "Ensure your clients receive white-glove onboarding and connect them to our Support Triage if operational issues arise.",
            "You have the tools. You have the software. Now, it's time to capture the market.",
            "Welcome to the AGV Partner Network. Let's get to work."
        ]
    }
];

export const PartnerTraining: React.FC = () => {
    const { user } = useAuth();
    const API_URL = (import.meta as any).env.VITE_API_URL || '';

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentSlide, setCurrentSlide] = useState(0);

    const isLastSlide = currentSlide === SLIDES.length - 1;

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
        <div className="max-w-5xl mx-auto mt-8 px-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-[#111] border border-gray-800 rounded-2xl p-8 md:p-12 shadow-2xl relative overflow-hidden min-h-[600px] flex flex-col">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-emerald-500 opacity-50"></div>
                
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-white tracking-tight uppercase flex items-center justify-center gap-3">
                        <PlayCircle className="w-6 h-6 text-emerald-500" />
                        Partner Master Module
                    </h2>
                    <div className="flex justify-center gap-2 mt-6">
                        {SLIDES.map((_, i) => (
                            <div 
                                key={i} 
                                className={`h-1.5 rounded-full transition-all duration-300 ${i <= currentSlide ? 'w-12 bg-emerald-500' : 'w-4 bg-gray-800'}`}
                            />
                        ))}
                    </div>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-900/20 border border-red-500/50 rounded-lg text-red-400 text-sm text-center">
                        {error}
                    </div>
                )}

                <div className="flex-1 flex flex-col items-center justify-center max-w-3xl mx-auto w-full mb-12">
                     <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-8 w-full relative">
                         <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-[#111] p-2 rounded-full border border-gray-800">
                             {SLIDES[currentSlide].icon}
                         </div>
                         <h3 className="text-xl font-bold text-white mt-4 mb-6 text-center">{SLIDES[currentSlide].title}</h3>
                         <div className="space-y-4">
                             {SLIDES[currentSlide].content.map((text, idx) => (
                                 <p key={idx} className="text-gray-400 leading-relaxed text-sm md:text-base">
                                     {text}
                                 </p>
                             ))}
                         </div>
                     </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-auto pt-6 border-t border-gray-800">
                    <button 
                        onClick={() => setCurrentSlide(prev => Math.max(0, prev - 1))}
                        disabled={currentSlide === 0}
                        className="flex items-center gap-2 px-6 py-3 text-sm font-bold text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:text-gray-400 transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4" /> Previous
                    </button>
                    
                    {!isLastSlide ? (
                        <button 
                            onClick={() => setCurrentSlide(prev => Math.min(SLIDES.length - 1, prev + 1))}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg flex items-center gap-3"
                        >
                            Next Section <ChevronRight className="w-5 h-5" />
                        </button>
                    ) : (
                        <button 
                            onClick={handleComplete}
                            disabled={loading}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] flex items-center gap-3 disabled:opacity-50"
                        >
                            {loading ? 'Verifying...' : 'Complete Training & Access Dashboard'}
                            {!loading && <CheckCircle2 className="w-5 h-5" />}
                        </button>
                    )}
                </div>

            </div>
        </div>
    );
};

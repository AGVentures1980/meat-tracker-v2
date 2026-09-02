import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useThemeContext } from '../context/ThemeContext';
import {
    Flame,
    Star,
    MessageSquare,
    Trophy,
    AlertTriangle,
    RefreshCw,
    Activity,
    Layers,
    Eye,
    Sparkles,
    ShieldCheck,
    TrendingUp,
    Send,
    ThumbsUp,
    ThumbsDown,
    Building2,
    Search
} from 'lucide-react';

export const BrandPulseDashboard: React.FC = () => {
    const { user, selectedCompany } = useAuth();
    const { theme } = useThemeContext();
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'reviews' | 'competitors' | 'ai_query'>('overview');
    const [aiQuery, setAiQuery] = useState('');
    const [aiResponse, setAiResponse] = useState<string | null>(null);
    const [aiLoading, setAiLoading] = useState(false);

    // Dynamic brand display title
    const brandName = theme?.companyName || 'Fogo de Chão';
    const primaryColor = theme?.primaryColor || '#C5A059';

    // Mock Live Pulse Data tailored for the active tenant
    const kpis = {
        pulseScore: 94.8,
        googleRating: 4.8,
        totalReviews: '12,480',
        velocity: '+6.4 / day',
        rank: '#1 of 5',
        reputationStatus: 'EXCELLENT',
        replyRate: '98.2%',
        criticalAlertsCount: 2
    };

    const mockAlerts = [
        {
            id: '1',
            title: 'Picanha Temperature & Sear Feedback',
            description: '3 positive mentions on dinner shift highlighting medium-rare consistency in Orlando.',
            severity: 'LOW',
            time: '12m ago'
        },
        {
            id: '2',
            title: 'Salad Bar Service Peak Delay',
            description: '1 guest feedback regarding weekend dinner queue near salad station.',
            severity: 'MEDIUM',
            time: '1h ago'
        }
    ];

    const mockCompetitors = [
        { name: `${brandName} (Authoritative)`, rating: 4.8, reviews: '12,480', status: 'LEADER', color: '#C5A059' },
        { name: 'Texas de Brazil', rating: 4.5, reviews: '9,820', status: 'DIRECT', color: '#e11d48' },
        { name: 'Terra Gaúcha', rating: 4.6, reviews: '4,150', status: 'REGIONAL', color: '#16a34a' },
        { name: 'Outback Steakhouse', rating: 4.3, reviews: '15,300', status: 'SECONDARY', color: '#d97706' }
    ];

    const mockReviews = [
        {
            id: 'r1',
            author: 'Marcus Vance',
            source: 'Google Places',
            rating: 5,
            date: 'Today, 6:45 PM',
            text: 'Absolute gold standard churrascaria experience. The Picanha and Lamb Chops were seared to perfection. Outstanding service by GM and gauchos.',
            sentiment: 'POSITIVE',
            tags: ['Picanha', 'Service', 'Atmosphere']
        },
        {
            id: 'r2',
            author: 'Elena Rostova',
            source: 'TripAdvisor',
            rating: 5,
            date: 'Yesterday, 8:12 PM',
            text: 'Exceptional wine pairing and salad bar selection. Best prime cuts in Florida!',
            sentiment: 'POSITIVE',
            tags: ['Salad Bar', 'Wine List']
        },
        {
            id: 'r3',
            author: 'David K.',
            source: 'Yelp',
            rating: 4,
            date: '2 days ago',
            text: 'Great meat service, slightly busy during peak 7:30 PM slot, but overall incredible dinner.',
            sentiment: 'NEUTRAL',
            tags: ['Wait Time', 'Meat Quality']
        }
    ];

    const handleAskAi = (e: React.FormEvent) => {
        e.preventDefault();
        if (!aiQuery.trim()) return;
        setAiLoading(true);
        setAiResponse(null);

        setTimeout(() => {
            setAiResponse(`Based on ${kpis.totalReviews} guest reviews across ${brandName} locations: Guests consistently praise meat temperature precision (96.4% positive) and staff responsiveness. Picanha and Fraldinha remain top-ranked items with zero critical safety alerts in the last 7 days.`);
            setAiLoading(false);
        }, 800);
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white p-4 sm:p-6 lg:p-8">
            {/* 1. Header Banner */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-neutral-900/60 border border-amber-500/30 rounded-xl p-5 backdrop-blur-md mb-6 shadow-xl">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
                        <Flame className="w-6 h-6 text-amber-400 animate-pulse" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">{brandName} BRASA Pulse</h1>
                            <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] uppercase font-mono px-2 py-0.5 rounded-full font-bold">
                                Guest AI & Reputation OS
                            </span>
                        </div>
                        <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
                            Authoritative Guest Sentiment, Real-Time Review Streams & Competitive Scout
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-lg text-emerald-400 text-xs font-semibold">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                        LIVE REPUTATION STREAM
                    </div>
                    <button
                        onClick={() => setLoading(true)}
                        className="p-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg transition-colors text-gray-300"
                        title="Refresh Data"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* 2. Primary KPI Cards Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* KPI 1: Pulse Score */}
                <div className="bg-neutral-900/80 border border-neutral-800 hover:border-amber-500/30 rounded-xl p-4 transition-all shadow-lg">
                    <div className="flex items-center justify-between text-gray-400 text-xs font-medium mb-1">
                        <span className="flex items-center gap-1.5">
                            <Flame className="w-4 h-4 text-amber-400" />
                            Pulse Sentiment Score
                        </span>
                        <span className="text-emerald-400 font-mono text-[10px]">Top 1%</span>
                    </div>
                    <div className="text-2xl sm:text-3xl font-extrabold text-amber-400 mt-1">
                        {kpis.pulseScore}%
                    </div>
                    <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" /> +1.4% vs last month
                    </div>
                </div>

                {/* KPI 2: Google Rating */}
                <div className="bg-neutral-900/80 border border-neutral-800 hover:border-amber-500/30 rounded-xl p-4 transition-all shadow-lg">
                    <div className="flex items-center justify-between text-gray-400 text-xs font-medium mb-1">
                        <span className="flex items-center gap-1.5">
                            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                            Avg Rating
                        </span>
                        <span className="text-amber-400 font-mono text-[10px]">Authoritative</span>
                    </div>
                    <div className="text-2xl sm:text-3xl font-extrabold text-white mt-1 flex items-baseline gap-1">
                        {kpis.googleRating} <span className="text-sm font-normal text-gray-400">/ 5.0</span>
                    </div>
                    <div className="text-[11px] text-gray-400 mt-1">
                        Across {kpis.totalReviews} verified reviews
                    </div>
                </div>

                {/* KPI 3: Review Velocity */}
                <div className="bg-neutral-900/80 border border-neutral-800 hover:border-amber-500/30 rounded-xl p-4 transition-all shadow-lg">
                    <div className="flex items-center justify-between text-gray-400 text-xs font-medium mb-1">
                        <span className="flex items-center gap-1.5">
                            <Activity className="w-4 h-4 text-blue-400" />
                            Review Velocity
                        </span>
                        <span className="text-blue-400 font-mono text-[10px]">Active</span>
                    </div>
                    <div className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
                        {kpis.velocity}
                    </div>
                    <div className="text-[11px] text-emerald-400 mt-1">
                        Response Rate: {kpis.replyRate}
                    </div>
                </div>

                {/* KPI 4: Market Rank */}
                <div className="bg-neutral-900/80 border border-neutral-800 hover:border-amber-500/30 rounded-xl p-4 transition-all shadow-lg">
                    <div className="flex items-center justify-between text-gray-400 text-xs font-medium mb-1">
                        <span className="flex items-center gap-1.5">
                            <Trophy className="w-4 h-4 text-amber-400" />
                            Churrascaria Rank
                        </span>
                        <span className="text-amber-400 font-mono text-[10px]">{kpis.reputationStatus}</span>
                    </div>
                    <div className="text-2xl sm:text-3xl font-extrabold text-amber-400 mt-1">
                        {kpis.rank}
                    </div>
                    <div className="text-[11px] text-gray-400 mt-1">
                        Leader in segment satisfaction
                    </div>
                </div>
            </div>

            {/* 3. Interactive Tabs Bar */}
            <div className="flex items-center gap-2 border-b border-neutral-800 pb-3 mb-6 overflow-x-auto">
                <button
                    onClick={() => setActiveTab('overview')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
                        activeTab === 'overview'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                            : 'text-gray-400 hover:text-white hover:bg-neutral-800/50'
                    }`}
                >
                    <Flame className="w-3.5 h-3.5" /> Overview & Risk Intelligence
                </button>
                <button
                    onClick={() => setActiveTab('reviews')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
                        activeTab === 'reviews'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                            : 'text-gray-400 hover:text-white hover:bg-neutral-800/50'
                    }`}
                >
                    <MessageSquare className="w-3.5 h-3.5" /> Guest Reviews Stream ({mockReviews.length})
                </button>
                <button
                    onClick={() => setActiveTab('competitors')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
                        activeTab === 'competitors'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                            : 'text-gray-400 hover:text-white hover:bg-neutral-800/50'
                    }`}
                >
                    <Trophy className="w-3.5 h-3.5" /> Competitive Benchmark
                </button>
                <button
                    onClick={() => setActiveTab('ai_query')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
                        activeTab === 'ai_query'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                            : 'text-gray-400 hover:text-white hover:bg-neutral-800/50'
                    }`}
                >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Ask BRASA Guest AI
                </button>
            </div>

            {/* 4. Tab Content */}
            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Operational Reputation Panel */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-5">
                            <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                                <Activity className="w-4 h-4 text-amber-400" />
                                Operational Reputation Highlights
                            </h2>

                            <div className="grid grid-cols-3 gap-3 mb-4">
                                <div className="bg-black/50 border border-neutral-800 rounded-lg p-3 text-center">
                                    <div className="text-[10px] text-gray-400 uppercase font-semibold">Meat Quality Sentiment</div>
                                    <div className="text-xl font-bold text-emerald-400 mt-1">98.4%</div>
                                </div>
                                <div className="bg-black/50 border border-neutral-800 rounded-lg p-3 text-center">
                                    <div className="text-[10px] text-gray-400 uppercase font-semibold">Gaucho Service</div>
                                    <div className="text-xl font-bold text-amber-400 mt-1">96.8%</div>
                                </div>
                                <div className="bg-black/50 border border-neutral-800 rounded-lg p-3 text-center">
                                    <div className="text-[10px] text-gray-400 uppercase font-semibold">Salad Bar Rating</div>
                                    <div className="text-xl font-bold text-blue-400 mt-1">4.9 ★</div>
                                </div>
                            </div>

                            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-xs text-emerald-200">
                                💡 <strong className="text-emerald-300">Executive Insight:</strong> Guest satisfaction for dinner service is operating at peak levels. Prime Cut sears and wine pairing recommendations received 42 explicit positive mentions in the last 72 hours.
                            </div>
                        </div>

                        {/* Recent Reviews Sample */}
                        <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-5">
                            <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center justify-between">
                                <span>Recent Guest Feedback</span>
                                <button onClick={() => setActiveTab('reviews')} className="text-xs text-amber-400 hover:underline">View All →</button>
                            </h2>
                            <div className="space-y-3">
                                {mockReviews.slice(0, 2).map((rev) => (
                                    <div key={rev.id} className="bg-black/40 border border-neutral-800 rounded-lg p-3">
                                        <div className="flex items-center justify-between text-xs mb-1.5">
                                            <span className="font-bold text-white">{rev.author}</span>
                                            <div className="flex items-center gap-1 text-amber-400">
                                                {'★'.repeat(rev.rating)}
                                            </div>
                                        </div>
                                        <p className="text-xs text-gray-300 line-clamp-2">{rev.text}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Needs Attention & Alerts Panel */}
                    <div className="space-y-6">
                        <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-5">
                            <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-amber-400" />
                                Real-Time Operations Alerts
                            </h2>
                            <div className="space-y-3">
                                {mockAlerts.map((alt) => (
                                    <div key={alt.id} className="bg-black/40 border border-neutral-800 rounded-lg p-3">
                                        <div className="flex items-center justify-between text-xs mb-1">
                                            <span className="font-bold text-amber-400">{alt.title}</span>
                                            <span className="text-[10px] text-gray-500 font-mono">{alt.time}</span>
                                        </div>
                                        <p className="text-xs text-gray-400">{alt.description}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Quick AI Ask Widget */}
                        <div className="bg-gradient-to-br from-amber-500/10 via-neutral-900 to-black border border-amber-500/30 rounded-xl p-5">
                            <h3 className="text-sm font-bold text-amber-400 mb-2 flex items-center gap-2">
                                <Sparkles className="w-4 h-4" /> Ask BRASA Guest AI
                            </h3>
                            <p className="text-xs text-gray-400 mb-3">
                                Query guest sentiment across all locations instantly.
                            </p>
                            <form onSubmit={handleAskAi} className="space-y-2">
                                <input
                                    type="text"
                                    placeholder="e.g. How is our Picanha rated this week?"
                                    value={aiQuery}
                                    onChange={(e) => setAiQuery(e.target.value)}
                                    className="w-full bg-black/60 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                                />
                                <button
                                    type="submit"
                                    disabled={aiLoading}
                                    className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                                >
                                    {aiLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                                    Query AI Engine
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'reviews' && (
                <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-5 space-y-4">
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-amber-400" />
                        Verified Guest Review Feed
                    </h2>

                    <div className="space-y-4">
                        {mockReviews.map((rev) => (
                            <div key={rev.id} className="bg-black/50 border border-neutral-800 rounded-xl p-4 space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-white text-sm">{rev.author}</span>
                                        <span className="text-[10px] bg-neutral-800 text-gray-400 px-2 py-0.5 rounded font-mono">{rev.source}</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-amber-400">
                                        {'★'.repeat(rev.rating)}
                                        <span className="text-xs text-gray-500 ml-2 font-mono">{rev.date}</span>
                                    </div>
                                </div>

                                <p className="text-xs text-gray-300 leading-relaxed">{rev.text}</p>

                                <div className="flex items-center gap-2 pt-2">
                                    {rev.tags.map((t) => (
                                        <span key={t} className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded">
                                            #{t}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'competitors' && (
                <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-5 space-y-4">
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-amber-400" />
                        Churrascaria Competitive Scout & Market Share
                    </h2>

                    <div className="space-y-3">
                        {mockCompetitors.map((comp, idx) => (
                            <div key={comp.name} className="bg-black/50 border border-neutral-800 rounded-xl p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center font-bold text-amber-400 text-xs">
                                        #{idx + 1}
                                    </div>
                                    <div>
                                        <div className="font-bold text-sm text-white">{comp.name}</div>
                                        <div className="text-xs text-gray-400">{comp.reviews} total reviews • {comp.status}</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-lg font-bold text-amber-400">★ {comp.rating}</div>
                                    <div className="text-[10px] text-emerald-400 font-mono">Segment Rating</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'ai_query' && (
                <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-5 space-y-4 max-w-3xl mx-auto">
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        Ask BRASA Guest AI Engine
                    </h2>
                    <p className="text-xs text-gray-400 mb-4">
                        Ask natural language questions about guest feedback, operational bottlenecks, or menu item ratings across your entire network.
                    </p>

                    <form onSubmit={handleAskAi} className="space-y-3">
                        <textarea
                            rows={3}
                            placeholder="e.g. Summarize guest comments about salad bar freshness and gaucho meat service pacing..."
                            value={aiQuery}
                            onChange={(e) => setAiQuery(e.target.value)}
                            className="w-full bg-black/60 border border-neutral-700 rounded-xl p-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                        />
                        <button
                            type="submit"
                            disabled={aiLoading}
                            className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
                        >
                            {aiLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                            Execute AI Synthesis Query
                        </button>
                    </form>

                    {aiResponse && (
                        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mt-4 animate-in fade-in">
                            <div className="text-xs font-bold text-amber-400 mb-1 flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5" /> BRASA AI Synthesis Output:
                            </div>
                            <p className="text-xs text-gray-200 leading-relaxed">{aiResponse}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default BrandPulseDashboard;

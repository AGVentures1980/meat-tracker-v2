import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, BarChart3, ShieldCheck, Zap, Globe, Users, CheckCircle2 } from 'lucide-react';

export const Landing = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-[#050505] text-[#F5F5F0] font-sans selection:bg-brand-gold selection:text-black antialiased">
            {/* Header Overlay - Matching the Screenshot */}
            <nav className="fixed top-0 w-full z-50 bg-black/40 backdrop-blur-md border-b border-white/5">
                <div className="max-w-[1400px] mx-auto px-8 h-24 flex items-center justify-between">
                    <div className="flex flex-col">
                        <span className="text-3xl font-serif font-bold tracking-tighter text-brand-gold">AGV</span>
                        <span className="text-[9px] font-sans font-bold tracking-[0.4em] text-gray-400 uppercase leading-none mt-1">
                            Alex Garcia Ventures
                        </span>
                    </div>

                    <div className="hidden lg:flex items-center gap-8 text-[10px] uppercase tracking-[0.25em] font-bold text-gray-300">
                        <a href="#home" className="text-brand-gold border-b border-brand-gold/50">Home</a>
                        <a href="#about" className="hover:text-brand-gold transition-colors">About</a>
                        <a href="#services" className="hover:text-brand-gold transition-colors">Services</a>
                        <a href="#portfolio" className="hover:text-brand-gold transition-colors">Portfolio</a>
                        <a href="#kitchen-lab" className="hover:text-brand-gold transition-colors">Kitchen Lab</a>
                        <a href="#brasa" className="hover:text-brand-gold transition-colors">Brasa</a>
                        <a href="#insights" className="hover:text-brand-gold transition-colors">Insights</a>
                        <a href="#contact" className="hover:text-brand-gold transition-colors">Contact</a>
                    </div>

                    <div className="flex items-center gap-6">
                        <button
                            onClick={() => navigate('/login')}
                            className="px-6 py-2.5 bg-transparent border border-brand-gold/60 text-brand-gold text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-brand-gold hover:text-black transition-all"
                        >
                            Book a Consultation
                        </button>
                    </div>
                </div>
            </nav>

            {/* Hero Section - Visual Focus on Fire/Steak Aesthetic */}
            <section className="relative h-screen flex items-center justify-center overflow-hidden">
                {/* Background Image/Gradient Overlay */}
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1544025162-d76694265947?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80')] bg-cover bg-center">
                    <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/40 to-transparent"></div>
                    <div className="absolute inset-0 bg-black/50 backdrop-grayscale-[0.2]"></div>
                </div>

                <div className="relative z-10 max-w-6xl mx-auto px-6 text-center">
                    <div className="w-24 h-px bg-brand-gold/40 mx-auto mb-8 flex items-center justify-center">
                        <span className="bg-[#050505] px-4 text-[10px] uppercase tracking-[0.5em] text-brand-gold whitespace-nowrap">Tampa, Florida</span>
                    </div>

                    <h1 className="text-6xl md:text-8xl font-serif font-bold leading-[1.1] mb-10">
                        Strategy, Innovation <span className="italic text-brand-gold">&</span> <br />
                        Culinary Experience
                    </h1>

                    <p className="max-w-3xl mx-auto text-lg md:text-xl text-gray-300 mb-12 font-light leading-relaxed">
                        Transforming restaurants into empires. Creating unforgettable <br className="hidden md:block" /> culinary moments for global hospitality brands.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                        <button
                            onClick={() => navigate('/login')}
                            className="group px-10 py-5 bg-brand-gold text-black font-bold text-xs uppercase tracking-[0.3em] hover:bg-yellow-500 transition-all shadow-[0_20px_50px_rgba(197,160,89,0.2)] flex items-center gap-4"
                        >
                            Book a Consultation
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </button>

                        <button className="px-10 py-5 border border-white/20 hover:border-brand-gold/50 text-white font-bold text-xs uppercase tracking-[0.3em] transition-all bg-white/5 backdrop-blur-sm">
                            Explore Our World
                        </button>
                    </div>
                </div>

                <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 opacity-40">
                    <span className="text-[10px] uppercase tracking-[0.8em]">Scroll</span>
                    <div className="w-px h-16 bg-gradient-to-b from-brand-gold to-transparent"></div>
                </div>
            </section>

            {/* SaaS Demo Section Refined */}
            <section id="kitchen-lab" className="py-32 px-6 bg-[#080808] border-t border-white/5">
                <div className="max-w-4xl mx-auto text-center">
                    <div className="inline-block px-4 py-1 border border-brand-gold/30 rounded-full mb-8">
                        <span className="text-[10px] uppercase tracking-[0.3em] text-brand-gold font-bold">Kitchen Lab x SaaS</span>
                    </div>

                    <h2 className="text-4xl md:text-5xl font-serif font-bold mb-10">
                        Brasa Meat Intelligence <br />
                        <span className="text-2xl font-sans font-light text-gray-400 uppercase tracking-widest mt-4 block">30-Day Demo Pilot</span>
                    </h2>

                    <div className="bg-black/40 border border-white/5 p-12 rounded-xl backdrop-blur-md relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-gold to-transparent opacity-30"></div>

                        <p className="text-gray-400 text-lg leading-relaxed mb-10">
                            Equip your empire with AGV technology. Manage recipes, costs, and network wide yields in a single pane of glass. Exclusive SaaS menu for strategic growth.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left mb-12">
                            {[
                                "Industrial Yield Analysis",
                                "SaaS Recipe Prototyping",
                                "AI-Driven Cost Control",
                                "Global Network Insights"
                            ].map((item, i) => (
                                <div key={i} className="flex items-center gap-4 pb-4 border-b border-white/10 group">
                                    <Zap className="w-4 h-4 text-brand-gold transition-transform group-hover:scale-125" />
                                    <span className="text-xs uppercase tracking-widest font-bold text-gray-200">{item}</span>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={() => navigate('/login')}
                            className="text-brand-gold font-bold text-xs uppercase tracking-[0.4em] border-b-2 border-brand-gold/30 pb-2 hover:border-brand-gold hover:tracking-[0.5em] transition-all"
                        >
                            Request Access Protocol
                        </button>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 border-t border-white/5 text-center">
                <p className="text-[10px] text-gray-600 uppercase tracking-widest font-medium">
                    © 2026 AGV Alex Garcia Ventures. All Rights Reserved. <br />
                    <span className="text-gray-800 mt-2 block">Enterprise Meat Intelligence v2.1.0</span>
                </p>
            </footer>
        </div>
    );
};

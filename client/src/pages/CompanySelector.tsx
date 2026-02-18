import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, ArrowRight, Users, Settings, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface Company {
    id: string;
    name: string;
    plan: string;
    _count: {
        stores: number;
    }
}

export const CompanySelector = () => {
    const navigate = useNavigate();
    const { user, setCompany } = useAuth();
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCompanies = async () => {
            try {
                const res = await fetch('/api/v1/owner/my-companies', {
                    headers: { 'Authorization': `Bearer ${user?.token}` }
                });
                const data = await res.json();
                if (data.success) {
                    setCompanies(data.companies);
                }
            } catch (err) {
                console.error('Failed to fetch companies', err);
            } finally {
                setLoading(false);
            }
        };
        fetchCompanies();
    }, [user?.token]);

    const handleSelect = (company: Company) => {
        setCompany(company.id);
        navigate('/dashboard');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#C5A059]"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0a0a] bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-[#1a1a1a] via-[#0a0a0a] to-[#050505] p-4 md:p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-8 md:mb-12 text-center">
                    <h1 className="text-3xl md:text-5xl font-extrabold text-white mb-2 md:mb-4 tracking-tighter">
                        Command <span className="text-[#C5A059]">Center</span>
                    </h1>
                    <p className="text-gray-500 font-mono uppercase tracking-[0.2em] text-xs md:text-sm">Select a company to manage</p>
                </div>

                {/* Owner Intelligence Center Button (Master Admin Only) */}
                {user?.role === 'admin' && (
                    <div className="mb-8 md:mb-12 flex justify-center">
                        <button
                            onClick={() => navigate('/owner-terminal')}
                            className="w-full md:w-auto group bg-gradient-to-r from-[#C5A059]/20 to-[#C5A059]/10 hover:from-[#C5A059] hover:to-[#D5B069] border border-[#C5A059]/30 p-4 md:px-12 rounded-xl flex flex-col md:flex-row items-center gap-4 transition-all duration-500 shadow-[0_0_30px_rgba(197,160,89,0.1)] hover:shadow-[0_0_50px_rgba(197,160,89,0.4)] active:scale-95"
                        >
                            <Zap className="text-[#C5A059] group-hover:text-black transition-colors w-6 h-6 md:w-5 md:h-5" />
                            <div className="text-center md:text-left">
                                <h3 className="text-sm font-bold text-white group-hover:text-black tracking-widest uppercase transition-colors">Owner Intelligence Center</h3>
                                <p className="text-[10px] text-gray-500 group-hover:text-black/70 font-mono transition-colors mt-1 md:mt-0">AI Lead Gen • Global Finances • Dev Metrics</p>
                            </div>
                            <ArrowRight className="text-[#C5A059] group-hover:text-black transition-colors hidden md:block" />
                        </button>
                    </div>
                )}

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {companies.map((company) => (
                        <div
                            key={company.id}
                            onClick={() => handleSelect(company)}
                            className="group relative bg-[#1a1a1a]/40 backdrop-blur-xl border border-white/5 p-8 rounded-2xl cursor-pointer hover:border-[#C5A059]/30 transition-all duration-500 hover:shadow-[0_20px_50px_rgba(197,160,89,0.1)] active:scale-95"
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Building2 size={80} className="text-white" />
                            </div>

                            <div className="relative z-10">
                                <span className="inline-block px-3 py-1 rounded-full bg-[#C5A059]/10 text-[#C5A059] text-[10px] font-bold uppercase tracking-widest mb-6 border border-[#C5A059]/20">
                                    {company.plan} plan
                                </span>
                                <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-[#C5A059] transition-colors">{company.name}</h3>
                                <p className="text-gray-500 text-sm mb-6 flex items-center gap-2 font-mono">
                                    <Users size={14} /> {company._count.stores} Stores Managed
                                </p>

                                <div className="flex items-center justify-between mt-12">
                                    <div className="flex -space-x-2">
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className="h-8 w-8 rounded-full border-2 border-[#1a1a1a] bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-[10px] text-gray-400">
                                                S{i}
                                            </div>
                                        ))}
                                    </div>
                                    <button className="h-10 w-10 rounded-full bg-[#C5A059]/10 flex items-center justify-center text-[#C5A059] group-hover:bg-[#C5A059] group-hover:text-black transition-all">
                                        <ArrowRight size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}

                </div>
            </div>
        </div>
    );
};

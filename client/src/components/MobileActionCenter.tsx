import { useNavigate } from 'react-router-dom';
import { Camera, Truck, Trash2, UtensilsCrossed, LayoutDashboard, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const MobileActionCenter = ({ onSwitchToDesktop }: { onSwitchToDesktop: () => void }) => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    const ACTIONS = [
        {
            id: 'invoice',
            label: 'Scan Invoice',
            sub: 'Lançar Compra',
            icon: Camera,
            path: '/price-input',
            color: 'text-brand-gold',
            bg: 'bg-brand-gold/10',
            border: 'border-brand-gold/20'
        },
        {
            id: 'delivery',
            label: 'Delivery (OLO)',
            sub: 'Lançar Venda',
            icon: Truck,
            path: '/delivery',
            color: 'text-blue-400',
            bg: 'bg-blue-400/10',
            border: 'border-blue-400/20'
        },
        {
            id: 'waste',
            label: 'Log Waste',
            sub: 'Lançar Perda',
            icon: Trash2,
            path: '/waste',
            color: 'text-red-500',
            bg: 'bg-red-500/10',
            border: 'border-red-500/20'
        },
        {
            id: 'prep',
            label: 'Smart Prep',
            sub: 'Plano de Corte',
            icon: UtensilsCrossed,
            path: '/smart-prep',
            color: 'text-green-500',
            bg: 'bg-green-500/10',
            border: 'border-green-500/20'
        }
    ];

    return (
        <div className="min-h-screen bg-zinc-950 flex flex-col p-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-serif text-white font-bold">
                        Olá, {user?.name?.split(' ')[0]}
                    </h1>
                    <p className="text-brand-gold/80 text-sm font-mono uppercase tracking-widest">
                        {user?.storeName || 'Brasa Store'}
                    </p>
                </div>
                <div
                    onClick={logout}
                    className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 hover:text-white"
                >
                    <LogOut className="w-5 h-5" />
                </div>
            </div>

            {/* Date Display */}
            <div className="mb-8">
                <div className="text-6xl font-black text-white/5 font-mono absolute top-4 right-4 pointer-events-none">
                    {new Date().getDate()}
                </div>
                <p className="text-zinc-500 text-xs uppercase tracking-[0.2em] mb-1">
                    {new Date().toLocaleDateString('pt-BR', { weekday: 'long' })}
                </p>
                <p className="text-white text-3xl font-light">
                    {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
                </p>
            </div>

            {/* Action Grid */}
            <div className="grid grid-cols-1 gap-4 flex-1">
                {ACTIONS.map((action) => (
                    <button
                        key={action.id}
                        onClick={() => navigate(action.path)}
                        className={`group relative overflow-hidden rounded-xl bg-zinc-900/50 border ${action.border} p-6 text-left transition-all active:scale-95`}
                    >
                        <div className={`absolute right-4 top-4 p-3 rounded-full ${action.bg}`}>
                            <action.icon className={`w-6 h-6 ${action.color}`} />
                        </div>
                        <div className="flex flex-col justify-end h-full">
                            <span className={`text-xs font-bold uppercase tracking-wider mb-1 ${action.color}`}>
                                {action.sub}
                            </span>
                            <span className="text-xl font-bold text-white group-hover:text-brand-gold transition-colors">
                                {action.label}
                            </span>
                        </div>
                    </button>
                ))}
            </div>

            {/* Footer / Toggle */}
            <div className="mt-8 pt-6 border-t border-zinc-900 text-center">
                <button
                    onClick={onSwitchToDesktop}
                    className="inline-flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-sm font-medium p-2"
                >
                    <LayoutDashboard className="w-4 h-4" />
                    Ver Painel Completo
                </button>
            </div>
        </div>
    );
};

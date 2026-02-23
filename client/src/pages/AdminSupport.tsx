import React, { useState, useEffect } from 'react';
import { Send, Bot, User as UserIcon, Clock, CheckCircle2, ShieldAlert, ArrowLeft, MessageSquare, Star } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface CompanyRating {
    company_id: string;
    company_name: string;
    average_rating: number;
    total_ratings: number;
}

interface SupportMessage {
    id: string;
    content: string;
    sender_type: 'USER' | 'AI' | 'ADMIN';
    created_at: string;
}

interface Ticket {
    id: string;
    title: string;
    status: 'OPEN' | 'RESOLVED' | 'CLOSED';
    created_at: string;
    updated_at: string;
    store: {
        store_name: string;
        location: string;
    };
    user: {
        first_name: string;
        last_name: string;
        email: string;
    };
    messages: SupportMessage[];
}

export const AdminSupport: React.FC = () => {
    const { user } = useAuth();
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [ratings, setRatings] = useState<CompanyRating[]>([]);
    const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
    const [replyContent, setReplyContent] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const fetchTickets = async () => {
        try {
            const token = user?.token;
            if (!token) return;
            const res = await fetch('/api/v1/support/tickets', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setTickets(data);
                setErrorMsg(null);
            } else {
                setErrorMsg("Failed to load active tickets.");
            }
        } catch (error) {
            console.error('Failed to load tickets', error);
            setErrorMsg("Network error trying to load active tickets.");
        }
    };

    const fetchRatings = async () => {
        try {
            const token = user?.token;
            if (!token) return;
            const res = await fetch('/api/v1/support/ratings', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setRatings(data);
            }
        } catch (error) {
            console.error('Failed to load ratings', error);
        }
    };

    useEffect(() => {
        fetchTickets();
        fetchRatings();
        const interval = setInterval(() => {
            fetchTickets();
            fetchRatings();
        }, 15000);
        return () => clearInterval(interval);
    }, [user?.token]);

    const sendReply = async (e: React.FormEvent, resolve: boolean = false) => {
        e.preventDefault();
        if (!selectedTicketId || (!replyContent.trim() && !resolve)) return;

        setLoading(true);
        try {
            const token = user?.token;
            const res = await fetch(`/api/v1/support/tickets/${selectedTicketId}/reply`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ content: replyContent, resolve })
            });

            if (res.ok) {
                setReplyContent('');
                if (resolve) {
                    setSelectedTicketId(null);
                }
                await fetchTickets(); // Refresh
            }
        } catch (error) {
            console.error('Failed to send reply', error);
        } finally {
            setLoading(false);
        }
    };

    const activeTicket = tickets.find(t => t.id === selectedTicketId);

    return (
        <div className="flex flex-col h-[calc(100vh-80px)] p-6 text-white overflow-hidden">
            {!selectedTicketId ? (
                // GRID LAYOUT (First Page)
                <div className="flex flex-col h-full overflow-y-auto">
                    <div className="flex items-center gap-3 text-amber-500 mb-6">
                        <ShieldAlert size={28} />
                        <div>
                            <h2 className="text-2xl font-bold tracking-widest uppercase">Support Triage</h2>
                            <p className="text-sm text-gray-400">Executive Command Center for Store Support</p>
                        </div>
                    </div>

                    {/* Social Proof: Company Ratings */}
                    {ratings.length > 0 && (
                        <div className="mb-8 border border-gray-800 rounded-xl bg-gray-900/50 p-4">
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <Star size={12} className="text-amber-500 fill-amber-500" />
                                AGV Operational Intelligence Rating
                            </h3>
                            <div className="flex flex-wrap gap-4">
                                {ratings.map(r => (
                                    <div key={r.company_id} className="flex items-center gap-2 bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-700">
                                        <span className="text-sm font-semibold text-gray-200">{r.company_name}</span>
                                        <div className="flex items-center gap-1 bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded text-sm font-bold border border-amber-500/20">
                                            {r.total_ratings > 0 ? r.average_rating.toFixed(1) : 'NEW'} <Star size={12} className={r.total_ratings > 0 ? "fill-amber-500" : ""} />
                                        </div>
                                        <span className="text-[10px] text-gray-500">
                                            {r.total_ratings > 0 ? `(${r.total_ratings})` : '(No tickets rated yet)'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {errorMsg && (
                        <div className="mb-6 p-4 bg-red-900/50 border border-red-500/50 text-red-200 rounded-lg">
                            {errorMsg}
                        </div>
                    )}

                    {tickets.length === 0 && !errorMsg ? (
                        <div className="flex flex-col items-center justify-center p-12 text-center text-gray-500 h-64 border border-dashed border-gray-700 rounded-xl">
                            <CheckCircle2 size={48} className="text-green-500/50 mb-4" />
                            <p className="text-xl font-medium text-gray-300">Inbox Zero</p>
                            <p className="text-sm mt-2">No active store escalations require executive attention at this time.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {tickets.map(ticket => (
                                <button
                                    key={ticket.id}
                                    onClick={() => setSelectedTicketId(ticket.id)}
                                    className="flex flex-col text-left bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-lg hover:border-amber-500/50 hover:shadow-amber-900/20 transition-all group"
                                >
                                    <div className="p-4 bg-gray-800 border-b border-gray-700 flex justify-between items-start">
                                        <div>
                                            <h3 className="font-bold text-amber-400">{ticket.store.store_name}</h3>
                                            <p className="text-xs text-gray-400">{ticket.store.location}</p>
                                        </div>
                                        <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-1 rounded-full border border-red-500/30 flex items-center gap-1 font-bold">
                                            ESCALATED
                                        </span>
                                    </div>
                                    <div className="p-5 flex-1 w-full">
                                        <div className="flex items-start gap-2 mb-3">
                                            <MessageSquare size={16} className="text-gray-500 mt-1 flex-shrink-0" />
                                            <p className="text-sm font-medium text-gray-200 line-clamp-2">{ticket.title}</p>
                                        </div>
                                        <div className="flex justify-between items-center mt-6 text-xs text-gray-500">
                                            <span className="flex items-center gap-1">
                                                <UserIcon size={12} />
                                                {ticket.user.first_name} {ticket.user.last_name}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Clock size={12} />
                                                {new Date(ticket.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="p-3 bg-amber-500/10 text-amber-500 text-center text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity w-full">
                                        Open Ticket
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                // ACTIVE TICKET DIALOG (Resolution View)
                <div className="flex flex-col h-full bg-gray-900 border border-gray-800 rounded-xl shadow-2xl relative">
                    {/* Header */}
                    <div className="p-4 border-b border-gray-700 bg-gray-800 flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setSelectedTicketId(null)}
                                className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-white"
                            >
                                <ArrowLeft size={20} />
                            </button>
                            <div>
                                <h3 className="font-bold text-lg text-white">{activeTicket?.store.store_name}</h3>
                                <p className="text-xs text-gray-400">{activeTicket?.store.location} • {activeTicket?.user.email}</p>
                            </div>
                        </div>
                        <button
                            onClick={(e) => sendReply(e, true)}
                            disabled={loading}
                            className="px-4 py-2 bg-green-600/20 hover:bg-green-600/40 text-green-400 text-sm font-bold border border-green-500/30 rounded-lg transition-colors flex items-center gap-2"
                        >
                            <CheckCircle2 size={18} /> Mark as Resolved
                        </button>
                    </div>

                    {/* Chat History */}
                    <div className="flex-1 p-6 overflow-y-auto space-y-4">
                        {activeTicket?.messages.map((msg) => (
                            <div key={msg.id} className={`flex ${msg.sender_type === 'USER' ? 'justify-start' : 'justify-end'}`}>
                                <div className={`flex flex-col max-w-[80%]`}>
                                    <div className={`flex gap-3 ${msg.sender_type === 'USER' ? 'flex-row' : 'flex-row-reverse'}`}>
                                        <div className={`p-2 rounded-full h-fit flex-shrink-0 ${msg.sender_type === 'USER' ? 'bg-gray-800' :
                                            msg.sender_type === 'ADMIN' ? 'bg-amber-600/80 border border-amber-500' : 'bg-red-900/50 text-red-500'
                                            }`}>
                                            {msg.sender_type === 'USER' ? <UserIcon size={16} /> :
                                                msg.sender_type === 'ADMIN' ? <ShieldAlert size={16} /> : <Bot size={16} />}
                                        </div>
                                        <div className={`p-3 rounded-2xl ${msg.sender_type === 'USER' ? 'bg-gray-800 text-gray-100 rounded-tl-sm' :
                                            msg.sender_type === 'ADMIN' ? 'bg-gradient-to-br from-amber-600 to-amber-700 text-white rounded-tr-sm shadow-lg shadow-amber-900/20' :
                                                'bg-gray-900 border border-gray-700 text-gray-400 rounded-tr-sm text-xs italic'
                                            }`}>
                                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                        </div>
                                    </div>
                                    <div className={`text-[10px] text-gray-500 mt-1 mx-12 ${msg.sender_type === 'USER' ? 'text-left' : 'text-right'}`}>
                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Input Area */}
                    <div className="p-4 bg-gray-800 border-t border-gray-700">
                        <form onSubmit={(e) => sendReply(e, false)} className="relative">
                            <textarea
                                value={replyContent}
                                onChange={(e) => setReplyContent(e.target.value)}
                                placeholder="Type your official reply to the store..."
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-4 pr-16 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors resize-none h-28 text-white"
                            />
                            <button
                                type="submit"
                                disabled={!replyContent.trim() || loading}
                                className="absolute bottom-6 right-6 p-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:hover:bg-amber-600 transition-colors font-bold shadow-lg shadow-amber-900/20"
                            >
                                <Send size={20} />
                            </button>
                        </form>
                        <p className="text-[11px] text-gray-500 mt-3 text-right">
                            Operating as: <span className="text-amber-500/70 font-bold uppercase">Executive Triage</span>
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

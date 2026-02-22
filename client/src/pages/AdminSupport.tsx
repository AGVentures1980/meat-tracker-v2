import React, { useState, useEffect } from 'react';
import { Send, Bot, User as UserIcon, Clock, CheckCircle2, ShieldAlert } from 'lucide-react';

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
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
    const [replyContent, setReplyContent] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchTickets();

        // Polling every 15 seconds for new tickets since it's a critical dashboard
        const interval = setInterval(fetchTickets, 15000);
        return () => clearInterval(interval);
    }, []);

    const fetchTickets = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/v1/support/tickets', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setTickets(data);
            }
        } catch (error) {
            console.error('Failed to load tickets', error);
        }
    };

    const sendReply = async (e: React.FormEvent, resolve: boolean = false) => {
        e.preventDefault();
        if (!selectedTicketId || (!replyContent.trim() && !resolve)) return;

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
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
        <div className="flex h-[calc(100vh-80px)] gap-6 p-4 md:p-6 text-white overflow-hidden">

            {/* Left Column: Inbox List */}
            <div className="w-1/3 bg-[#1a1a1a] border border-[#333] rounded-xl flex flex-col shadow-2xl overflow-hidden">
                <div className="p-4 border-b border-[#333] bg-[#222]">
                    <div className="flex items-center gap-2 text-amber-500 mb-1">
                        <ShieldAlert size={20} />
                        <h2 className="font-bold tracking-widest uppercase">Support Triage</h2>
                    </div>
                    <p className="text-xs text-gray-400">Executive Command Center for Store Support</p>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {tickets.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-8 text-center text-gray-500 h-full">
                            <CheckCircle2 size={32} className="text-green-500/50 mb-3" />
                            <p className="text-sm">Inbox Zero</p>
                            <p className="text-xs">No active escalations.</p>
                        </div>
                    ) : (
                        tickets.map(ticket => (
                            <button
                                key={ticket.id}
                                onClick={() => setSelectedTicketId(ticket.id)}
                                className={`w-full text-left p-4 rounded-lg border transition-all ${selectedTicketId === ticket.id
                                    ? 'bg-amber-500/10 border-amber-500/30 ring-1 ring-amber-500/50'
                                    : 'bg-[#252525] border-[#333] hover:border-gray-500'
                                    }`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-xs font-bold font-mono text-amber-400 truncate max-w-[150px]">
                                        {ticket.store.store_name}
                                    </span>
                                    <span className="text-[10px] text-gray-500 flex items-center gap-1">
                                        <Clock size={10} />
                                        {new Date(ticket.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <p className="text-sm font-medium text-gray-200 truncate">{ticket.title}</p>
                                <div className="flex justify-between items-center mt-3">
                                    <span className="text-xs text-gray-400 truncate">{ticket.user.first_name} {ticket.user.last_name}</span>
                                    <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full border border-red-500/30">
                                        ESCALATED
                                    </span>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Right Column: Chat View */}
            <div className="flex-1 bg-[#1a1a1a] border border-[#333] rounded-xl flex flex-col shadow-2xl overflow-hidden relative">
                {!activeTicket ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                        <ShieldAlert size={48} className="mb-4 opacity-20" />
                        <p className="text-sm">Select a store ticket to review conversation history and reply.</p>
                    </div>
                ) : (
                    <>
                        <div className="p-4 border-b border-[#333] bg-[#222] flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-lg text-white">{activeTicket.store.store_name}</h3>
                                <p className="text-xs text-gray-400">{activeTicket.store.location} • {activeTicket.user.email}</p>
                            </div>
                            <button
                                onClick={(e) => sendReply(e, true)}
                                disabled={loading}
                                className="px-4 py-2 bg-green-600/20 hover:bg-green-600/40 text-green-400 text-xs font-bold border border-green-500/30 rounded-lg transition-colors flex items-center gap-2"
                            >
                                <CheckCircle2 size={16} /> Mark Resolved
                            </button>
                        </div>

                        <div className="flex-1 p-6 overflow-y-auto space-y-4">
                            {activeTicket.messages.map((msg) => (
                                <div key={msg.id} className={`flex ${msg.sender_type === 'USER' ? 'justify-start' : 'justify-end'}`}>
                                    <div className={`flex gap-3 max-w-[80%] ${msg.sender_type === 'USER' ? 'flex-row' : 'flex-row-reverse'}`}>
                                        <div className={`p-2 rounded-full h-fit flex-shrink-0 ${msg.sender_type === 'USER' ? 'bg-gray-800' :
                                            msg.sender_type === 'ADMIN' ? 'bg-amber-600/80 border border-amber-500' : 'bg-red-900/50 text-red-500'
                                            }`}>
                                            {msg.sender_type === 'USER' ? <UserIcon size={16} /> :
                                                msg.sender_type === 'ADMIN' ? <ShieldAlert size={16} /> : <Bot size={16} />}
                                        </div>
                                        <div className={`p-3 rounded-2xl ${msg.sender_type === 'USER' ? 'bg-gray-800 text-gray-100 rounded-tl-sm' :
                                            msg.sender_type === 'ADMIN' ? 'bg-gradient-to-br from-amber-600 to-amber-700 text-white rounded-tr-sm shadow-lg shadow-amber-900/20' :
                                                'bg-gray-900 border border-[#333] text-gray-400 rounded-tr-sm text-xs italic'
                                            }`}>
                                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-4 bg-[#222] border-t border-[#333]">
                            <form onSubmit={(e) => sendReply(e, false)} className="relative">
                                <textarea
                                    value={replyContent}
                                    onChange={(e) => setReplyContent(e.target.value)}
                                    placeholder="Type your official reply to the store..."
                                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg p-3 pr-12 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors resize-none h-24"
                                />
                                <button
                                    type="submit"
                                    disabled={!replyContent.trim() || loading}
                                    className="absolute bottom-4 right-4 p-2 bg-amber-600 text-white rounded hover:bg-amber-700 disabled:opacity-50 disabled:hover:bg-amber-600 transition-colors"
                                >
                                    <Send size={16} />
                                </button>
                            </form>
                            <p className="text-[10px] text-gray-500 mt-2 text-right">
                                Operating as: <span className="text-amber-500/70 font-bold uppercase">Executive Triage</span>
                            </p>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

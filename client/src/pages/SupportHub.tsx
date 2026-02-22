import React, { useState, useEffect } from 'react';
import { Send, Bot, User as UserIcon, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface FAQ {
    id: string;
    question: string;
    answer: string;
    category: string;
}

interface Message {
    id: string;
    content: string;
    sender_type: 'USER' | 'AI' | 'ADMIN';
    created_at: string;
}

export const SupportHub: React.FC = () => {
    const { user, selectedCompany } = useAuth();
    const [faqs, setFaqs] = useState<FAQ[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputQuery, setInputQuery] = useState('');
    const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
    const [isEscalated, setIsEscalated] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchFaqs();
        fetchThread();
    }, [selectedCompany]);

    const fetchFaqs = async () => {
        try {
            const token = user?.token;
            const res = await fetch('/api/v1/support/faq', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setFaqs(data);
            } else {
                let errorMessage = 'Failed to load FAQs. Server returned a non-200 status.';
                try {
                    const errData = await res.json();
                    errorMessage = errData.error || errorMessage;
                } catch (e) { }
                setFaqs([{
                    id: 'error-faq',
                    question: '⚠️ System Error Loading FAQs',
                    answer: `The server encountered a fatal error while trying to fetch the FAQs: ${errorMessage}. If you just deployed, make sure 'prisma db push' ran successfully on your remote database.`,
                    category: 'System Error'
                }]);
            }
        } catch (error) {
            console.error('Failed to load FAQs', error);
            setFaqs([{
                id: 'error-faq-net',
                question: '⚠️ Network Error',
                answer: 'Could not reach the backend server to load FAQs. Please check your internet connection or the server URL.',
                category: 'System Error'
            }]);
        }
    };

    const fetchThread = async () => {
        try {
            const token = user?.token;
            const url = selectedCompany ? `/api/v1/support/chat?store_id=${selectedCompany}` : '/api/v1/support/chat';
            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setMessages(data);
            } else {
                let errorMessage = 'Failed to load Support History.';
                try {
                    const errData = await res.json();
                    errorMessage = errData.error || errorMessage;
                } catch (e) { }
                setMessages([{
                    id: 'error-thread',
                    content: `[SYSTEM ERROR] Could not retrieve your active ticket history: ${errorMessage}. If this is a fresh deployment, verify your remote Database migrations.`,
                    sender_type: 'AI',
                    created_at: new Date().toISOString()
                }]);
            }
        } catch (error) {
            console.error('Failed to load thread', error);
            setMessages([{
                id: 'error-thread-net',
                content: `[NETWORK ERROR] Could not reach the API to retrieve your history. Check the URL routing.`,
                sender_type: 'AI',
                created_at: new Date().toISOString()
            }]);
        }
    };

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputQuery.trim()) return;

        const optimisticMessage: Message = {
            id: Date.now().toString(),
            content: inputQuery,
            sender_type: 'USER',
            created_at: new Date().toISOString()
        };

        setMessages(prev => [...prev, optimisticMessage]);
        setInputQuery('');
        setLoading(true);

        try {
            const token = user?.token;
            const payload: any = { content: optimisticMessage.content };
            if (selectedCompany) payload.store_id = selectedCompany;

            const res = await fetch('/api/v1/support/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const data = await res.json();
                setMessages(data.messages);
                if (data.isEscalated) {
                    setIsEscalated(true);
                }
            } else {
                let errorMessage = 'Failed to connect to AI Support. Please try again.';
                try {
                    const errData = await res.json();
                    errorMessage = errData.error || errorMessage;
                } catch (e) { }

                // Add error message as a system response so the user sees it visually
                setMessages(prev => [...prev, {
                    id: Date.now().toString() + '-err',
                    content: `[SYSTEM ERROR]: ${errorMessage}. Please screenshot this and send it to the Executive Team.`,
                    sender_type: 'AI',
                    created_at: new Date().toISOString()
                }]);
            }
        } catch (error) {
            console.error('Failed to send message', error);
            setMessages(prev => [...prev, {
                id: Date.now().toString() + '-err',
                content: `[NETWORK ERROR]: Could not reach the server. Please check your internet connection or contact the Admin.`,
                sender_type: 'AI',
                created_at: new Date().toISOString()
            }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 p-6 h-[calc(100vh-80px)] text-white">

            {/* Left Column: AI Support Chat */}
            <div className="w-full lg:w-2/3 flex flex-col bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-2xl">

                {/* Header */}
                <div className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-600/20 text-red-500 rounded-lg">
                            <Bot size={24} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold">AGV Support Agent</h2>
                            <p className="text-xs text-gray-400">Technical Assistance & Operational Intelligence</p>
                        </div>
                    </div>
                    {isEscalated && (
                        <div className="flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full text-xs font-medium">
                            <AlertCircle size={14} />
                            Escalation Active
                        </div>
                    )}
                </div>

                {/* Chat History */}
                <div className="flex-1 p-6 overflow-y-auto space-y-4">
                    {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500">
                            <Bot size={48} className="mb-4 opacity-50" />
                            <p className="text-lg font-medium text-gray-300">Hello {user?.first_name || 'Chef'}, how can I help you today? Let's get started.</p>
                        </div>
                    ) : (
                        messages.map((msg) => (
                            <div key={msg.id} className={`flex ${msg.sender_type === 'USER' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`flex flex-col max-w-[80%]`}>
                                    <div className={`flex gap-3 ${msg.sender_type === 'USER' ? 'flex-row-reverse' : 'flex-row'}`}>
                                        <div className={`p-2 rounded-full h-fit flex-shrink-0 ${msg.sender_type === 'USER' ? 'bg-gray-800' :
                                            msg.sender_type === 'ADMIN' ? 'bg-amber-600' : 'bg-red-600'
                                            }`}>
                                            {msg.sender_type === 'USER' ? <UserIcon size={16} /> : <Bot size={16} />}
                                        </div>
                                        <div className={`p-3 rounded-2xl ${msg.sender_type === 'USER' ? 'bg-gray-800 text-gray-100 rounded-tr-sm' :
                                            msg.sender_type === 'ADMIN' ? 'bg-gradient-to-br from-amber-600 to-amber-700 text-white rounded-tl-sm shadow-amber-900/50' :
                                                'bg-gray-800 border border-gray-700 text-gray-300 rounded-tl-sm'
                                            }`}>
                                            {msg.sender_type === 'ADMIN' && (
                                                <div className="text-[10px] font-bold text-amber-200 uppercase tracking-wider mb-1 flex items-center gap-1">
                                                    Official AGV Executive Reply
                                                </div>
                                            )}
                                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                        </div>
                                    </div>
                                    <div className={`text-[10px] text-gray-500 mt-1 mx-12 ${msg.sender_type === 'USER' ? 'text-right' : 'text-left'}`}>
                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                    {loading && (
                        <div className="flex justify-start">
                            <div className="flex gap-3 max-w-[80%] flex-row">
                                <div className="p-2 bg-red-600 rounded-full h-fit">
                                    <Bot size={16} />
                                </div>
                                <div className="p-3 bg-gray-800 border border-gray-700 rounded-2xl rounded-tl-sm">
                                    <div className="flex gap-1 items-center h-5">
                                        <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"></div>
                                        <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                        <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="p-4 bg-gray-900 border-t border-gray-800">
                    <form onSubmit={sendMessage} className="relative">
                        <input
                            type="text"
                            value={inputQuery}
                            onChange={(e) => setInputQuery(e.target.value)}
                            placeholder="Ask a question or report an issue..."
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg py-3 pl-4 pr-12 text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
                        />
                        <button
                            type="submit"
                            disabled={!inputQuery.trim() || loading}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:hover:bg-red-600 transition-colors"
                        >
                            <Send size={16} />
                        </button>
                    </form>
                    <p className="text-xs text-gray-500 mt-2 text-center">
                        Urgent technical issues will be automatically redirected to the Executive Board.
                    </p>
                </div>
            </div>

            {/* Right Column: Dynamic FAQ */}
            <div className="w-full lg:w-1/3 flex flex-col gap-4">
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-2xl">
                    <h3 className="text-lg font-bold text-white mb-2">Frequently Asked Questions</h3>
                    <p className="text-xs text-gray-400 mb-6">The {faqs.length} most common questions in the Brasa network this week.</p>

                    <div className="space-y-3">
                        {faqs.map((faq) => (
                            <div key={faq.id} className="border border-gray-800 rounded-lg overflow-hidden bg-black/40">
                                <button
                                    onClick={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)}
                                    className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-800/50 transition-colors"
                                >
                                    <span className="text-sm font-medium text-gray-200 pr-4">{faq.question}</span>
                                    {expandedFaq === faq.id ? <ChevronUp size={16} className="text-red-500 flex-shrink-0" /> : <ChevronDown size={16} className="text-gray-500 flex-shrink-0" />}
                                </button>
                                {expandedFaq === faq.id && (
                                    <div className="px-4 pb-4 pt-0">
                                        <div className="h-px w-full bg-gray-800 mb-3"></div>
                                        <p className="text-sm text-gray-400 leading-relaxed">{faq.answer}</p>
                                        <div className="mt-3 inline-block px-2 py-1 bg-gray-800 text-gray-500 text-[10px] uppercase rounded">
                                            {faq.category}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

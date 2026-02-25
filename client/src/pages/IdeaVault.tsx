import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, Send, Paperclip, ChevronLeft, Bot, User, FileText, Image as ImageIcon, WifiOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useOfflineVault } from '../hooks/useOfflineVault';

export const IdeaVault = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [isUnlocked, setIsUnlocked] = useState(false);
    const [pinCode, setPinCode] = useState('');
    const [pinError, setPinError] = useState('');

    // Offline Hook
    const { messages, pendingMessages, isOnline, isSyncing, enqueueMessage, fetchVaultMessages } = useOfflineVault();

    const [inputText, setInputText] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Only allow Directors/Admins to even see the PIN screen optionally, 
    // but the backend enforces the PIN anyway. Let's just enforce PIN.

    useEffect(() => {
        if (isUnlocked && isOnline) {
            fetchVaultMessages();
        }
    }, [isUnlocked, isOnline, fetchVaultMessages]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handlePinSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setPinError('');
        try {
            const res = await fetch('/api/v1/vault/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user?.token}`
                },
                body: JSON.stringify({ pin: pinCode })
            });
            const data = await res.json();
            if (data.success) {
                setIsUnlocked(true);
            } else {
                setPinError('Invalid PIN');
                setPinCode('');
            }
        } catch (err) {
            setPinError('Connection error');
        }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputText.trim() && !selectedFile) return;

        await enqueueMessage(inputText, selectedFile);

        setInputText('');
        setSelectedFile(null);
    };
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setSelectedFile(e.target.files[0]);
        }
    };

    if (!isUnlocked) {
        return (
            <div className="h-[100dvh] bg-black flex flex-col items-center justify-center p-6 relative z-50">
                <div className="w-full max-w-sm">
                    <div className="text-center mb-10">
                        <div className="w-20 h-20 bg-[#1a1a1a] rounded-full flex items-center justify-center mx-auto mb-6 border border-[#333]">
                            <Lock className="w-8 h-8 text-brand-gold" />
                        </div>
                        <h1 className="text-2xl font-bold text-white tracking-widest uppercase mb-2">AGV Idea Vault</h1>
                        <p className="text-gray-500 text-xs font-mono uppercase">Restricted Access // Owner Only</p>
                    </div>

                    <form onSubmit={handlePinSubmit} className="space-y-6">
                        <div>
                            <input
                                type="password"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength={6}
                                value={pinCode}
                                onChange={(e) => setPinCode(e.target.value)}
                                className="w-full bg-[#111] border-b-2 border-[#333] focus:border-brand-gold text-center text-4xl text-white tracking-[1em] py-4 outline-none transition-colors"
                                placeholder={"••••••"}
                                autoFocus
                            />
                            {pinError && <p className="text-red-500 text-xs font-bold text-center mt-4 animate-pulse uppercase tracking-widest">{pinError}</p>}
                        </div>
                        <button
                            type="submit"
                            disabled={pinCode.length < 4}
                            className="w-full bg-brand-gold hover:bg-yellow-500 text-black py-4 font-bold uppercase tracking-widest text-sm disabled:opacity-50 transition-all rounded-sm"
                        >
                            Unlock Vault
                        </button>
                    </form>

                    <button onClick={() => navigate('/dashboard')} className="w-full text-center mt-8 text-gray-500 text-xs uppercase hover:text-white transition-colors">
                        &larr; Return to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[100dvh] bg-black relative z-50">
            {/* Header */}
            <header className="bg-[#111] border-b border-[#333] p-4 flex items-center gap-4 shrink-0">
                <button onClick={() => navigate('/dashboard')} className="text-gray-400 p-2 -ml-2 hover:bg-[#222] rounded-full">
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-brand-gold/10 border border-brand-gold/30 rounded-full flex items-center justify-center">
                        <Lock className="w-5 h-5 text-brand-gold" />
                    </div>
                    <div>
                        <h1 className="text-white font-bold tracking-widest uppercase text-sm flex items-center gap-2">
                            Idea Vault
                            {!isOnline && <WifiOff className="w-3 h-3 text-red-500" />}
                        </h1>
                        <p className={`text-[10px] font-mono uppercase ${!isOnline ? 'text-red-500' : isSyncing ? 'text-yellow-500' : 'text-[#00FF94]'}`}>
                            {!isOnline ? 'Offline Mode' : isSyncing ? 'Syncing...' : 'Encrypted // Sync Active'}
                        </p>
                    </div>
                </div>
            </header>

            {/* Messages Area */}
            <main className="flex-1 overflow-y-auto p-4 space-y-6 bg-gradient-to-b from-black to-[#050505] pb-8">
                <div className="text-center text-xs text-brand-gold font-mono uppercase tracking-widest mb-8 border-b border-brand-gold/20 pb-4">
                    AGV Ventures End-to-End Encryption
                </div>

                {messages.map((msg) => {
                    const isOwner = msg.sender === 'OWNER';
                    return (
                        <div key={msg.id} className={`flex flex-col ${isOwner ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-2`}>
                            <div className={`text-[10px] text-gray-500 mb-1 flex items-center gap-1 ${isOwner ? 'flex-row-reverse' : 'flex-row'}`}>
                                {isOwner ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3 text-brand-gold" />}
                                {isOwner ? 'Alexandre Garcia' : 'AGV AI OS'}
                            </div>
                            <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${isOwner ? 'bg-brand-gold text-black rounded-tr-sm' : 'bg-[#1a1a1a] border border-[#333] text-gray-200 rounded-tl-sm'}`}>
                                {msg.file_url && (
                                    <div className="mb-2">
                                        {msg.file_type?.startsWith('image/') ? (
                                            <img src={msg.file_url} alt="Attachment" className="max-w-full rounded-md border border-black/10" />
                                        ) : (
                                            <a href={msg.file_url} download={msg.file_name} className="flex items-center gap-2 bg-black/10 p-2 rounded-md text-xs font-bold hover:bg-black/20">
                                                <FileText className="w-4 h-4" />
                                                <span className="truncate max-w-[150px]">{msg.file_name || 'Document Attached'}</span>
                                            </a>
                                        )}
                                    </div>
                                )}
                                {msg.text && <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>}
                            </div>
                            <span className="text-[9px] text-gray-600 font-mono mt-1">
                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </main>

            {/* Input Area */}
            <footer
                className="bg-[#111] border-t border-[#333] p-3 shrink-0 w-full z-50 relative"
                style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
            >
                {selectedFile && (
                    <div className="absolute -top-12 left-0 right-0 bg-[#222] p-2 flex justify-between items-center border-t border-[#333]">
                        <div className="flex items-center gap-2 text-xs text-gray-300">
                            {selectedFile.type.startsWith('image/') ? <ImageIcon className="w-4 h-4 text-brand-gold" /> : <FileText className="w-4 h-4 text-brand-gold" />}
                            <span className="truncate max-w-[200px]">{selectedFile.name}</span>
                        </div>
                        <button onClick={() => setSelectedFile(null)} className="text-gray-500 hover:text-white text-xs font-bold uppercase">✕</button>
                    </div>
                )}

                <form onSubmit={handleSend} className="flex gap-2 relative">
                    <input
                        type="file"
                        id="vault-file"
                        className="hidden"
                        onChange={handleFileChange}
                    />
                    <label
                        htmlFor="vault-file"
                        className="w-12 h-12 bg-[#1a1a1a] border border-[#333] rounded-full flex items-center justify-center text-gray-400 hover:text-brand-gold hover:border-brand-gold transition-colors cursor-pointer shrink-0"
                    >
                        <Paperclip className="w-5 h-5" />
                    </label>

                    <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="Drop an idea or insight..."
                        className="flex-1 bg-[#1a1a1a] border border-[#333] rounded-full px-5 text-sm text-white focus:border-brand-gold outline-none transition-colors"
                    />

                    <button
                        type="submit"
                        disabled={!inputText.trim() && !selectedFile}
                        className="w-12 h-12 bg-brand-gold hover:bg-yellow-500 text-black rounded-full flex items-center justify-center disabled:opacity-50 shrink-0 transition-transform active:scale-95"
                    >
                        <Send className="w-5 h-5 ml-1" />
                    </button>
                </form>
            </footer>
        </div>
    );
};

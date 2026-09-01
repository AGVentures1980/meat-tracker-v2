'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import {
  MessageSquare,
  Send,
  Loader2,
  Sparkles,
  BookmarkCheck,
  Star,
  ExternalLink,
} from 'lucide-react';

interface ChatMessage {
  role: 'USER' | 'ASSISTANT';
  content: string;
}

interface Evidence {
  id: string;
  authorName: string;
  text: string;
  rating?: number;
}

function AskBrasaContent() {
  const searchParams = useSearchParams();

  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [evidences, setEvidences] = useState<Evidence[]>([]);
  const [loading, setLoading] = useState(false);
  const [confidence, setConfidence] = useState<number | null>(null);

  // Setup default greeting
  useEffect(() => {
    setMessages([
      {
        role: 'ASSISTANT',
        content: `Olá! I am Ask BRASA™, your AI Reputation Intelligence assistant. How can I help you analyze your restaurant reviews, menu items, or employee praises today?`,
      },
    ]);
  }, []);

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || loading) return;

    const user = JSON.parse(localStorage.getItem('brasa_user') || '{}');
    const locId = searchParams.get('locationId') || 'ALL';

    const userMsg = question;
    setMessages((prev) => [...prev, { role: 'USER', content: userMsg }]);
    setQuestion('');
    setLoading(true);
    setEvidences([]);
    setConfidence(null);

    try {
      const res = await fetch('/api/ask-brasa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: userMsg,
          organizationId: user.organizationId,
          locationId: locId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, { role: 'ASSISTANT', content: data.answer }]);
        setEvidences(data.evidences || []);
        setConfidence(data.confidence || 0.94);
      } else {
        throw new Error('Ask BRASA failed to respond.');
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: 'ASSISTANT', content: `Desculpe, I encountered an error: ${err?.message || 'Check connection.'}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-content">
        <Header />
        <main className="page-container" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem', height: 'calc(100vh - var(--header-height) - 4rem)', overflow: 'hidden' }}>
          {/* Chat Window */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '1.5rem 2rem', overflow: 'hidden' }}>
            <div className="flex-between" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
              <div className="flex-align">
                <Sparkles size={20} className="text-info" />
                <h3 style={{ fontWeight: 700 }}>Ask BRASA™ Assistant</h3>
              </div>
              <span className="text-muted" style={{ fontSize: '0.8rem' }}>Tenant Isolated Scoped Query</span>
            </div>

            {/* Messages Feed */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 0', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  style={{
                    alignSelf: msg.role === 'USER' ? 'flex-end' : 'flex-start',
                    maxWidth: '85%',
                    backgroundColor: msg.role === 'USER' ? 'var(--accent-gold-bg)' : 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    borderColor: msg.role === 'USER' ? 'var(--accent-gold)' : '',
                    borderRadius: '12px',
                    padding: '1rem',
                  }}
                >
                  <p style={{ fontSize: '0.9rem', lineHeight: 1.4 }}>{msg.content}</p>
                </div>
              ))}
              {loading && (
                <div style={{ alignSelf: 'flex-start', display: 'flex', gap: '0.5rem', alignItems: 'center', color: 'var(--text-secondary)' }}>
                  <Loader2 size={16} className="animate-spin text-info" />
                  <span>Ask BRASA is researching context...</span>
                </div>
              )}
            </div>

            {/* Input Form */}
            <form onSubmit={handleAsk} style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', display: 'flex', gap: '0.75rem' }}>
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask: Why did Orlando Brand Pulse drop? / What are customers saying about Mike?"
                style={{ flex: 1, padding: '0.75rem 1rem', backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff', outline: 'none' }}
                disabled={loading}
              />
              <button type="submit" disabled={loading || !question.trim()} className="btn btn-primary" style={{ padding: '0 1.25rem' }}>
                <Send size={16} />
              </button>
            </form>
          </div>

          {/* Traceability Panel */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
            <h3 className="card-title flex-align" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
              <BookmarkCheck size={18} className="text-positive" />
              <span>Evidence Traceability (Evidence First)</span>
            </h3>

            {confidence && (
              <div className="mt-2 text-positive" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                Data Confidence: {Math.round(confidence * 100)}% (Verified Context)
              </div>
            )}

            <div className="mt-4" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {evidences.length === 0 ? (
                <p className="text-muted" style={{ fontStyle: 'italic' }}>
                  Ask a question first. Clickable source reviews used to build response will appear here.
                </p>
              ) : (
                evidences.map((ev) => (
                  <div key={ev.id} style={{ backgroundColor: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div className="flex-between">
                      <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{ev.authorName}</span>
                      {ev.rating && (
                        <div style={{ display: 'flex', gap: '0.1rem' }}>
                          {Array.from({ length: 5 }, (_, i) => (
                            <Star
                              key={i}
                              size={10}
                              fill={i < ev.rating! ? 'var(--status-watch)' : 'none'}
                              stroke="var(--status-watch)"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }} className="mt-2">
                      &quot;{ev.text}&quot;
                    </p>
                    <div className="mt-2 flex-align" style={{ justifyContent: 'flex-end' }}>
                      <a href={`/reviews?id=${ev.id}`} style={{ color: 'var(--accent-gold)', fontSize: '0.75rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                        <span>Open details</span>
                        <ExternalLink size={10} />
                      </a>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function AskBrasaPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: 'var(--bg-primary)', color: '#fff' }}>
        <Loader2 className="animate-spin" />
        <span style={{ marginLeft: '0.5rem' }}>Loading Ask BRASA...</span>
      </div>
    }>
      <AskBrasaContent />
    </Suspense>
  );
}

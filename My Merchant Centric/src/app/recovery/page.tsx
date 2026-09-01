'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import {
  HeartHandshake,
  Loader2,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  ExternalLink,
} from 'lucide-react';

interface RecoveryCase {
  id: string;
  locationId: string;
  location: { name: string };
  contentItem: { text: string; rating?: number };
  severity: string;
  status: string;
  openedAt: string;
  dueAt: string;
  resolvedAt?: string;
  resolutionType?: string;
  notes?: string;
  activities: Array<{ id: string; type: string; description: string; createdAt: string }>;
}

function RecoveryCenterContent() {
  const searchParams = useSearchParams();

  const [cases, setCases] = useState<RecoveryCase[]>([]);
  const [activeCase, setActiveCase] = useState<RecoveryCase | null>(null);
  const [loading, setLoading] = useState(true);

  // Tab filter: OPEN, RESOLVED, ALL
  const [tab, setTab] = useState<'OPEN' | 'RESOLVED' | 'ALL'>('OPEN');

  // Resolution Form State
  const [resolutionType, setResolutionType] = useState('APOLOGY');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchCases = async () => {
    setLoading(true);
    try {
      const locId = searchParams.get('locationId') || 'ALL';
      const url = `/api/recovery?${locId !== 'ALL' ? `locationId=${locId}` : ''}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setCases(data);
        if (data.length > 0) {
          // Default selection to matched active case if still exists
          setActiveCase((prev) => data.find((c: RecoveryCase) => c.id === prev?.id) || data[0]);
        } else {
          setActiveCase(null);
        }
      }
    } catch (e) {
      console.error('Error fetching recovery cases:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, [searchParams]);

  const handleResolveCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCase) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/recovery/${activeCase.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'RESOLVED',
          resolutionType,
          notes,
        }),
      });

      if (res.ok) {
        setNotes('');
        fetchCases(); // Refresh
      }
    } catch (e) {
      console.error('Error resolving case:', e);
    } finally {
      setSubmitting(false);
    }
  };

  // Filter cases based on active tab
  const filteredCases = cases.filter((c) => {
    if (tab === 'OPEN') return c.status === 'OPEN' || c.status === 'ASSIGNED' || c.status === 'ESCALATED';
    if (tab === 'RESOLVED') return c.status === 'RESOLVED' || c.status === 'CLOSED';
    return true; // ALL
  });

  const getSeverityColor = (sev: string) => {
    if (sev === 'CRITICAL') return 'var(--status-critical)';
    if (sev === 'HIGH') return 'var(--status-watch)';
    return 'var(--status-healthy)';
  };

  const getSlaStatus = (dueAt: string, status: string) => {
    if (status === 'RESOLVED' || status === 'CLOSED') {
      return <span className="text-positive flex-align"><CheckCircle size={12} /> Resolved</span>;
    }
    const isOverdue = new Date(dueAt).getTime() < Date.now();
    return isOverdue ? (
      <span className="text-negative flex-align"><AlertCircle size={12} /> SLA Breached</span>
    ) : (
      <span className="text-warning flex-align"><Clock size={12} /> Active SLA</span>
    );
  };

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-content">
        <Header />
        <main className="page-container">
          {/* Page Title */}
          <div className="mb-4">
            <h1 style={{ fontSize: '25px', fontWeight: 800 }}>Guest Recovery Center</h1>
            <p className="text-secondary">Address and recover customer reputation incidents before they escalate.</p>
          </div>

          {/* Tabs header */}
          <div className="flex-align mb-4" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
            <button
              onClick={() => setTab('OPEN')}
              className="btn"
              style={{
                backgroundColor: tab === 'OPEN' ? 'var(--accent-gold-bg)' : 'transparent',
                color: tab === 'OPEN' ? 'var(--accent-gold)' : 'var(--text-secondary)',
                padding: '0.5rem 1rem',
              }}
            >
              Pending Cases
            </button>
            <button
              onClick={() => setTab('RESOLVED')}
              className="btn"
              style={{
                backgroundColor: tab === 'RESOLVED' ? 'var(--accent-gold-bg)' : 'transparent',
                color: tab === 'RESOLVED' ? 'var(--accent-gold)' : 'var(--text-secondary)',
                padding: '0.5rem 1rem',
              }}
            >
              Resolved Cases
            </button>
            <button
              onClick={() => setTab('ALL')}
              className="btn"
              style={{
                backgroundColor: tab === 'ALL' ? 'var(--accent-gold-bg)' : 'transparent',
                color: tab === 'ALL' ? 'var(--accent-gold)' : 'var(--text-secondary)',
                padding: '0.5rem 1rem',
              }}
            >
              All Cases
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem' }}>
            {/* Left side: cases list */}
            <div>
              {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4rem' }}>
                  <Loader2 size={32} className="animate-spin text-info" />
                </div>
              ) : filteredCases.length === 0 ? (
                <div className="card text-center" style={{ padding: '3rem' }}>
                  <CheckCircle size={48} style={{ margin: '0 auto 1rem', color: 'var(--status-excellent)' }} />
                  <h3>All clear! No guest recovery tickets pending.</h3>
                </div>
              ) : (
                filteredCases.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => setActiveCase(c)}
                    className="card flex-between"
                    style={{
                      borderLeft: `4px solid ${getSeverityColor(c.severity)}`,
                      cursor: 'pointer',
                      borderColor: activeCase?.id === c.id ? 'var(--accent-gold)' : '',
                      backgroundColor: activeCase?.id === c.id ? 'var(--bg-tertiary)' : '',
                    }}
                  >
                    <div>
                      <h4 style={{ fontWeight: 700 }}>{c.location.name}</h4>
                      <p className="text-secondary mt-1" style={{ fontSize: '0.85rem' }}>
                        Incident: &quot;{c.contentItem.text.substring(0, 100)}...&quot;
                      </p>
                      <div className="flex-align mt-2" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        <Calendar size={12} />
                        <span>Opened: {new Date(c.openedAt).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>Severity: {c.severity}</span>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      {getSlaStatus(c.dueAt, c.status)}
                      <span className="text-muted mt-1" style={{ fontSize: '0.7rem', display: 'block' }}>
                        Due: {new Date(c.dueAt).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Right side: inspect/action panel */}
            <div>
              {activeCase ? (
                <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                    <div className="flex-between">
                      <h3 style={{ fontWeight: 700 }}>Recovery Details</h3>
                      <span className="badge badge-watch" style={{ backgroundColor: getSeverityColor(activeCase.severity) + '22', color: getSeverityColor(activeCase.severity) }}>
                        {activeCase.severity}
                      </span>
                    </div>
                    <p className="text-secondary mt-1" style={{ fontSize: '0.8rem' }}>{activeCase.location.name}</p>
                  </div>

                  {/* Feedback Text */}
                  <div>
                    <h4 className="text-secondary" style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>
                      Guest Incident Feedback
                    </h4>
                    <p className="mt-1" style={{ padding: '0.75rem', backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '0.875rem' }}>
                      {activeCase.contentItem.text}
                    </p>
                  </div>

                  {/* SLA Timers */}
                  <div className="flex-between" style={{ backgroundColor: 'var(--bg-tertiary)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Opened: </span>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{new Date(activeCase.openedAt).toLocaleString()}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>SLA Deadline: </span>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{new Date(activeCase.dueAt).toLocaleString()}</div>
                    </div>
                  </div>

                  {/* Resolution Input Form */}
                  {activeCase.status !== 'RESOLVED' && activeCase.status !== 'CLOSED' ? (
                    <form onSubmit={handleResolveCase} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', backgroundColor: 'rgba(255, 255, 255, 0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <h4 style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--accent-gold)' }}>Resolve Guest Incident</h4>
                      
                      <div className="form-group">
                        <label className="form-label">Resolution Action</label>
                        <select
                          value={resolutionType}
                          onChange={(e) => setResolutionType(e.target.value)}
                          style={{ width: '100%', padding: '0.5rem', backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff' }}
                        >
                          <option value="APOLOGY">Direct Apology & Phone call</option>
                          <option value="REFUND">Refund / Order Cancel</option>
                          <option value="GIFT_CARD">Gift Card Issued ($25+)</option>
                          <option value="DISMISSED">Dismissed / No action needed</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Resolution Notes</label>
                        <textarea
                          required
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="What did you do to recover this guest? (e.g. called customer and offered a $50 gift card)"
                          style={{ width: '100%', padding: '0.5rem', backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff', minHeight: '80px', fontSize: '0.85rem', outline: 'none' }}
                        />
                      </div>

                      <button type="submit" disabled={submitting} className="btn btn-primary flex-align" style={{ width: '100%' }}>
                        {submitting ? <Loader2 size={16} className="animate-spin" /> : <span>Submit Resolution</span>}
                      </button>
                    </form>
                  ) : (
                    <div style={{ backgroundColor: 'var(--status-excellent-bg)', border: '1px solid var(--status-excellent)', padding: '1rem', borderRadius: '8px' }}>
                      <h4 className="text-positive" style={{ fontWeight: 700, fontSize: '0.9rem' }}>Ticket Resolved</h4>
                      <p className="mt-1" style={{ fontSize: '0.85rem' }}>
                        <strong>Action: </strong> {activeCase.resolutionType}
                      </p>
                      {activeCase.notes && (
                        <p className="text-secondary mt-1" style={{ fontSize: '0.8rem' }}>
                          <strong>Notes: </strong> {activeCase.notes}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Incident Case Timeline activities */}
                  <div>
                    <h4 className="text-secondary" style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                      Activity History Timeline
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {activeCase.activities.map((act) => (
                        <div key={act.id} style={{ fontSize: '0.8rem', borderLeft: '2px solid var(--border-color)', paddingLeft: '0.75rem' }}>
                          <div className="text-secondary" style={{ fontWeight: 500 }}>{act.description}</div>
                          <div className="text-muted" style={{ fontSize: '0.7rem', marginTop: '0.1rem' }}>
                            {new Date(act.createdAt).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="card text-center" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <p className="text-muted">Select an incident case to view SLA logs and submit recovery resolutions.</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function RecoveryCenterPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: 'var(--bg-primary)', color: '#fff' }}>
        <Loader2 className="animate-spin" />
        <span style={{ marginLeft: '0.5rem' }}>Loading recovery desk...</span>
      </div>
    }>
      <RecoveryCenterContent />
    </Suspense>
  );
}

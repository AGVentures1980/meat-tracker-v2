'use client';

import { useState, useEffect, Suspense } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { AlertTriangle, RefreshCw, CheckCircle, ShieldAlert, Filter } from 'lucide-react';

function AlertsContent() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'RESOLVED'>('ALL');

  useEffect(() => {
    fetchAlerts();
  }, [statusFilter]);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/alerts?status=${statusFilter}`);
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAlert = async (alertId: string, action: 'RESOLVE' | 'ACKNOWLEDGE') => {
    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId, action })
      });
      if (res.ok) {
        fetchAlerts();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-content">
        <Header />
        <main className="page-container">
          <div className="flex-between mb-4">
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <ShieldAlert size={28} style={{ color: '#ef4444' }} />
                <span>Alerts Center & Risk Dispatch</span>
              </h1>
              <p style={{ color: '#9ca3af', fontSize: '0.88rem', marginTop: '0.35rem' }}>
                Real-time operational risk signals, severe review alerts, and priority action items.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Filter size={16} style={{ color: '#c5a880' }} />
                <select
                  value={statusFilter}
                  onChange={(e: any) => setStatusFilter(e.target.value)}
                  style={{ padding: '0.45rem 0.75rem', backgroundColor: '#161922', border: '1px solid #242838', borderRadius: '6px', color: '#ffffff', fontSize: '0.82rem' }}
                >
                  <option value="ALL">All Alerts</option>
                  <option value="OPEN">Open Alerts</option>
                  <option value="RESOLVED">Resolved Alerts</option>
                </select>
              </div>

              <button
                onClick={fetchAlerts}
                disabled={loading}
                style={{ backgroundColor: '#161922', border: '1px solid #242838', color: '#ffffff', padding: '0.45rem 0.85rem', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                <span>Refresh Alerts</span>
              </button>
            </div>
          </div>

          {alerts.length === 0 ? (
            <div style={{ backgroundColor: '#161922', border: '1px solid #242838', borderRadius: '12px', padding: '3.5rem', textAlign: 'center', color: '#9ca3af' }}>
              <CheckCircle size={40} style={{ margin: '0 auto 1rem', color: '#10b981', opacity: 0.8 }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.5rem' }}>No Critical Alerts Active</h3>
              <p style={{ fontSize: '0.88rem', margin: 0 }}>No severe operational risk alerts or negative spikes detected for this scope.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {alerts.map((alt) => (
                <div key={alt.id} style={{ backgroundColor: '#161922', border: '1px solid #242838', borderRadius: '12px', padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                      <AlertTriangle size={18} style={{ color: alt.severity === 'CRITICAL' ? '#ef4444' : '#f59e0b' }} />
                      <strong style={{ fontSize: '1rem', color: '#ffffff' }}>{alt.title}</strong>
                      <span style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', padding: '0.15rem 0.45rem', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 700 }}>
                        {alt.severity}
                      </span>
                    </div>
                    <p style={{ color: '#9ca3af', fontSize: '0.85rem', margin: 0 }}>{alt.message}</p>
                  </div>

                  {alt.status === 'OPEN' && (
                    <button
                      onClick={() => handleUpdateAlert(alt.id, 'RESOLVE')}
                      style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.4)', padding: '0.45rem 0.85rem', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Mark Resolved
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function AlertsPage() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem', color: '#ffffff' }}>Loading Alerts Center...</div>}>
      <AlertsContent />
    </Suspense>
  );
}

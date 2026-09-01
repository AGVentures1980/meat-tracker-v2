'use client';

import { useEffect, useState, Suspense } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { Mail, Loader2 } from 'lucide-react';

interface Delivery {
  id: string;
  generatedAt: string;
  sentAt?: string;
  status: string;
  recipient: string;
  subject: string;
}

interface Subscription {
  id: string;
  reportType: string;
  frequency: string;
  deliveryTime: string;
  timezone: string;
  enabled: boolean;
  deliveries: Delivery[];
}

function ReportsContent() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/reports');
      if (res.ok) {
        const data = await res.json();
        setSubscriptions(data);
      }
    } catch (e) {
      console.error('Error fetching reports:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-content">
        <Header />
        <main className="page-container">
          <div className="mb-4">
            <h1 style={{ fontSize: '25px', fontWeight: 800 }}>Automated Executive Reports</h1>
            <p className="text-secondary">Configure report subscriptions and track daily pulse e-mail histories.</p>
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4rem' }}>
              <Loader2 size={32} className="animate-spin text-info" />
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem' }}>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {subscriptions.length === 0 ? (
                  <div className="card text-center" style={{ padding: '3rem' }}>
                    <Mail size={48} style={{ margin: '0 auto 1rem', color: 'var(--text-muted)' }} />
                    <h3>No report subscriptions configured.</h3>
                    <p className="text-muted mt-1">Daily Pulse emails can be scheduled in the Admin Panel.</p>
                  </div>
                ) : (
                  subscriptions.map((sub) => (
                    <div key={sub.id} className="card">
                      <div className="flex-between" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                        <div className="flex-align">
                          <Mail size={20} className="text-info" />
                          <h3 style={{ fontWeight: 700 }}>{sub.reportType.replace('_', ' ')}</h3>
                        </div>
                        <span className={`badge ${sub.enabled ? 'badge-excellent' : 'badge-critical'}`}>
                          {sub.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>

                      <div className="mt-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', backgroundColor: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
                        <div>
                          <span className="text-secondary" style={{ fontSize: '0.75rem' }}>Frequency</span>
                          <div style={{ fontWeight: 600, marginTop: '0.25rem' }}>{sub.frequency}</div>
                        </div>
                        <div>
                          <span className="text-secondary" style={{ fontSize: '0.75rem' }}>Delivery Time</span>
                          <div style={{ fontWeight: 600, marginTop: '0.25rem' }}>{sub.deliveryTime}</div>
                        </div>
                        <div>
                          <span className="text-secondary" style={{ fontSize: '0.75rem' }}>Timezone</span>
                          <div style={{ fontWeight: 600, marginTop: '0.25rem' }}>{sub.timezone}</div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem', color: '#ffffff' }}>Loading Reports...</div>}>
      <ReportsContent />
    </Suspense>
  );
}

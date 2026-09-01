'use client';

import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import {
  Settings,
  RefreshCw,
  Sliders,
  History,
  CheckCircle,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: string;
  user?: { firstName: string; lastName: string; email: string };
  newValue?: any;
}

interface Location {
  id: string;
  name: string;
}

export default function AdminPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Weights Config Form
  const [reputation, setReputation] = useState(35);
  const [sentiment, setSentiment] = useState(25);
  const [competitive, setCompetitive] = useState(15);
  const [momentum, setMomentum] = useState(10);
  const [response, setResponse] = useState(10);
  const [recovery, setRecovery] = useState(5);
  
  const [weightsStatus, setWeightsStatus] = useState<{ success?: boolean; msg?: string } | null>(null);
  const [weightsLoading, setWeightsLoading] = useState(false);

  // Reprocessing Form
  const [reprocessLoc, setReprocessLoc] = useState('ALL');
  const [reprocessStatus, setReprocessStatus] = useState<{ success?: boolean; msg?: string } | null>(null);
  const [reprocessLoading, setReprocessLoading] = useState(false);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      // Fetch locations
      const locRes = await fetch('/api/locations');
      if (locRes.ok) {
        const data = await locRes.json();
        setLocations(data);
      }

      // Fetch audit logs
      const logRes = await fetch('/api/admin/audit-logs');
      if (logRes.ok) {
        const data = await logRes.json();
        setAuditLogs(data);
      }

      // Fetch weights configuration
      const wRes = await fetch('/api/admin/weights');
      if (wRes.ok) {
        const config = await wRes.json();
        setReputation(Math.round(config.reputationWeight * 100));
        setSentiment(Math.round(config.sentimentWeight * 100));
        setCompetitive(Math.round(config.competitiveWeight * 100));
        setMomentum(Math.round(config.momentumWeight * 100));
        setResponse(Math.round(config.responseWeight * 100));
        setRecovery(Math.round(config.recoveryWeight * 100));
      }
    } catch (e) {
      console.error('Error fetching admin data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleUpdateWeights = async (e: React.FormEvent) => {
    e.preventDefault();
    setWeightsStatus(null);

    const sum = reputation + sentiment + competitive + momentum + response + recovery;
    if (sum !== 100) {
      setWeightsStatus({
        success: false,
        msg: `Error: Weights must sum to exactly 100%. Current sum: ${sum}%`,
      });
      return;
    }

    setWeightsLoading(true);
    try {
      const user = JSON.parse(localStorage.getItem('brasa_user') || '{}');
      const res = await fetch('/api/admin/weights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: user.organizationId,
          reputationWeight: reputation / 100,
          sentimentWeight: sentiment / 100,
          competitiveWeight: competitive / 100,
          momentumWeight: momentum / 100,
          responseWeight: response / 100,
          recoveryWeight: recovery / 100,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setWeightsStatus({ success: true, msg: 'Scoring weights updated successfully. Recalculation enqueued.' });
        fetchAdminData(); // Refresh logs
      } else {
        throw new Error(data.error || 'Failed to update weights.');
      }
    } catch (err: any) {
      setWeightsStatus({ success: false, msg: err?.message || 'Error updating weights.' });
    } finally {
      setWeightsLoading(false);
    }
  };

  const handleTriggerReprocess = async (e: React.FormEvent) => {
    e.preventDefault();
    setReprocessStatus(null);
    setReprocessLoading(true);

    try {
      const res = await fetch('/api/admin/reprocess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationId: reprocessLoc,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setReprocessStatus({ success: true, msg: data.message || 'Reprocessing enqueued successfully.' });
        fetchAdminData(); // Refresh logs
      } else {
        throw new Error(data.error || 'Reprocessing failed.');
      }
    } catch (err: any) {
      setReprocessStatus({ success: false, msg: err?.message || 'Error starting reprocessing.' });
    } finally {
      setReprocessLoading(false);
    }
  };

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-content">
        <Header />
        <main className="page-container">
          <div className="mb-4">
            <h1 style={{ fontSize: '25px', fontWeight: 800 }}>System Administration</h1>
            <p className="text-secondary">Manage scoring weights configurations, reprocessing, and system audits.</p>
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4rem' }}>
              <Loader2 size={32} className="animate-spin text-info" />
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              {/* Left Column: Scoring Weights & Reprocess */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                
                {/* Scoring Weights */}
                <div className="card">
                  <h3 className="card-title flex-align">
                    <Sliders size={18} className="text-info" />
                    <span>Scoring Component Weights</span>
                  </h3>
                  
                  <form onSubmit={handleUpdateWeights} className="mt-4" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {weightsStatus && (
                      <div className={weightsStatus.success ? 'text-positive' : 'text-negative'} style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                        {weightsStatus.msg}
                      </div>
                    )}
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div className="form-group">
                        <label className="form-label">Reputation (Stars) %</label>
                        <input type="number" value={reputation} onChange={(e) => setReputation(parseInt(e.target.value) || 0)} className="form-input" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Sentiment (Text) %</label>
                        <input type="number" value={sentiment} onChange={(e) => setSentiment(parseInt(e.target.value) || 0)} className="form-input" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Competitive %</label>
                        <input type="number" value={competitive} onChange={(e) => setCompetitive(parseInt(e.target.value) || 0)} className="form-input" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Momentum %</label>
                        <input type="number" value={momentum} onChange={(e) => setMomentum(parseInt(e.target.value) || 0)} className="form-input" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Response SLA %</label>
                        <input type="number" value={response} onChange={(e) => setResponse(parseInt(e.target.value) || 0)} className="form-input" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Recovery SLA %</label>
                        <input type="number" value={recovery} onChange={(e) => setRecovery(parseInt(e.target.value) || 0)} className="form-input" />
                      </div>
                    </div>

                    <div className="flex-between mt-2" style={{ backgroundColor: 'var(--bg-tertiary)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <span>Total Weights Sum:</span>
                      <strong className={reputation + sentiment + competitive + momentum + response + recovery === 100 ? 'text-positive' : 'text-negative'}>
                        {reputation + sentiment + competitive + momentum + response + recovery}%
                      </strong>
                    </div>

                    <button type="submit" disabled={weightsLoading} className="btn btn-primary mt-2" style={{ alignSelf: 'flex-start' }}>
                      {weightsLoading ? <Loader2 size={16} className="animate-spin" /> : 'Save Configurations'}
                    </button>
                  </form>
                </div>

                {/* Ingestion & AI Reprocessing */}
                <div className="card">
                  <h3 className="card-title flex-align">
                    <RefreshCw size={18} className="text-warning" />
                    <span>Ingestion & AI Reprocessing</span>
                  </h3>
                  
                  <form onSubmit={handleTriggerReprocess} className="mt-4" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {reprocessStatus && (
                      <div className={reprocessStatus.success ? 'text-positive' : 'text-negative'} style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                        {reprocessStatus.msg}
                      </div>
                    )}

                    <div className="form-group">
                      <label className="form-label">Reprocess Location Scope</label>
                      <select
                        value={reprocessLoc}
                        onChange={(e) => setReprocessLoc(e.target.value)}
                        style={{ width: '100%', padding: '0.65rem', backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff' }}
                      >
                        <option value="ALL">All Scoped Units</option>
                        {locations.map((loc) => (
                          <option key={loc.id} value={loc.id}>
                            {loc.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button type="submit" disabled={reprocessLoading} className="btn btn-secondary flex-align" style={{ alignSelf: 'flex-start' }}>
                      {reprocessLoading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                      <span>Reprocess Period History</span>
                    </button>
                  </form>
                </div>

              </div>

              {/* Right Column: Audit Logs */}
              <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                <h3 className="card-title flex-align" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                  <History size={18} className="text-info" />
                  <span>Administrative Audit History Logs</span>
                </h3>

                <div style={{ flex: 1, overflowY: 'auto', marginTop: '1rem' }}>
                  {auditLogs.length === 0 ? (
                    <p className="text-muted">No administrative logs recorded yet.</p>
                  ) : (
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Action</th>
                          <th>Executor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {auditLogs.map((log) => (
                          <tr key={log.id} style={{ fontSize: '0.8rem' }}>
                            <td>{new Date(log.createdAt).toLocaleDateString()}</td>
                            <td>
                              <span style={{ fontWeight: 600, color: 'var(--accent-gold)' }}>{log.action}</span>
                              <div className="text-muted" style={{ fontSize: '0.7rem' }}>Entity: {log.entityType} ({log.entityId.substring(0, 8)}...)</div>
                            </td>
                            <td>{log.user ? `${log.user.firstName} (${log.user.email})` : 'System'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

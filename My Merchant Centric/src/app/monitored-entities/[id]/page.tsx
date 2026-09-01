'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import {
  Globe,
  ArrowLeft,
  RefreshCw,
  Clock,
  Shield,
  Building,
  Star,
  MessageSquare,
  History as HistoryIcon,
  Bell,
  Sparkles,
  Database,
  CheckCircle,
  AlertTriangle,
  Loader2
} from 'lucide-react';

export default function MonitoredEntityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const entityId = params.id as string;

  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'reputation' | 'sources' | 'history' | 'competitors' | 'alerts'>('overview');
  const [checking, setChecking] = useState(false);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [selectedCandidateWhy, setSelectedCandidateWhy] = useState<any | null>(null);

  useEffect(() => {
    if (entityId) {
      fetchDetail();
      fetchCompetitorCandidates();
    }
  }, [entityId]);

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/monitored-entities/${entityId}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        console.error('Failed to load entity detail');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompetitorCandidates = async () => {
    try {
      const res = await fetch(`/api/integrations/scout/competitors?entityId=${entityId}`);
      if (res.ok) {
        const json = await res.json();
        setCandidates(json.candidates || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleApproveCompetitor = async (candId: string, role: string) => {
    try {
      const res = await fetch('/api/integrations/scout/competitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'APPROVE',
          competitorLocationId: candId,
          locationId: entityId,
          competitiveRole: role,
          approvalReason: `Approved as ${role} competitor by authorized corporate user`
        })
      });
      if (res.ok) {
        await fetchCompetitorCandidates();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRejectCompetitor = async (candId: string) => {
    try {
      const res = await fetch('/api/integrations/scout/competitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'REJECT',
          competitorLocationId: candId,
          locationId: entityId
        })
      });
      if (res.ok) {
        await fetchCompetitorCandidates();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCheckNow = async () => {
    if (!data?.entity?.externalSourceId) return;
    setChecking(true);
    try {
      const userStr = localStorage.getItem('brasa_user');
      const orgId = userStr ? JSON.parse(userStr).organizationId : '576fda30-b69b-4e25-bd57-7afa2c48735a';

      const res = await fetch('/api/integrations/scout/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: orgId,
          sourceId: data.entity.externalSourceId
        })
      });
      if (res.ok) {
        await fetchDetail();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setChecking(false);
    }
  };

  if (loading) {
    return (
      <div className="app-shell">
        <Sidebar />
        <div className="main-content">
          <Header />
          <main className="page-container">
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <Loader2 className="animate-spin" size={24} style={{ margin: '0 auto 0.5rem auto' }} />
              <span>Loading entity profile...</span>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!data || !data.entity) {
    return (
      <div className="app-shell">
        <Sidebar />
        <div className="main-content">
          <Header />
          <main className="page-container">
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <h2>Entity Not Found</h2>
              <Link href="/monitored-entities" className="btn btn-primary mt-2">
                Return to Monitored Entities
              </Link>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const { entity, snapshots, events } = data;

  return (
    <div className="app-shell">
      <Sidebar />

      <div className="main-content">
        <Header />

        <main className="page-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Back button & Title */}
          <div>
            <Link href="/monitored-entities" className="flex-align text-secondary" style={{ gap: '0.35rem', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
              <ArrowLeft size={14} />
              <span>Back to Monitored Entities</span>
            </Link>

            <div className="flex-between">
              <div>
                <div className="flex-align" style={{ gap: '0.75rem' }}>
                  <h1 className="page-title">{entity.brandName} — {entity.locationName}</h1>
                  <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>
                    {entity.entityType.replace('_', ' ')}
                  </span>
                  <span className={`badge ${entity.monitoringStatus === 'ACTIVE' ? 'badge-healthy' : 'badge-warning'}`} style={{ fontSize: '0.7rem' }}>
                    {entity.monitoringStatus}
                  </span>
                </div>
                <p className="page-subtitle" style={{ marginTop: '0.25rem' }}>
                  {entity.address}, {entity.city}, {entity.state}
                </p>
              </div>

              {entity.externalSourceId && (
                <button onClick={handleCheckNow} disabled={checking} className="btn btn-primary flex-align" style={{ gap: '0.5rem' }}>
                  <RefreshCw size={14} className={checking ? 'animate-spin' : ''} />
                  <span>Check Now</span>
                </button>
              )}
            </div>
          </div>

          {/* Navigation Tabs */}
          <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
            {[
              { id: 'overview', label: 'Overview', icon: Building },
              { id: 'reputation', label: 'Reputation', icon: Star },
              { id: 'sources', label: 'Data Sources', icon: Database },
              { id: 'history', label: 'History', icon: HistoryIcon },
              { id: 'competitors', label: 'Competitors', icon: Sparkles },
              { id: 'alerts', label: 'Alerts', icon: Bell },
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`btn ${isActive ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <Icon size={14} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '1rem' }}>
              {/* Key Metrics Cards */}
              <div className="card" style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <span className="form-label" style={{ fontSize: '0.75rem' }}>Live Rating</span>
                <div className="flex-align" style={{ gap: '0.5rem' }}>
                  <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-gold)' }}>
                    {entity.googleRating !== null && entity.googleRating !== undefined ? entity.googleRating.toFixed(1) : '—'}
                  </span>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    <div>Official Google Rating</div>
                    <div>{entity.reviewCount !== null ? `${entity.reviewCount.toLocaleString()} total reviews` : 'No reviews recorded'}</div>
                  </div>
                </div>
              </div>

              <div className="card" style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <span className="form-label" style={{ fontSize: '0.75rem' }}>Monitoring Schedule</span>
                <div style={{ fontSize: '0.85rem' }}>
                  <div><strong>Last Checked:</strong> {entity.lastCheckedAt ? new Date(entity.lastCheckedAt).toLocaleString() : 'Never'}</div>
                  <div style={{ marginTop: '0.25rem' }}><strong>Next Check:</strong> {entity.nextCheckAt ? new Date(entity.nextCheckAt).toLocaleString() : 'Calculated'}</div>
                </div>
              </div>

              <div className="card" style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <span className="form-label" style={{ fontSize: '0.75rem' }}>Data Coverage & Provenance</span>
                <div>
                  <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>
                    {entity.coverageType}
                  </span>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                    Active Adapter: <strong>{entity.dataSources[0]?.adapterUsed || 'GOOGLE_PLACES'}</strong>
                  </div>
                </div>
              </div>

              {/* Entity Overview Specifications */}
              <div className="card" style={{ gridColumn: 'span 12', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h3 className="card-title">Entity Specifications</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', fontSize: '0.85rem' }}>
                  <div>
                    <span className="form-label" style={{ fontSize: '0.7rem' }}>Brand Name</span>
                    <div>{entity.brandName}</div>
                  </div>
                  <div>
                    <span className="form-label" style={{ fontSize: '0.7rem' }}>Location Name</span>
                    <div>{entity.locationName}</div>
                  </div>
                  <div>
                    <span className="form-label" style={{ fontSize: '0.7rem' }}>Full Address</span>
                    <div>{entity.address}, {entity.city}, {entity.state}</div>
                  </div>
                  <div>
                    <span className="form-label" style={{ fontSize: '0.7rem' }}>Entity Type</span>
                    <div>{entity.entityType}</div>
                  </div>
                  <div>
                    <span className="form-label" style={{ fontSize: '0.7rem' }}>Google Place ID</span>
                    <div style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{entity.placeId || 'Not linked'}</div>
                  </div>
                  <div>
                    <span className="form-label" style={{ fontSize: '0.7rem' }}>Monitoring Status</span>
                    <div>{entity.monitoringStatus}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'reputation' && (
            <div className="card">
              <h3 className="card-title">Reputation & Review Velocity Summary</h3>
              <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                Coverage mode: <strong>{entity.coverageType}</strong>. Public metadata snapshot rating: <strong>{entity.googleRating ?? '—'}</strong> ({entity.reviewCount ?? 0} reviews).
              </div>
            </div>
          )}

          {activeTab === 'sources' && (
            <div className="card">
              <h3 className="card-title">Attached Data Sources</h3>
              <table className="table" style={{ width: '100%', marginTop: '1rem' }}>
                <thead>
                  <tr>
                    <th>Provider</th>
                    <th>Adapter</th>
                    <th>Status</th>
                    <th>Confidence</th>
                    <th>Last Checked</th>
                  </tr>
                </thead>
                <tbody>
                  {entity.dataSources.map((ds: any) => (
                    <tr key={ds.id}>
                      <td><strong>{ds.provider}</strong></td>
                      <td>{ds.adapterUsed || 'GOOGLE_PLACES'}</td>
                      <td><span className="badge badge-healthy">{ds.status}</span></td>
                      <td>{ds.confidence}</td>
                      <td>{ds.lastCheckedAt ? new Date(ds.lastCheckedAt).toLocaleString() : 'Never'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="card">
              <h3 className="card-title">Source Snapshots History</h3>
              <table className="table" style={{ width: '100%', marginTop: '1rem' }}>
                <thead>
                  <tr>
                    <th>Captured At</th>
                    <th>Rating</th>
                    <th>Review Count</th>
                    <th>Status</th>
                    <th>Adapter</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshots.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-secondary)' }}>
                        No snapshot history captured yet.
                      </td>
                    </tr>
                  ) : (
                    snapshots.map((s: any) => (
                      <tr key={s.id}>
                        <td>{new Date(s.capturedAt).toLocaleString()}</td>
                        <td>{s.rating ?? '—'}</td>
                        <td>{s.reviewCount?.toLocaleString() ?? '—'}</td>
                        <td>{s.businessStatus}</td>
                        <td>{s.adapter}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'competitors' && (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="flex-between">
                <div>
                  <h3 className="card-title flex-align" style={{ gap: '0.5rem' }}>
                    <Sparkles className="text-warning" size={18} />
                    <span>Competitive Relevance Engine & Candidate Recommendations</span>
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                    AI-evaluated candidate competitors scored across 7 relevance dimensions. Final competitive set inclusion requires manual approval.
                  </p>
                </div>
                <button onClick={fetchCompetitorCandidates} className="btn btn-secondary" style={{ fontSize: '0.75rem' }}>
                  Refresh Candidates
                </button>
              </div>

              {candidates.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No competitor candidates evaluated for this location.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="table" style={{ width: '100%', fontSize: '0.78rem' }}>
                    <thead>
                      <tr>
                        <th>Candidate Restaurant</th>
                        <th>Distance</th>
                        <th>Google Rating</th>
                        <th>Reviews</th>
                        <th>Relevance Score</th>
                        <th>Classification</th>
                        <th>Confidence</th>
                        <th>Status</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {candidates.map((cand) => {
                        const rel = cand.relevance;
                        const isApproved = cand.status === 'APPROVED';
                        const isRejected = cand.status === 'REJECTED';

                        const scoreBadgeClass = rel.relevanceScore >= 80 ? 'badge-healthy' : rel.relevanceScore >= 60 ? 'badge-primary' : 'badge-warning';
                        const confBadgeClass = rel.confidence === 'HIGH' ? 'badge-healthy' : rel.confidence === 'MEDIUM' ? 'badge-warning' : 'badge-critical';

                        return (
                          <tr key={cand.id} style={{ opacity: isRejected ? 0.5 : 1 }}>
                            <td>
                              <strong>{cand.name}</strong>
                              <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>{cand.address}</div>
                            </td>
                            <td>{rel.distanceMiles} mi</td>
                            <td>
                              <span style={{ fontWeight: 700, color: 'var(--accent-gold)' }}>
                                {cand.googleRating !== null ? `★ ${cand.googleRating}` : '—'}
                              </span>
                            </td>
                            <td>{cand.reviewCount !== null ? cand.reviewCount.toLocaleString() : '—'}</td>
                            <td>
                              <span className={`badge ${scoreBadgeClass}`} style={{ fontSize: '0.7rem', fontWeight: 800 }}>
                                {rel.relevanceScore} / 100
                              </span>
                            </td>
                            <td>
                              <span className="badge badge-secondary" style={{ fontSize: '0.62rem' }}>
                                {rel.relevanceClassification.replace(/_/g, ' ')}
                              </span>
                            </td>
                            <td>
                              <span className={`badge ${confBadgeClass}`} style={{ fontSize: '0.62rem' }}>
                                {rel.confidence}
                              </span>
                            </td>
                            <td>
                              <span className={`badge ${isApproved ? 'badge-healthy' : isRejected ? 'badge-critical' : 'badge-warning'}`} style={{ fontSize: '0.65rem' }}>
                                {isApproved ? `APPROVED (${cand.competitiveRole})` : isRejected ? 'REJECTED' : 'CANDIDATE'}
                              </span>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <div className="flex-align" style={{ justifyContent: 'flex-end', gap: '0.35rem' }}>
                                <button
                                  onClick={() => setSelectedCandidateWhy(cand)}
                                  className="btn btn-secondary"
                                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.68rem', color: 'var(--accent-gold)' }}
                                  title="View evidence and explainability rationale"
                                >
                                  Why?
                                </button>
                                {!isApproved && (
                                  <>
                                    <button
                                      onClick={() => handleApproveCompetitor(cand.id, 'DIRECT')}
                                      className="btn btn-primary"
                                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.65rem', backgroundColor: 'var(--text-positive)', borderColor: 'var(--text-positive)' }}
                                    >
                                      Approve Direct
                                    </button>
                                    <button
                                      onClick={() => handleApproveCompetitor(cand.id, 'SECONDARY')}
                                      className="btn btn-secondary"
                                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.65rem' }}
                                    >
                                      Secondary
                                    </button>
                                  </>
                                )}
                                {!isRejected && (
                                  <button
                                    onClick={() => handleRejectCompetitor(cand.id)}
                                    className="btn btn-secondary"
                                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.65rem', color: 'var(--accent-red)' }}
                                  >
                                    Reject
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'alerts' && (
            <div className="card">
              <h3 className="card-title">Reputation Change Events Log</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
                {events.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-secondary)' }}>
                    No reputation events recorded.
                  </div>
                ) : (
                  events.map((evt: any) => (
                    <div key={evt.id} style={{ padding: '0.75rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '6px' }}>
                      <div className="flex-between">
                        <strong>{evt.eventType}</strong>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{new Date(evt.detectedAt).toLocaleString()}</span>
                      </div>
                      <div style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>{evt.metadata?.message || 'Reputation snapshot update detected.'}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Why? Explainability Modal */}
      {selectedCandidateWhy && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '650px', display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.5rem' }}>
            <div className="flex-between">
              <h3 className="card-title flex-align" style={{ gap: '0.5rem' }}>
                <Sparkles className="text-warning" size={18} />
                <span>Why is this a Competitor? — Explainability Breakdown</span>
              </h3>
              <button onClick={() => setSelectedCandidateWhy(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                ✕
              </button>
            </div>

            <div style={{ fontSize: '0.85rem' }}>
              Candidate: <strong>{selectedCandidateWhy.name}</strong> ({selectedCandidateWhy.address})
            </div>

            <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.82rem', lineHeight: '1.5' }}>
              <strong>Explainability Summary:</strong>
              <p style={{ marginTop: '0.35rem', color: 'var(--text-primary)' }}>
                {selectedCandidateWhy.relevance.explanation}
              </p>
            </div>

            {/* Dimensional Score Breakdown */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.78rem' }}>
              <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '0.6rem', borderRadius: '6px' }}>
                <div>Service Model Fit (25%): <strong>{selectedCandidateWhy.relevance.serviceModelFitScore}%</strong></div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Model: {selectedCandidateWhy.relevance.evidence.serviceModel}</div>
              </div>
              <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '0.6rem', borderRadius: '6px' }}>
                <div>Cuisine / Product Fit (20%): <strong>{selectedCandidateWhy.relevance.cuisineFitScore}%</strong></div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Category: {selectedCandidateWhy.relevance.evidence.cuisineCategory}</div>
              </div>
              <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '0.6rem', borderRadius: '6px' }}>
                <div>Price Tier Fit (15%): <strong>{selectedCandidateWhy.relevance.priceTierFitScore}%</strong></div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Spend: {selectedCandidateWhy.relevance.evidence.priceTier}</div>
              </div>
              <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '0.6rem', borderRadius: '6px' }}>
                <div>Occasion Fit (15%): <strong>{selectedCandidateWhy.relevance.occasionFitScore}%</strong></div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Occasions: {selectedCandidateWhy.relevance.evidence.occasions.join(', ')}</div>
              </div>
              <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '0.6rem', borderRadius: '6px' }}>
                <div>Geographic Proximity (15%): <strong>{selectedCandidateWhy.relevance.proximityScore}%</strong></div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Distance: {selectedCandidateWhy.relevance.distanceMiles} miles</div>
              </div>
              <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '0.6rem', borderRadius: '6px' }}>
                <div>Confidence Level: <strong>{selectedCandidateWhy.relevance.confidence}</strong></div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Provenance: {selectedCandidateWhy.relevance.evidence.provenanceSource}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

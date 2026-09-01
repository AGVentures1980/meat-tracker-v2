import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { getServerSession, enforceScopeAccess } from '@/lib/auth';
import { buildLiveDataScope } from '@/lib/provenance';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import Link from 'next/link';
import {
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  AlertTriangle,
  Award,
  ThumbsUp,
  Percent,
  Activity,
} from 'lucide-react';
import { ScopeType, AlertStatus, SentimentValue } from '@prisma/client';
import CompetitiveTrendChart from '@/components/CompetitiveTrendChart';


interface DashboardPageProps {
  searchParams: {
    locationId?: string;
    tab?: string;
    why?: string;
  };
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const cookieStore = cookies();
  const session = await getServerSession(cookieStore);

  if (!session) {
    redirect('/login');
  }

  const organizationId = session.organizationId;
  const locationId = searchParams.locationId;

  // Enforce Scope check if locationId is specified
  if (locationId) {
    try {
      await enforceScopeAccess(session, { locationId });
    } catch (err) {
      redirect('/dashboard');
    }
  }

  // 1. Fetch Tenant Locations (LIVE + IMPORTED only)
  const liveScope = buildLiveDataScope();
  const allLocations = await db.location.findMany({
    where: {
      organizationId,
      status: 'ACTIVE',
      ...liveScope,
    },
    select: {
      id: true,
      name: true,
      city: true,
      state: true,
    },
  });

  // Filter locations based on scope permissions
  const scopedLocations = [];
  for (const loc of allLocations) {
    const isGlobal = session.scopes.some(s => s.scopeType === ScopeType.GLOBAL || s.scopeId === '*');
    const isMatchedScope = session.scopes.some(s => s.scopeId === loc.id);
    if (isGlobal || isMatchedScope) {
      scopedLocations.push(loc);
    }
  }

  const scopedLocationIds = scopedLocations.map(l => l.id);

  // 2. Fetch Latest Score Snapshots (LIVE + IMPORTED only)
  const targetLocationIds = locationId ? [locationId] : scopedLocationIds;

  const scoreTypes = [
    'BRAND_PULSE',
    'REPUTATION',
    'SENTIMENT',
    'COMPETITIVE',
    'MOMENTUM',
    'RESPONSE',
    'RECOVERY',
  ];

  const scores: Record<string, { score: number | null; delta: number | null }> = {};
  for (const type of scoreTypes) {
    if (targetLocationIds.length > 0) {
      const latestSnapshots = await db.scoreSnapshot.findMany({
        where: {
          organizationId,
          locationId: { in: targetLocationIds },
          scoreType: type,
          provenanceMode: { in: ['LIVE', 'IMPORTED'] },
          location: { provenanceMode: { in: ['LIVE', 'IMPORTED'] } }
        },
        orderBy: { calculatedAt: 'desc' },
        take: targetLocationIds.length,
      });

      if (latestSnapshots.length > 0) {
        const validSnaps = latestSnapshots.filter(s => s.score !== null);
        if (validSnaps.length > 0) {
          const avgScore = validSnaps.reduce((sum, s) => sum + (s.score as number), 0) / validSnaps.length;
          const avgDelta = validSnaps.reduce((sum, s) => sum + (s.delta || 0), 0) / validSnaps.length;
          scores[type] = {
            score: Math.round(avgScore * 10) / 10,
            delta: Math.round(avgDelta * 10) / 10,
          };
        } else {
          scores[type] = { score: null, delta: null };
        }
      } else {
        scores[type] = { score: null, delta: null };
      }
    } else {
      scores[type] = { score: null, delta: null };
    }
  }

  // 2b. Compute competitive set context for target locations (APPROVED members ONLY)
  let hasCompetitiveData = false;
  let competitiveRankText = 'Competitive set pending';
  let totalApprovedCompetitors = 0;

  if (targetLocationIds.length > 0) {
    const compSets = await db.competitiveSet.findMany({
      where: {
        organizationId,
        locationId: { in: targetLocationIds },
        status: 'ACTIVE',
      },
      include: {
        members: {
          where: { status: 'APPROVED' },
          include: { competitor: true },
        },
      },
    });

    const allApprovedMembers = compSets.flatMap(cs => cs.members);
    const approvedPrimary = allApprovedMembers.filter(m => m.competitiveRole === 'DIRECT' || (!m.competitiveRole && m.tier === 'DIRECT'));
    const approvedBroader = allApprovedMembers.filter(m => m.competitiveRole === 'SECONDARY' || (!m.competitiveRole && m.tier === 'ADJACENT'));
    
    totalApprovedCompetitors = approvedPrimary.length + approvedBroader.length;
    if (totalApprovedCompetitors > 0) {
      hasCompetitiveData = true;
      competitiveRankText = `${totalApprovedCompetitors} Approved Competitors (${approvedPrimary.length} Primary, ${approvedBroader.length} Broader)`;
    }
  }


  // 3. Location Rankings List (LIVE locations only)
  const locationRankings = [];
  for (const loc of scopedLocations) {
    const pulseSnap = await db.scoreSnapshot.findFirst({
      where: {
        organizationId,
        locationId: loc.id,
        scoreType: 'BRAND_PULSE',
        provenanceMode: { in: ['LIVE', 'IMPORTED'] },
        location: { provenanceMode: { in: ['LIVE', 'IMPORTED'] } }
      },
      orderBy: { calculatedAt: 'desc' },
    });

    const reputationSnap = await db.scoreSnapshot.findFirst({
      where: {
        organizationId,
        locationId: loc.id,
        scoreType: 'REPUTATION',
        provenanceMode: { in: ['LIVE', 'IMPORTED'] },
        location: { provenanceMode: { in: ['LIVE', 'IMPORTED'] } }
      },
      orderBy: { calculatedAt: 'desc' },
    });

    const scoreVal = pulseSnap?.score ?? null;

    locationRankings.push({
      id: loc.id,
      name: loc.name,
      city: loc.city,
      brandPulse: scoreVal,
      delta: pulseSnap?.delta ?? null,
      reputation: reputationSnap?.score ?? null,
      status: scoreVal ? (scoreVal >= 90 ? 'EXCELLENT' : scoreVal >= 80 ? 'HEALTHY' : scoreVal >= 70 ? 'WATCH' : 'CRITICAL') : 'BUILDING_BASELINE',
    });
  }

  const activeTab = searchParams.tab || 'overall';
  if (activeTab === 'improved') {
    locationRankings.sort((a, b) => (b.delta || 0) - (a.delta || 0));
  } else if (activeTab === 'decline') {
    locationRankings.sort((a, b) => (a.delta || 0) - (b.delta || 0));
  } else {
    locationRankings.sort((a, b) => (b.brandPulse || 0) - (a.brandPulse || 0));
  }

  // 4. Fetch What You Need to Know Today (LIVE Unresolved Alerts & Recovery Cases)
  const activeAlerts = targetLocationIds.length > 0 ? await db.alert.findMany({
    where: {
      organizationId,
      locationId: { in: targetLocationIds },
      status: AlertStatus.OPEN,
      provenanceMode: { in: ['LIVE', 'IMPORTED'] },
      location: { provenanceMode: { in: ['LIVE', 'IMPORTED'] } }
    },
    orderBy: { detectedAt: 'desc' },
    take: 5,
  }) : [];

  const openRecoveryCases = targetLocationIds.length > 0 ? await db.recoveryCase.findMany({
    where: {
      organizationId,
      locationId: { in: targetLocationIds },
      status: { in: ['OPEN', 'ASSIGNED', 'ESCALATED'] },
      provenanceMode: { in: ['LIVE', 'IMPORTED'] },
      location: { provenanceMode: { in: ['LIVE', 'IMPORTED'] } }
    },
    include: {
      location: true,
      contentItem: true,
    },
    orderBy: { openedAt: 'desc' },
    take: 5,
  }) : [];

  const totalOpenAlerts = activeAlerts.length;
  const totalOpenRecovery = openRecoveryCases.length;

  const alertLocNames = activeAlerts.map(a => a.title).filter(Boolean).slice(0, 2).join(' · ');
  const recoveryLocNames = openRecoveryCases.map(r => r.location?.name).filter(Boolean).slice(0, 2).join(' · ');

  // 5. Why Modal Data Calculation
  const whyScore = searchParams.why;
  let whyData: any = null;

  if (whyScore) {
    if (whyScore === 'brand-pulse') {
      const activeConfig = await db.scoringConfiguration.findFirst({
        where: { organizationId },
        orderBy: { effectiveFrom: 'desc' },
      });
      whyData = activeConfig || {
        reputationWeight: 0.35,
        sentimentWeight: 0.25,
        competitiveWeight: 0.15,
        momentumWeight: 0.10,
        responseWeight: 0.10,
        recoveryWeight: 0.05,
      };
    } else if (whyScore === 'reputation') {
      const reputationReviews = targetLocationIds.length > 0 ? await db.contentItem.findMany({
        where: {
          organizationId,
          locationId: { in: targetLocationIds },
          contentType: 'REVIEW',
          rating: { not: null },
          status: 'ACTIVE',
          location: { provenanceMode: { in: ['LIVE', 'IMPORTED'] } }
        },
        select: { rating: true, publishedAt: true },
      }) : [];
      
      const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
      reputationReviews.forEach(r => {
        const rVal = Math.round(r.rating || 5);
        if (rVal >= 1 && rVal <= 5) distribution[rVal as 1|2|3|4|5]++;
      });
      whyData = { totalReviews: reputationReviews.length, distribution };
    }
  }

  const renderDelta = (delta: number | null) => {
    if (delta === null) return <span className="text-muted">Insufficient history</span>;
    if (delta > 0) return <span className="text-positive flex-align"><TrendingUp size={14} /> +{delta}</span>;
    if (delta < 0) return <span className="text-negative flex-align"><TrendingDown size={14} /> {delta}</span>;
    return <span className="text-muted">Baseline constant</span>;
  };

  const getBadgeClass = (status: string) => {
    if (status === 'EXCELLENT') return 'badge badge-excellent';
    if (status === 'HEALTHY') return 'badge badge-healthy';
    if (status === 'WATCH') return 'badge badge-watch';
    if (status === 'CRITICAL') return 'badge badge-critical';
    return 'badge badge-warning';
  };

  const getWhyHref = (scoreType: string) => {
    const params = { ...searchParams, why: scoreType };
    return `/dashboard?${new URLSearchParams(params as any).toString()}`;
  };

  const getCloseHref = () => {
    const params = { ...searchParams };
    delete params.why;
    const str = new URLSearchParams(params as any).toString();
    return `/dashboard${str ? '?' + str : ''}`;
  };

  const selectedLocObj = locationId ? scopedLocations.find(l => l.id === locationId) : scopedLocations[0];

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-content">
        <Header />
        <main className="page-container">
          
          {/* Hero Row: Brand Pulse Central KPI */}
          <section className="grid-bp">
            <div className="card flex-between" style={{ padding: '2rem' }}>
              <div>
                <div className="flex-align" style={{ gap: '0.75rem' }}>
                  <span className="text-secondary" style={{ fontSize: '0.9rem', fontWeight: 600, textTransform: 'uppercase' }}>
                    BRASA Brand Pulse™ Score
                  </span>
                  <Link href={getWhyHref('brand-pulse')} style={{ fontSize: '0.8rem', color: 'var(--accent-gold)', textDecoration: 'underline' }}>
                    Why?
                  </Link>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem', marginTop: '0.5rem' }}>
                  <h1 style={{ fontSize: scores.BRAND_PULSE.score !== null ? '3.5rem' : '2.2rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
                    {scores.BRAND_PULSE.score !== null ? scores.BRAND_PULSE.score : 'Insufficient data'}
                  </h1>
                  <div>
                    {renderDelta(scores.BRAND_PULSE.delta)}
                  </div>
                </div>
                <div className="mt-2 flex-align">
                  <span className={getBadgeClass(scores.BRAND_PULSE.score ? (scores.BRAND_PULSE.score >= 90 ? 'EXCELLENT' : scores.BRAND_PULSE.score >= 80 ? 'HEALTHY' : 'WATCH') : 'BUILDING_BASELINE')}>
                    {scores.BRAND_PULSE.score ? (scores.BRAND_PULSE.score >= 90 ? 'EXCELLENT' : scores.BRAND_PULSE.score >= 80 ? 'HEALTHY' : 'WATCH') : 'Building baseline'}
                  </span>
                  <span className="text-secondary">• Live source telemetry active</span>
                </div>
                
                {/* Competitive Position Hero Context */}
                <div style={{ marginTop: '1.25rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                  <span className="text-muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Competitive Position</span>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--accent-gold)', marginTop: '0.15rem' }}>
                    {competitiveRankText}
                  </div>
                </div>
              </div>
              
              <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <span className="text-secondary">Scoping Context</span>
                <h3 style={{ color: 'var(--accent-gold)' }}>
                  {selectedLocObj ? `${selectedLocObj.name} (${selectedLocObj.city}, ${selectedLocObj.state})` : 'All Live Entities'}
                </h3>
                <span className="text-muted">{locationId ? 'Single location scope' : `${scopedLocations.length} live location(s) aggregated`}</span>
              </div>

            </div>

            {/* What Needs Attention Today */}
            <div className="card">
              <h3 className="card-title">What Needs Attention Today</h3>
              <div className="mt-2" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <Link href={`/alerts${locationId ? '?locationId=' + locationId : ''}`} className="attention-card-link" style={{ textDecoration: 'none' }}>
                  <div className="flex-between" style={{ backgroundColor: 'var(--bg-tertiary)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                      <div className="flex-align" style={{ fontWeight: 600 }}>
                        <ShieldAlert size={16} className={totalOpenAlerts > 0 ? 'text-negative' : 'text-positive'} />
                        <span>Active System Alerts</span>
                      </div>
                      {alertLocNames ? <span className="text-muted" style={{ fontSize: '0.75rem', paddingLeft: '1.5rem' }}>{alertLocNames}</span> : <span className="text-muted" style={{ fontSize: '0.75rem', paddingLeft: '1.5rem' }}>No critical alerts</span>}
                    </div>
                    <span className={totalOpenAlerts > 0 ? 'badge badge-critical' : 'badge badge-healthy'}>{totalOpenAlerts > 0 ? `${totalOpenAlerts} Active` : 'Clear'}</span>
                  </div>
                </Link>

                <Link href={`/recovery${locationId ? '?locationId=' + locationId : ''}`} className="attention-card-link" style={{ textDecoration: 'none' }}>
                  <div className="flex-between" style={{ backgroundColor: 'var(--bg-tertiary)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                      <div className="flex-align" style={{ fontWeight: 600 }}>
                        <AlertTriangle size={16} className={totalOpenRecovery > 0 ? 'text-warning' : 'text-positive'} />
                        <span>Open Guest Recovery Cases</span>
                      </div>
                      {recoveryLocNames ? <span className="text-muted" style={{ fontSize: '0.75rem', paddingLeft: '1.5rem' }}>{recoveryLocNames}</span> : <span className="text-muted" style={{ fontSize: '0.75rem', paddingLeft: '1.5rem' }}>No active recovery cases</span>}
                    </div>
                    <span className={totalOpenRecovery > 0 ? 'badge badge-watch' : 'badge badge-healthy'}>{totalOpenRecovery > 0 ? `${totalOpenRecovery} Pending` : 'Clear'}</span>
                  </div>
                </Link>
              </div>
            </div>
          </section>

          {/* Component Breakdowns */}
          <section className="grid-4">
            {/* Reputation */}
            <div className="card">
              <div className="card-header" style={{ marginBottom: '0.75rem' }}>
                <div className="flex-align">
                  <span className="text-secondary font-semibold">Reputation Score</span>
                  <Link href={getWhyHref('reputation')} style={{ fontSize: '0.75rem', color: 'var(--accent-gold)', textDecoration: 'underline' }}>Why?</Link>
                </div>
                <Percent size={16} className="text-info" />
              </div>
              <h2 style={{ fontSize: scores.REPUTATION.score !== null ? '2rem' : '1.25rem', fontWeight: 700, color: scores.REPUTATION.score !== null ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                {scores.REPUTATION.score !== null ? scores.REPUTATION.score : 'Insufficient data'}
              </h2>
              <div className="mt-1">{renderDelta(scores.REPUTATION.delta)}</div>
              <p className="text-muted mt-2" style={{ fontSize: '0.8rem' }}>Recency-weighted Star Rating Index.</p>
            </div>

            {/* Sentiment */}
            <div className="card">
              <div className="card-header" style={{ marginBottom: '0.75rem' }}>
                <div className="flex-align">
                  <span className="text-secondary font-semibold">Sentiment Score</span>
                  <Link href={getWhyHref('sentiment')} style={{ fontSize: '0.75rem', color: 'var(--accent-gold)', textDecoration: 'underline' }}>Why?</Link>
                </div>
                <ThumbsUp size={16} className="text-positive" />
              </div>
              <h2 style={{ fontSize: scores.SENTIMENT.score !== null ? '2rem' : '1.25rem', fontWeight: 700, color: scores.SENTIMENT.score !== null ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                {scores.SENTIMENT.score !== null ? scores.SENTIMENT.score : 'Insufficient data'}
              </h2>
              <div className="mt-1">{renderDelta(scores.SENTIMENT.delta)}</div>
              <p className="text-muted mt-2" style={{ fontSize: '0.8rem' }}>Net sentiment extracted from review text.</p>
            </div>

            {/* Competitive */}
            <div className="card">
              <div className="card-header" style={{ marginBottom: '0.75rem' }}>
                <div className="flex-align">
                  <span className="text-secondary font-semibold">Competitive Score</span>
                  <Link href={getWhyHref('competitive')} style={{ fontSize: '0.75rem', color: 'var(--accent-gold)', textDecoration: 'underline' }}>Why?</Link>
                </div>
                <Award size={16} className="text-warning" />
              </div>
              <h2 style={{ fontSize: scores.COMPETITIVE.score !== null ? '2rem' : '1.15rem', fontWeight: 700, color: scores.COMPETITIVE.score !== null ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                {scores.COMPETITIVE.score !== null ? scores.COMPETITIVE.score : (hasCompetitiveData ? 'Insufficient history' : 'Competitive set pending')}
              </h2>
              <div className="mt-1">{renderDelta(scores.COMPETITIVE.delta)}</div>
              <p className="text-muted mt-2" style={{ fontSize: '0.8rem' }}>Rating gap vs approved direct competitors.</p>
            </div>

            {/* Momentum */}
            <div className="card">
              <div className="card-header" style={{ marginBottom: '0.75rem' }}>
                <div className="flex-align">
                  <span className="text-secondary font-semibold">Momentum Score</span>
                  <Link href={getWhyHref('momentum')} style={{ fontSize: '0.75rem', color: 'var(--accent-gold)', textDecoration: 'underline' }}>Why?</Link>
                </div>
                <Activity size={16} className="text-positive" />
              </div>
              <h2 style={{ fontSize: scores.MOMENTUM.score !== null ? '2rem' : '1.25rem', fontWeight: 700, color: scores.MOMENTUM.score !== null ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                {scores.MOMENTUM.score !== null ? scores.MOMENTUM.score : 'Insufficient history'}
              </h2>
              <div className="mt-1">{renderDelta(scores.MOMENTUM.delta)}</div>
              <p className="text-muted mt-2" style={{ fontSize: '0.8rem' }}>Current reputation trend vs previous 30 days.</p>
            </div>
          </section>

          {/* Location-Scoped Competitive Trend Chart */}
          <CompetitiveTrendChart locationId={locationId} organizationId={organizationId} />


          {/* Detailed Content: Rankings & Alerts */}
          <section className="grid-bp">
            {/* Location Rankings */}
            <div className="card">
              <h3 className="card-title">Location Rankings</h3>
              
              <div className="table-container mt-2">
                {locationRankings.length <= 1 ? (
                  <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    Insufficient comparable LIVE locations (Only 1 active LIVE location being monitored)
                  </div>
                ) : (
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>Location</th>
                        <th className="text-right">Brand Pulse</th>
                        <th className="text-right">Delta</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {locationRankings.map((loc, idx) => (
                        <tr key={loc.id} className="clickable-row">
                          <td>{idx + 1}</td>
                          <td>
                            <Link href={`/locations/${loc.id}`} className="clickable-row-link" style={{ fontWeight: 600, color: 'var(--accent-gold)', textDecoration: 'none' }}>
                              {loc.name}
                            </Link>
                            <div className="text-muted" style={{ fontSize: '0.75rem' }}>{loc.city}</div>
                          </td>
                          <td className="text-right" style={{ fontWeight: 700 }}>
                            {loc.brandPulse !== null ? loc.brandPulse : 'Pending'}
                          </td>
                          <td className="text-right">{renderDelta(loc.delta)}</td>
                          <td>
                            <span className={getBadgeClass(loc.status)}>
                              {loc.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Critical Activity Feed */}
            <div className="card">
              <h3 className="card-title">Recent Critical Activity</h3>
              <div className="mt-2" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {activeAlerts.length === 0 && openRecoveryCases.length === 0 ? (
                  <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    No live critical activity
                  </div>
                ) : (
                  <>
                    {activeAlerts.map((alert) => (
                      <div key={alert.id} style={{ borderLeft: '3px solid var(--status-critical)', paddingLeft: '0.75rem' }}>
                        <div className="flex-between">
                          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{alert.title}</span>
                          <span className="badge badge-critical">Alert</span>
                        </div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }} className="mt-1">
                          {alert.description}
                        </p>
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', borderTop: '1px dotted var(--border-color)', paddingTop: '0.4rem', fontSize: '0.75rem' }}>
                          <Link href={`/alerts`} style={{ color: 'var(--accent-gold)', textDecoration: 'underline' }}>View Alert</Link>
                        </div>
                      </div>
                    ))}

                    {openRecoveryCases.map((rc) => (
                      <div key={rc.id} style={{ borderLeft: '3px solid var(--status-watch)', paddingLeft: '0.75rem' }}>
                        <div className="flex-between">
                          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Recovery: {rc.location.name}</span>
                          <span className="badge badge-watch">Recovery</span>
                        </div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }} className="mt-1">
                          Feedback: &quot;{rc.contentItem.text.substring(0, 80)}...&quot;
                        </p>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          </section>
        </main>
      </div>

      {/* Conditionally rendered "Why?" score explanation Modals */}
      {whyScore && whyData && (
        <div className="modal-overlay">
          <div className="modal-content">
            <Link href={getCloseHref()} className="modal-close" style={{ textDecoration: 'none' }}>
              &times;
            </Link>
            
            {whyScore === 'brand-pulse' && (
              <div>
                <h2 style={{ color: 'var(--accent-gold)', marginBottom: '1.5rem' }}>Why did BRASA Brand Pulse™ change?</h2>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                  <div>
                    <span className="text-secondary" style={{ fontSize: '0.9rem' }}>BRASA Brand Pulse™ Score</span>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 800 }}>{scores.BRAND_PULSE.score !== null ? scores.BRAND_PULSE.score : 'Insufficient data'}</h1>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

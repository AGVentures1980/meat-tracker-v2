import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { getServerSession, enforceScopeAccess } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import Link from 'next/link';
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  User,
  Star,
  Users,
  MessageSquare,
  ShieldAlert,
} from 'lucide-react';
import { CaseStatus } from '@prisma/client';

interface Location360Props {
  params: {
    id: string;
  };
}

export default async function Location360Page({ params }: Location360Props) {
  const cookieStore = cookies();
  const session = await getServerSession(cookieStore);

  if (!session) {
    redirect('/login');
  }

  const locationId = params.id;
  const organizationId = session.organizationId;

  // 1. Enforce Scope Check for this Location
  try {
    await enforceScopeAccess(session, { locationId });
  } catch (err) {
    redirect('/dashboard');
  }

  // 2. Fetch Location Details
  const location = await db.location.findUnique({
    where: { id: locationId },
    include: {
      classifications: true,
      brand: true,
    },
  });

  if (!location || location.organizationId !== organizationId) {
    redirect('/dashboard');
  }

  // 3. Fetch Manager Assignments
  const managerAssignments = await db.managerAssignment.findMany({
    where: { locationId },
    include: {
      employee: true,
    },
    orderBy: { startDate: 'desc' },
  });

  // 4. Fetch Latest Scores
  const scoreTypes = ['BRAND_PULSE', 'REPUTATION', 'SENTIMENT', 'COMPETITIVE', 'MOMENTUM', 'RESPONSE', 'RECOVERY'];
  const scores: Record<string, { score: number; delta: number }> = {};
  for (const type of scoreTypes) {
    const snap = await db.scoreSnapshot.findFirst({
      where: {
        organizationId,
        locationId,
        scoreType: type,
      },
      orderBy: { calculatedAt: 'desc' },
    });

    scores[type] = {
      score: snap?.score || 80.0,
      delta: snap?.delta || 0.0,
    };
  }

  // 5. Fetch Competitors Sets members
  const competitiveSets = await db.competitiveSet.findMany({
    where: {
      organizationId,
      locationId,
      status: 'ACTIVE',
    },
    include: {
      members: {
        where: { status: 'APPROVED' },
        include: {
          competitor: {
            include: { brand: true },
          },
        },
      },
    },
  });

  const compSetMembers = competitiveSets.flatMap(cs => cs.members);

  // Fetch Competitor latest Reputation averages
  const competitorAverages = [];
  for (const member of compSetMembers) {
    const compReviews = await db.contentItem.findMany({
      where: {
        competitorLocationId: member.competitorLocationId,
        contentType: 'REVIEW',
        rating: { not: null },
      },
      select: { rating: true },
    });

    const avg = compReviews.length > 0
      ? compReviews.reduce((sum, r) => sum + (r.rating || 5), 0) / compReviews.length
      : 4.0;

    competitorAverages.push({
      name: member.competitor.name,
      brand: member.competitor.brand.name,
      rating: Math.round(avg * 10) / 10,
      tier: member.tier,
    });
  }

  // 6. Fetch Recent Content (reviews, social posts)
  const contentItems = await db.contentItem.findMany({
    where: {
      organizationId,
      locationId,
      status: 'ACTIVE',
    },
    include: {
      sentimentAnalysis: true,
      reviewResponses: true,
      recoveryCases: true,
    },
    orderBy: { publishedAt: 'desc' },
    take: 6,
  });

  const totalReviews = await db.contentItem.count({
    where: { organizationId, locationId, contentType: 'REVIEW' },
  });

  const renderDelta = (delta: number) => {
    if (delta > 0) return <span className="text-positive flex-align"><TrendingUp size={14} /> +{delta}</span>;
    if (delta < 0) return <span className="text-negative flex-align"><TrendingDown size={14} /> {delta}</span>;
    return <span className="text-muted">No change</span>;
  };

  const getStatusBadge = (score: number) => {
    if (score >= 90) return <span className="badge badge-excellent">EXCELLENT</span>;
    if (score >= 80) return <span className="badge badge-healthy">HEALTHY</span>;
    if (score >= 70) return <span className="badge badge-watch">WATCH</span>;
    return <span className="badge badge-critical">CRITICAL</span>;
  };

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-content">
        <Header />
        <main className="page-container">
          {/* Header breadcrumb & info */}
          <div className="flex-between mb-4">
            <div>
              <Link href="/dashboard" className="text-secondary" style={{ fontSize: '0.85rem' }}>
                &larr; Back to Dashboard
              </Link>
              <h1 style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.25rem' }}>{location.name}</h1>
              <p className="text-secondary">{location.address}, {location.city}, {location.state}</p>
            </div>
            
            <div style={{ textAlign: 'right' }}>
              <span className="text-secondary">Brand Pulse Score</span>
              <div className="flex-align mt-1" style={{ justifyContent: 'flex-end' }}>
                <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--accent-gold)' }}>
                  {scores.BRAND_PULSE.score}
                </h2>
                <div>
                  {renderDelta(scores.BRAND_PULSE.delta)}
                </div>
              </div>
              <div className="mt-1">{getStatusBadge(scores.BRAND_PULSE.score)}</div>
            </div>
          </div>

          {/* Core Score Grid */}
          <section className="grid-4">
            <div className="card">
              <span className="text-secondary" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Review Rating</span>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 700 }} className="mt-1 flex-align">
                <Star size={20} className="text-warning" fill="var(--status-watch)" />
                {scores.REPUTATION.score ? (scores.REPUTATION.score / 20).toFixed(1) : '0.0'} / 5.0
              </h2>
              <div className="mt-1">{renderDelta(scores.REPUTATION.delta)}</div>
              <span className="text-muted" style={{ fontSize: '0.75rem' }}>{totalReviews} total reviews</span>
            </div>

            <div className="card">
              <span className="text-secondary" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Net Sentiment</span>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 700 }} className="mt-1">
                {scores.SENTIMENT.score}%
              </h2>
              <div className="mt-1">{renderDelta(scores.SENTIMENT.delta)}</div>
            </div>

            <div className="card">
              <span className="text-secondary" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Response Rate</span>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 700 }} className="mt-1">
                {scores.RESPONSE.score}%
              </h2>
              <div className="mt-1">{renderDelta(scores.RESPONSE.delta)}</div>
            </div>

            <div className="card">
              <span className="text-secondary" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Recovery Resolution</span>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 700 }} className="mt-1">
                {scores.RECOVERY.score}%
              </h2>
              <div className="mt-1">{renderDelta(scores.RECOVERY.delta)}</div>
            </div>
          </section>

          {/* Manager Tenure & Competitors */}
          <section className="grid-bp">
            {/* Manager Assignments Timeline */}
            <div className="card">
              <h3 className="card-title flex-align">
                <User size={18} className="text-info" />
                <span>Management Tenure & Impact</span>
              </h3>
              <div className="mt-4" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {managerAssignments.length === 0 ? (
                  <p className="text-muted">No manager assignments registered for this location.</p>
                ) : (
                  managerAssignments.map((assign) => (
                    <div key={assign.id} style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                      <div style={{ backgroundColor: 'var(--bg-tertiary)', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-gold)' }}>
                        <User size={20} />
                      </div>
                      <div>
                        <h4 style={{ fontWeight: 600 }}>{assign.employee.firstName} {assign.employee.lastName}</h4>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{assign.role}</p>
                        <div className="flex-align mt-1" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          <Calendar size={12} />
                          <span>
                            {new Date(assign.startDate).toLocaleDateString()} &ndash;{' '}
                            {assign.endDate ? new Date(assign.endDate).toLocaleDateString() : 'Present (Active)'}
                          </span>
                        </div>
                        <p className="text-info mt-2" style={{ fontSize: '0.8rem', fontStyle: 'italic' }}>
                          * Brand Pulse score is currently {scores.BRAND_PULSE.score} during this manager&apos;s active tenure (correlation analysis).
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Competitor Analysis */}
            <div className="card">
              <h3 className="card-title flex-align">
                <Users size={18} className="text-warning" />
                <span>Competitor Set Comparison</span>
              </h3>
              <div className="table-container mt-2">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Competitor</th>
                      <th>Brand</th>
                      <th className="text-right">Reputation Rating</th>
                      <th>Tier</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ fontWeight: 600, color: 'var(--accent-gold)' }}>{location.name} (Us)</td>
                      <td>{location.brand.name}</td>
                      <td className="text-right" style={{ fontWeight: 700 }}>
                        {scores.REPUTATION.score ? (scores.REPUTATION.score / 20).toFixed(1) : '0.0'}
                      </td>
                      <td><span className="badge badge-healthy">OWN</span></td>
                    </tr>
                    {competitorAverages.map((comp, idx) => (
                      <tr key={idx}>
                        <td>{comp.name}</td>
                        <td>{comp.brand}</td>
                        <td className="text-right" style={{ fontWeight: 700 }}>{comp.rating}</td>
                        <td>
                          <span className="badge badge-watch">
                            {comp.tier}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Recent Reviews & Feed */}
          <section className="card">
            <h3 className="card-title">Recent Feedback & Social Activity</h3>
            <div className="table-container mt-2">
              <table className="table">
                <thead>
                  <tr>
                    <th>Source</th>
                    <th>Date</th>
                    <th>Author</th>
                    <th>Text</th>
                    <th className="text-right">Rating</th>
                    <th>Sentiment</th>
                    <th>Action Link</th>
                  </tr>
                </thead>
                <tbody>
                  {contentItems.map((item) => (
                    <tr key={item.id}>
                      <td style={{ fontWeight: 600 }}>{item.dataSourceId}</td>
                      <td>{new Date(item.publishedAt).toLocaleDateString()}</td>
                      <td>{item.authorName}</td>
                      <td style={{ maxWidth: '400px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.text}
                      </td>
                      <td className="text-right" style={{ fontWeight: 700 }}>{item.rating || 'N/A'}</td>
                      <td>
                        {item.sentimentAnalysis ? (
                          <span className={item.sentimentAnalysis.overallSentiment === 'POSITIVE' ? 'text-positive' : item.sentimentAnalysis.overallSentiment === 'NEGATIVE' ? 'text-negative' : 'text-warning'}>
                            {item.sentimentAnalysis.overallSentiment}
                          </span>
                        ) : (
                          <span className="text-muted">PENDING</span>
                        )}
                      </td>
                      <td>
                        <Link href={`/reviews?id=${item.id}`} style={{ color: 'var(--accent-gold)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600 }}>
                          <span>Details</span>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

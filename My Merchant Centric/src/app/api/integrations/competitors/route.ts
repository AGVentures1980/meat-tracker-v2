import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser, enforceScopeAccess } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const locationId = searchParams.get('locationId') || searchParams.get('entityId');

  if (!locationId || locationId === 'ALL') {
    return NextResponse.json({ error: 'locationId query parameter is required' }, { status: 400 });
  }

  await enforceScopeAccess(session, { locationId });

  try {
    // 1. Fetch location details
    const loc = await db.location.findUnique({ where: { id: locationId } });
    if (!loc) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    // 2. Fetch competitive set & members
    const compSet = await db.competitiveSet.findFirst({
      where: { locationId, organizationId: session.organizationId },
      include: {
        members: {
          include: {
            competitor: {
              include: { brand: true }
            }
          },
          orderBy: { distanceMiles: 'asc' }
        }
      }
    });

    if (!compSet) {
      return NextResponse.json({
        locationId,
        locationName: loc.name,
        competitiveSetId: null,
        primaryCompetitors: [],
        broaderMarket: [],
        watchlist: [],
        pendingDiscovery: [],
        benchmarkMetrics: null,
        noDirectCompetitors: true
      });
    }

    // Zero-tolerance self-competition filter (Texas de Brazil)
    const validMembers = compSet.members.filter(
      m => !m.competitor.name.toLowerCase().includes('texas de brazil')
    );

    // Filter by canonical approval status & role
    const approvedMembers = validMembers.filter(m => m.status === 'APPROVED');
    
    // User-facing groups
    const primaryCompetitors = approvedMembers.filter(
      m => m.competitiveRole === 'DIRECT' || (!m.competitiveRole && m.tier === 'DIRECT')
    );

    const broaderMarket = approvedMembers.filter(
      m => m.competitiveRole === 'SECONDARY' || (!m.competitiveRole && m.tier === 'ADJACENT')
    );

    const watchlist = approvedMembers.filter(
      m => m.competitiveRole === 'WATCHLIST' || m.status === 'WATCHLIST'
    );

    const pendingDiscovery = validMembers.filter(
      m => m.status === 'PENDING'
    );

    // Benchmark calculation (uses ONLY approved DIRECT and SECONDARY members)
    const benchmarkParticipants = [...primaryCompetitors, ...broaderMarket];
    
    let benchmarkMetrics = null;
    if (benchmarkParticipants.length > 0) {
      const validRatings = benchmarkParticipants
        .map(m => m.competitor.googleRating)
        .filter((r): r is number => typeof r === 'number' && r > 0);
      
      const validReviews = benchmarkParticipants
        .map(m => m.competitor.userRatingCount)
        .filter((c): c is number => typeof c === 'number' && c > 0);

      const marketAvgRating = validRatings.length > 0
        ? validRatings.reduce((a, b) => a + b, 0) / validRatings.length
        : 0;

      const marketAvgReviews = validReviews.length > 0
        ? validReviews.reduce((a, b) => a + b, 0) / validReviews.length
        : 0;

      benchmarkMetrics = {
        totalBenchmarkParticipants: benchmarkParticipants.length,
        primaryCount: primaryCompetitors.length,
        broaderCount: broaderMarket.length,
        watchlistCount: watchlist.length,
        marketAvgRating: Number(marketAvgRating.toFixed(2)),
        marketAvgReviews: Math.round(marketAvgReviews),
      };
    }

    return NextResponse.json({
      locationId,
      locationName: loc.name,
      competitiveSetId: compSet.id,
      primaryCompetitors,
      broaderMarket,
      watchlist,
      pendingDiscovery,
      benchmarkMetrics,
      noDirectCompetitors: primaryCompetitors.length === 0
    });
  } catch (err: any) {
    console.error('Fetch competitors API error:', err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { memberId, action, reason } = body;

    if (!memberId || !action) {
      return NextResponse.json({ error: 'Missing memberId or action' }, { status: 400 });
    }

    const member = await db.competitiveSetMember.findUnique({
      where: { id: memberId },
      include: { set: true }
    });

    if (!member) {
      return NextResponse.json({ error: 'Competitive member not found' }, { status: 404 });
    }

    await enforceScopeAccess(session, { locationId: member.set.locationId });

    let newStatus = member.status;
    let newTier = member.tier;
    let newRole = member.competitiveRole;

    if (action === 'APPROVE_DIRECT' || action === 'MOVE_PRIMARY') {
      newStatus = 'APPROVED';
      newTier = 'DIRECT';
      newRole = 'DIRECT';
    } else if (action === 'APPROVE_SECONDARY' || action === 'MOVE_BROADER') {
      newStatus = 'APPROVED';
      newTier = 'ADJACENT';
      newRole = 'SECONDARY';
    } else if (action === 'WATCHLIST' || action === 'MOVE_WATCHLIST') {
      newStatus = 'APPROVED';
      newRole = 'WATCHLIST';
    } else if (action === 'REJECT' || action === 'REMOVE') {
      newStatus = 'REJECTED';
    }

    const updated = await db.competitiveSetMember.update({
      where: { id: memberId },
      data: {
        status: newStatus,
        tier: newTier,
        competitiveRole: newRole,
        approvedByUser: newStatus === 'APPROVED',
        approvedBy: session.email || session.id,
        approvedAt: new Date(),
        approvalReason: reason || `Human decision: ${action}`
      }
    });

    return NextResponse.json({ success: true, member: updated });
  } catch (err: any) {
    console.error('Update competitor action error:', err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}

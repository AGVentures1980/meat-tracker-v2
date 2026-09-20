import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser, enforceScopeAccess } from '@/lib/auth';
import { evaluateCompetitiveRelevance } from '@/lib/scout/competitiveRelevanceEngine';

export async function GET(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const locationId = searchParams.get('locationId') || searchParams.get('entityId');

  try {
    let targetLocId = locationId;
    if (!targetLocId) {
      const loc = await db.location.findFirst({
        where: { organizationId: session.organizationId, provenanceMode: 'LIVE' }
      });
      targetLocId = loc?.id || null;
    }

    if (!targetLocId) {
      return NextResponse.json({
        success: true,
        discoveryStatus: 'NOT_STARTED',
        groups: { direct: [], secondary: [], watchlist: [], lowRelevance: [] },
        approved: [],
        approvedDirectCompetitors: [],
        approvedSecondaryCompetitors: [],
        watchlistCompetitors: [],
        unverifiedCompetitors: []
      });
    }

    await enforceScopeAccess(session, { locationId: targetLocId });

    const targetLoc = await db.location.findUnique({ where: { id: targetLocId } });
    if (!targetLoc) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    const members = await db.competitiveSetMember.findMany({
      where: {
        set: { locationId: targetLocId, organizationId: session.organizationId },
      },
      include: {
        competitor: {
          include: {
            brand: true,
            externalSources: {
              include: {
                snapshots: { orderBy: { capturedAt: 'desc' }, take: 1 }
              }
            }
          }
        }
      }
    });

    const direct: any[] = [];
    const secondary: any[] = [];
    const watchlist: any[] = [];
    const lowRelevance: any[] = [];
    const approved: any[] = [];

    const approvedDirectCompetitors: any[] = [];
    const approvedSecondaryCompetitors: any[] = [];
    const watchlistCompetitors: any[] = [];
    const unverifiedCompetitors: any[] = [];

    for (const mem of members) {
      const comp = mem.competitor;
      if (!comp) continue;

      const extSource = comp.externalSources?.[0];
      const snap = extSource?.snapshots?.[0];

      const evalRes = evaluateCompetitiveRelevance(
        { name: targetLoc.name, latitude: targetLoc.latitude || 27.9653, longitude: targetLoc.longitude || -82.5186 },
        {
          name: comp.name,
          address: `${comp.address}, ${comp.city}, ${comp.state}`,
          latitude: comp.latitude,
          longitude: comp.longitude,
          serviceModel: comp.serviceModel,
          priceTier: comp.priceTier,
          googleRating: snap?.rating,
          reviewCount: snap?.reviewCount,
          placeId: extSource?.externalLocationId
        }
      );

      // Golden invariant: approvedCompetitiveRole wins over proposedTier
      const role = mem.competitiveRole || mem.tier || 'DIRECT';
      const benchmarkEligible = mem.status === 'APPROVED' && (role === 'DIRECT' || role === 'SECONDARY');

      const item = {
        id: mem.id,
        competitorLocationId: comp.id,
        name: comp.name,
        brandName: comp.brand?.name || comp.name,
        address: `${comp.address}, ${comp.city}, ${comp.state}`,
        placeId: extSource?.externalLocationId || null,
        distanceMiles: mem.distanceMiles || evalRes.distanceMiles,
        rating: snap?.rating || comp.googleRating || null,
        reviewCount: snap?.reviewCount || comp.userRatingCount || null,
        relevanceScore: evalRes.relevanceScore,
        proposedTier: mem.proposedTier || evalRes.recommendedCompetitiveRole,
        approvedCompetitiveRole: mem.competitiveRole || null,
        confidence: evalRes.confidence,
        explanation: mem.explanation || evalRes.explanation,
        evidence: evalRes.dimensions,
        status: mem.status,
        approvedByUser: mem.approvedByUser,
        approvedBy: mem.approvedBy || null,
        approvedAt: mem.approvedAt || null,
        approvalReason: mem.approvalReason || null,
        benchmarkEligible,
        businessStatus: 'OPERATIONAL'
      };

      if (mem.status === 'APPROVED' && mem.approvedByUser) {
        approved.push(item);
        if (role === 'DIRECT') approvedDirectCompetitors.push(item);
        else if (role === 'SECONDARY') approvedSecondaryCompetitors.push(item);
        else if (role === 'WATCHLIST') watchlistCompetitors.push(item);
      } else if (mem.status === 'UNVERIFIED' || mem.status === 'PENDING') {
        unverifiedCompetitors.push(item);
        if (evalRes.recommendedCompetitiveRole === 'DIRECT') direct.push(item);
        else if (evalRes.recommendedCompetitiveRole === 'SECONDARY') secondary.push(item);
        else if (evalRes.recommendedCompetitiveRole === 'WATCHLIST') watchlist.push(item);
        else lowRelevance.push(item);
      } else {
        if (evalRes.recommendedCompetitiveRole === 'DIRECT') direct.push(item);
        else if (evalRes.recommendedCompetitiveRole === 'SECONDARY') secondary.push(item);
        else if (evalRes.recommendedCompetitiveRole === 'WATCHLIST') watchlist.push(item);
        else lowRelevance.push(item);
      }
    }

    const sortFn = (a: any, b: any) => b.relevanceScore - a.relevanceScore;
    direct.sort(sortFn);
    secondary.sort(sortFn);
    watchlist.sort(sortFn);
    lowRelevance.sort(sortFn);
    approved.sort(sortFn);
    approvedDirectCompetitors.sort(sortFn);
    approvedSecondaryCompetitors.sort(sortFn);
    watchlistCompetitors.sort(sortFn);
    unverifiedCompetitors.sort(sortFn);

    // Compute Discovery Status for this location
    let discoveryStatus: 'NOT_STARTED' | 'DISCOVERY_AVAILABLE' | 'REVIEW_REQUIRED' | 'APPROVED_MARKET_READY' = 'NOT_STARTED';
    if (approvedDirectCompetitors.length > 0 || approvedSecondaryCompetitors.length > 0) {
      discoveryStatus = 'APPROVED_MARKET_READY';
    } else if (unverifiedCompetitors.length > 0) {
      discoveryStatus = 'REVIEW_REQUIRED';
    } else if (members.length > 0) {
      discoveryStatus = 'DISCOVERY_AVAILABLE';
    }

    return NextResponse.json({
      success: true,
      locationId: targetLocId,
      locationName: targetLoc.name,
      discoveryStatus,
      totalMembers: members.length,
      approvedCount: approved.length,
      groups: { direct, secondary, watchlist, lowRelevance },
      approved,
      approvedDirectCompetitors,
      approvedSecondaryCompetitors,
      watchlistCompetitors,
      unverifiedCompetitors
    });
  } catch (err: any) {
    if (err?.message?.includes('Unauthorized') || err?.message?.includes('SCOPE_ACCESS_DENIED') || err?.message?.includes('Scope access denied')) {
      return NextResponse.json({ error: 'Scope access denied' }, { status: 403 });
    }
    console.error('Fetch competitor candidates error:', err);
    return NextResponse.json({ error: err?.message || 'Error fetching competitor candidates' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { memberId, competitorLocationId, status, competitiveRole, approvalReason } = body;

    let targetMember = null;

    if (memberId) {
      targetMember = await db.competitiveSetMember.findUnique({
        where: { id: memberId },
        include: { set: true }
      });
    } else if (competitorLocationId) {
      targetMember = await db.competitiveSetMember.findFirst({
        where: { competitorLocationId },
        include: { set: true }
      });
    }

    if (!targetMember) {
      return NextResponse.json({ error: 'Target competitive set member not found' }, { status: 404 });
    }

    // Tenant & Location Scope Enforcement
    if (targetMember.set.organizationId !== session.organizationId) {
      return NextResponse.json({ error: 'Scope access denied' }, { status: 403 });
    }
    await enforceScopeAccess(session, { locationId: targetMember.set.locationId });

    const newStatus = status || 'APPROVED';
    const isApproved = newStatus === 'APPROVED';
    const newRole = competitiveRole || targetMember.competitiveRole || 'DIRECT';

    const updated = await db.competitiveSetMember.update({
      where: { id: targetMember.id },
      data: {
        status: newStatus,
        approvedByUser: isApproved,
        approvedBy: isApproved ? session.email : targetMember.approvedBy,
        approvedAt: isApproved ? new Date() : targetMember.approvedAt,
        approvalReason: approvalReason || `Human ${newStatus} classification as ${newRole}`,
        competitiveRole: newRole
      }
    });

    // Immutable Audit Log Creation
    await db.auditLog.create({
      data: {
        organizationId: session.organizationId,
        userId: session.id,
        action: 'COMPETITOR_ROLE_CLASSIFIED',
        entityType: 'CompetitiveSetMember',
        entityId: targetMember.id,
        metadata: {
          locationId: targetMember.set.locationId,
          competitorLocationId: targetMember.competitorLocationId,
          previousStatus: targetMember.status,
          previousRole: targetMember.competitiveRole,
          newStatus,
          newRole,
          proposedTier: targetMember.proposedTier,
          humanOverrodeAlgorithm: targetMember.proposedTier !== newRole,
          approvedBy: session.email,
          approvedAt: new Date().toISOString(),
          approvalReason
        } as any
      }
    });

    return NextResponse.json({ success: true, member: updated });
  } catch (err: any) {
    if (err?.message?.includes('Unauthorized') || err?.message?.includes('SCOPE_ACCESS_DENIED') || err?.message?.includes('Scope access denied')) {
      return NextResponse.json({ error: 'Scope access denied' }, { status: 403 });
    }
    console.error('Competitor approval action error:', err);
    return NextResponse.json({ error: err?.message || 'Error processing competitor approval' }, { status: 500 });
  }
}

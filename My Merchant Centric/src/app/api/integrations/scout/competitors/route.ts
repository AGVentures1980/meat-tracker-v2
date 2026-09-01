import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
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
        groups: { direct: [], secondary: [], watchlist: [], lowRelevance: [] },
        approved: [],
        approvedDirectCompetitors: [],
        approvedSecondaryCompetitors: [],
        watchlistCompetitors: [],
        unverifiedCompetitors: []
      });
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
        { name: 'Texas de Brazil Location', latitude: 27.9653, longitude: -82.5186 },
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

      const item = {
        id: mem.id,
        competitorLocationId: comp.id,
        name: comp.name,
        brandName: comp.brand?.name || comp.name,
        address: `${comp.address}, ${comp.city}, ${comp.state}`,
        placeId: extSource?.externalLocationId || null,
        distanceMiles: evalRes.distanceMiles,
        rating: snap?.rating || null,
        reviewCount: snap?.reviewCount || null,
        relevanceScore: evalRes.relevanceScore,
        recommendedCompetitiveRole: evalRes.recommendedCompetitiveRole,
        approvedCompetitiveRole: mem.competitiveRole || null,
        confidence: evalRes.confidence,
        explanation: evalRes.explanation,
        evidence: evalRes.dimensions,
        status: mem.status,
        approvedByUser: mem.approvedByUser,
        businessStatus: 'OPERATIONAL'
      };

      const role = mem.competitiveRole || mem.tier || 'DIRECT';

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

    return NextResponse.json({
      success: true,
      groups: { direct, secondary, watchlist, lowRelevance },
      approved,
      approvedDirectCompetitors,
      approvedSecondaryCompetitors,
      watchlistCompetitors,
      unverifiedCompetitors
    });
  } catch (err: any) {
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

    let targetMemberId = memberId;
    if (!targetMemberId && competitorLocationId) {
      const found = await db.competitiveSetMember.findFirst({
        where: { competitorLocationId }
      });
      targetMemberId = found?.id;
    }

    if (!targetMemberId) {
      return NextResponse.json({ error: 'Target memberId or competitorLocationId missing' }, { status: 400 });
    }

    const updated = await db.competitiveSetMember.update({
      where: { id: targetMemberId },
      data: {
        status: status || 'APPROVED',
        approvedByUser: status === 'APPROVED',
        approvedBy: session.email,
        approvedAt: new Date(),
        approvalReason: approvalReason || `Manual ${status} action from UI`,
        competitiveRole: competitiveRole || 'DIRECT'
      }
    });

    return NextResponse.json({ success: true, member: updated });
  } catch (err: any) {
    console.error('Competitor approval action error:', err);
    return NextResponse.json({ error: err?.message || 'Error processing competitor approval' }, { status: 500 });
  }
}

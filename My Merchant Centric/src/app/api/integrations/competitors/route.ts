import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser, enforceScopeAccess, getEffectiveOrganizationId } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const locationId = searchParams.get('locationId') || searchParams.get('entityId');
  const requestedOrgId = searchParams.get('organizationId');

  let organizationId: string;
  try {
    organizationId = await getEffectiveOrganizationId(session, requestedOrgId);
  } catch (err: any) {
    return NextResponse.json({ error: 'SCOPE_ACCESS_DENIED', message: 'Unauthorized organization scope access.' }, { status: 403 });
  }

  if (!locationId || locationId === 'ALL') {
    return NextResponse.json({ error: 'locationId query parameter is required' }, { status: 400 });
  }

  try {
    await enforceScopeAccess(session, { locationId });
  } catch (err) {
    return NextResponse.json({ error: 'SCOPE_ACCESS_DENIED', message: 'Unauthorized location scope access.' }, { status: 403 });
  }

  try {
    // 1. Fetch location details
    const loc = await db.location.findUnique({ where: { id: locationId } });
    if (!loc) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    // 2. Fetch competitive set & members
    const compSet = await db.competitiveSet.findFirst({
      where: { locationId, organizationId },
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

    const members = compSet?.members || [];

    const primaryCompetitors = members.filter(m => m.tier === 'PRIMARY' && m.status === 'APPROVED');
    const broaderMarket = members.filter(m => m.tier === 'BROADER' && m.status === 'APPROVED');
    const watchlist = members.filter(m => m.tier === 'WATCHLIST' && m.status === 'APPROVED');

    return NextResponse.json({
      success: true,
      location: {
        id: loc.id,
        name: loc.name,
        city: loc.city,
        state: loc.state,
      },
      primaryCompetitors: primaryCompetitors.map(m => ({
        id: m.id,
        competitorLocationId: m.competitorLocationId,
        name: m.competitor.name,
        brandName: m.competitor.brand?.name || 'Competitor',
        city: m.competitor.city,
        state: m.competitor.state,
        distanceMiles: m.distanceMiles,
        tier: m.tier,
        role: m.competitiveRole || m.tier,
        status: m.status,
      })),
      broaderMarket: broaderMarket.map(m => ({
        id: m.id,
        competitorLocationId: m.competitorLocationId,
        name: m.competitor.name,
        brandName: m.competitor.brand?.name || 'Competitor',
        city: m.competitor.city,
        state: m.competitor.state,
        distanceMiles: m.distanceMiles,
        tier: m.tier,
        role: m.competitiveRole || m.tier,
        status: m.status,
      })),
      watchlist: watchlist.map(m => ({
        id: m.id,
        competitorLocationId: m.competitorLocationId,
        name: m.competitor.name,
        brandName: m.competitor.brand?.name || 'Competitor',
        city: m.competitor.city,
        state: m.competitor.state,
        distanceMiles: m.distanceMiles,
        tier: m.tier,
        role: m.competitiveRole || m.tier,
        status: m.status,
      }))
    });
  } catch (err: any) {
    console.error('API competitors fetch error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser, enforceScopeAccess } from '@/lib/auth';
import { MultiLocationCompetitiveDiscoveryEngine } from '@/lib/scout/multiLocationCompetitiveDiscoveryEngine';

export async function POST(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const locationId = body.locationId;

    const engine = new MultiLocationCompetitiveDiscoveryEngine();

    if (locationId && locationId !== 'ALL') {
      await enforceScopeAccess(session, { locationId });

      const targetLoc = await db.location.findUnique({ where: { id: locationId } });
      if (!targetLoc) {
        return NextResponse.json({ error: 'Location not found' }, { status: 404 });
      }

      if (targetLoc.businessStatus === 'COMING_SOON' || targetLoc.status !== 'ACTIVE') {
        return NextResponse.json({
          error: 'Competitive discovery cannot be executed for coming-soon or non-operational locations'
        }, { status: 403 });
      }

      const report = await engine.runDiscoveryForLocation(locationId);
      return NextResponse.json({ success: true, report });
    }

    // Pilot run for target active pilot locations if locationId === 'ALL' or empty
    const pilotLocations = await db.location.findMany({
      where: {
        organizationId: session.organizationId,
        status: 'ACTIVE',
        businessStatus: 'OPERATIONAL',
        OR: [
          { name: { contains: 'Tampa' } },
          { name: { contains: 'Fairfax' } },
          { name: { contains: 'Orlando' } },
          { name: { contains: 'Addison' } },
          { name: { contains: 'Irvine' } },
          { name: { contains: 'Las Vegas' } },
        ],
      },
    });

    const reports = [];
    for (const loc of pilotLocations) {
      const r = await engine.runDiscoveryForLocation(loc.id);
      reports.push(r);
    }

    return NextResponse.json({ success: true, reports });
  } catch (err: any) {
    if (err?.message?.includes('Unauthorized') || err?.message?.includes('SCOPE_ACCESS_DENIED') || err?.message?.includes('Scope access denied')) {
      return NextResponse.json({ error: 'Scope access denied' }, { status: 403 });
    }
    console.error('Competitive discovery API error:', err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}

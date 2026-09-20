import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser, enforceScopeAccess } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const organizationId = searchParams.get('organizationId') || session.organizationId;

  if (organizationId !== session.organizationId) {
    return NextResponse.json({ error: 'Scope access denied' }, { status: 403 });
  }

  try {
    const org = await db.organization.findUnique({
      where: { id: organizationId },
      include: {
        locations: {
          orderBy: { name: 'asc' }
        }
      }
    });

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const eligibleLocations: any[] = [];
    const excludedLocations: any[] = [];

    for (const loc of org.locations) {
      const isOperational = loc.status === 'ACTIVE' && loc.businessStatus === 'OPERATIONAL';
      const item = {
        id: loc.id,
        brasaLocationId: loc.brasaLocationId,
        name: loc.name,
        city: loc.city,
        state: loc.state,
        country: loc.country,
        businessStatus: loc.businessStatus || 'OPERATIONAL',
        status: loc.status,
        physicalIdentityStatus: isOperational ? 'VERIFIED' : 'PENDING',
        masterIdentityStatus: loc.verificationStatus || 'MASTER_PROVISIONAL',
        eligibleForCompetitiveDiscovery: isOperational,
        pilotCandidateLabel: isOperational ? 'PILOT_CANDIDATE' : 'EXCLUDED_NON_OPERATIONAL'
      };

      if (isOperational) {
        eligibleLocations.push(item);
      } else {
        excludedLocations.push(item);
      }
    }

    return NextResponse.json({
      success: true,
      organizationId: org.id,
      organizationName: org.name,
      counts: {
        totalLocations: org.locations.length,
        eligibleOperatingLocations: eligibleLocations.length,
        excludedLocations: excludedLocations.length
      },
      eligibleLocations,
      excludedLocations
    });
  } catch (err: any) {
    console.error('Fetch pilot candidates error:', err);
    return NextResponse.json({ error: err?.message || 'Error fetching pilot candidates' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // AUTHORIZATION ENFORCEMENT: GM or store-level users CANNOT select network pilot markets!
  const userRoles = (session.roles || []) as string[];
  const isCorporateAdmin =
    userRoles.includes('CORPORATE_ADMIN') ||
    userRoles.includes('ADMIN') ||
    userRoles.includes('SUPER_ADMIN') ||
    userRoles.includes('EXECUTIVE') ||
    (session as any).role === 'CORPORATE_ADMIN';

  if (!isCorporateAdmin) {
    return NextResponse.json({
      error: 'Only Corporate Admin or Director users can select network pilot markets'
    }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { locationId } = body;

    if (!locationId) {
      return NextResponse.json({ error: 'Missing locationId' }, { status: 400 });
    }

    await enforceScopeAccess(session, { locationId });

    const targetLoc = await db.location.findUnique({ where: { id: locationId } });
    if (!targetLoc) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    if (targetLoc.businessStatus === 'COMING_SOON' || targetLoc.status !== 'ACTIVE') {
      return NextResponse.json({
        error: 'Coming soon or non-operational locations cannot be selected as pilot markets'
      }, { status: 400 });
    }

    // Record immutable audit log for human pilot selection
    await db.auditLog.create({
      data: {
        organizationId: session.organizationId,
        userId: session.id,
        action: 'PILOT_MARKET_SELECTED',
        entityType: 'Location',
        entityId: targetLoc.id,
        metadata: JSON.parse(JSON.stringify({
          locationName: targetLoc.name,
          city: targetLoc.city,
          state: targetLoc.state,
          brasaLocationId: targetLoc.brasaLocationId,
          selectedBy: session.email,
          selectedAt: new Date().toISOString()
        }))
      }
    });

    return NextResponse.json({
      success: true,
      message: `Location "${targetLoc.name}" selected as pilot market`,
      selectedLocation: {
        id: targetLoc.id,
        brasaLocationId: targetLoc.brasaLocationId,
        name: targetLoc.name,
        city: targetLoc.city,
        state: targetLoc.state,
        readinessState: 'PILOT_SELECTED'
      }
    });
  } catch (err: any) {
    if (err?.message?.includes('Unauthorized') || err?.message?.includes('SCOPE_ACCESS_DENIED') || err?.message?.includes('Scope access denied')) {
      return NextResponse.json({ error: 'Scope access denied' }, { status: 403 });
    }
    console.error('Select pilot market error:', err);
    return NextResponse.json({ error: err?.message || 'Error selecting pilot market' }, { status: 500 });
  }
}

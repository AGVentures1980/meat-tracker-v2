import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser, getEffectiveOrganizationId } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const requestedOrgId = searchParams.get('organizationId');
    const mode = searchParams.get('mode');
    const targetOrgId = await getEffectiveOrganizationId(session, requestedOrgId);

    const whereClause: any = {
      organizationId: targetOrgId,
      status: 'ACTIVE',
      provenanceMode: { in: ['LIVE', 'IMPORTED'] },
    };

    if (mode === 'EXTENDED_DIRECTORY') {
      // Return all active directory locations for the organization
    } else {
      // Default Operational Mode: OPERATIONAL stores excluding PULSE_DIRECTORY_ONLY records
      whereClause.businessStatus = 'OPERATIONAL';
      whereClause.verificationStatus = { not: 'PULSE_DIRECTORY_ONLY' };
    }

    const locations = await db.location.findMany({
      where: whereClause,
      select: {
        id: true,
        brasaLocationId: true,
        name: true,
        city: true,
        state: true,
        country: true,
        businessStatus: true,
        verificationStatus: true,
        organizationId: true
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(locations);
  } catch (err: any) {
    if (err?.message === 'SCOPE_ACCESS_DENIED') {
      return NextResponse.json({ error: 'SCOPE_ACCESS_DENIED', message: 'Unauthorized organization scope access.' }, { status: 403 });
    }
    console.error('API locations fetch error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

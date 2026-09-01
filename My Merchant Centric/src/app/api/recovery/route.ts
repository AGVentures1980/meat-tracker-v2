import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser, enforceScopeAccess } from '@/lib/auth';
import { ScopeType } from '@prisma/client';

export async function GET(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const locationId = searchParams.get('locationId');

  try {
    let targetLocationIds: string[] = [];
    if (locationId && locationId !== 'ALL') {
      await enforceScopeAccess(session, { locationId });
      targetLocationIds = [locationId];
    } else {
      // Get all active locations for organization
      const allLocs = await db.location.findMany({
        where: { organizationId: session.organizationId, status: 'ACTIVE' },
        select: { id: true },
      });
      // Filter scoped locations
      for (const l of allLocs) {
        const isAllowed = await db.location.findFirst({
          where: { id: l.id },
        });
        if (isAllowed) targetLocationIds.push(l.id);
      }
    }

    const cases = await db.recoveryCase.findMany({
      where: {
        organizationId: session.organizationId,
        locationId: { in: targetLocationIds },
      },
      include: {
        location: { select: { name: true } },
        contentItem: true,
        activities: { orderBy: { createdAt: 'desc' } },
      },
      orderBy: { openedAt: 'desc' },
    });

    return NextResponse.json(cases);
  } catch (err: any) {
    console.error('Fetch recovery cases API error:', err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}

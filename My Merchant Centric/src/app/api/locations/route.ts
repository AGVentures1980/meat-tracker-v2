import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const locations = await db.location.findMany({
      where: {
        organizationId: session.organizationId,
        status: 'ACTIVE',
        provenanceMode: { in: ['LIVE', 'IMPORTED'] },
      },
      select: {
        id: true,
        name: true,
        city: true,
        state: true,
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(locations);
  } catch (err: any) {
    console.error('API locations fetch error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

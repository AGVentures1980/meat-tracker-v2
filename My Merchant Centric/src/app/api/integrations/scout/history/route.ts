import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser, enforceTenantIsolation } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const organizationId = searchParams.get('organizationId');
  const sourceId = searchParams.get('sourceId');

  if (!organizationId || !sourceId) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  }

  try {
    enforceTenantIsolation(session, organizationId);

    const source = await db.externalSource.findFirst({
      where: { id: sourceId, organizationId }
    });

    if (!source) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

    const snapshots = await db.sourceSnapshot.findMany({
      where: { externalSourceId: sourceId },
      orderBy: { capturedAt: 'desc' },
      take: 50
    });

    return NextResponse.json({ success: true, snapshots });
  } catch (err: any) {
    console.error('Fetch source snapshot history error:', err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}

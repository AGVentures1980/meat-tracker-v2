import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser, enforceTenantIsolation } from '@/lib/auth';
import { calculateMetadataIntelligence } from '@/lib/services/scoutService';

export async function GET(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const organizationId = searchParams.get('organizationId');
  const sourceId = searchParams.get('sourceId');

  if (!organizationId || !sourceId) {
    return NextResponse.json({ error: 'Missing organizationId or sourceId' }, { status: 400 });
  }

  try {
    enforceTenantIsolation(session, organizationId);

    // Fetch the source to verify tenant access
    const source = await db.externalSource.findFirst({
      where: { id: sourceId, organizationId }
    });

    if (!source) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

    const intel = await calculateMetadataIntelligence(sourceId);

    return NextResponse.json({ success: true, intelligence: intel });
  } catch (err: any) {
    console.error('Fetch scout intelligence error:', err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser, enforceTenantIsolation, enforceScopeAccess } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { organizationId, locationId } = await req.json();

    if (!organizationId || !locationId) {
      return NextResponse.json({ error: 'Missing organizationId or locationId' }, { status: 400 });
    }

    // 1. Tenant Boundary check
    enforceTenantIsolation(session, organizationId);

    // 2. Scope access check
    await enforceScopeAccess(session, { locationId });

    const sources = ['TIKTOK', 'INSTAGRAM', 'REDDIT', 'X', 'YOUTUBE'];
    const jobIds: string[] = [];

    for (const src of sources) {
      const job = await db.job.create({
        data: {
          type: 'syncSource',
          payload: {
            organizationId,
            locationId,
            sourceType: src,
          },
        },
      });
      jobIds.push(job.id);
    }

    return NextResponse.json({
      success: true,
      message: `Enqueued ${sources.length} mock social ingestion sync jobs.`,
      jobIds,
    });
  } catch (err: any) {
    console.error('Sync social error:', err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}

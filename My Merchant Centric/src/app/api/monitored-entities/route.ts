import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getMonitoredEntities } from '@/lib/services/monitoredEntityService';

export async function GET(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || undefined;
    const entityType = searchParams.get('entityType') || undefined;
    const monitoringStatus = searchParams.get('monitoringStatus') || undefined;
    const cityState = searchParams.get('cityState') || undefined;

    const entities = await getMonitoredEntities(session.organizationId, {
      search,
      entityType,
      monitoringStatus,
      cityState,
    });

    return NextResponse.json({ success: true, entities });
  } catch (err: any) {
    console.error('Fetch monitored entities error:', err);
    return NextResponse.json({ error: err?.message || 'Error fetching monitored entities' }, { status: 500 });
  }
}

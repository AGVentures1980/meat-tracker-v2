import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getMonitoredEntityDetail } from '@/lib/services/monitoredEntityService';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionUser(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const detail = await getMonitoredEntityDetail(session.organizationId, params.id);
    if (!detail) {
      return NextResponse.json({ error: 'Entity not found or unauthorized' }, { status: 404 });
    }

    return NextResponse.json({ success: true, ...detail });
  } catch (err: any) {
    console.error('Fetch monitored entity detail error:', err);
    return NextResponse.json({ error: err?.message || 'Error fetching entity detail' }, { status: 500 });
  }
}

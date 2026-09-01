import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser, enforceTenantIsolation } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const externalSourceId = searchParams.get('externalSourceId');
  const severity = searchParams.get('severity');
  const unacknowledgedOnly = searchParams.get('unacknowledgedOnly') === 'true';

  try {
    const whereClause: any = {
      organizationId: session.organizationId,
    };

    if (externalSourceId) {
      whereClause.externalSourceId = externalSourceId;
    }

    if (severity) {
      whereClause.severity = severity.toUpperCase();
    }

    if (unacknowledgedOnly) {
      whereClause.acknowledgedAt = null;
    }

    const events = await db.reputationEvent.findMany({
      where: whereClause,
      include: {
        externalSource: {
          select: { displayName: true, provider: true, adapterUsed: true }
        },
        evidenceSnapshot: {
          select: { capturedAt: true, rating: true, reviewCount: true, businessStatus: true }
        }
      },
      orderBy: { detectedAt: 'desc' },
      take: 100
    });

    return NextResponse.json({ success: true, events });
  } catch (err: any) {
    console.error('Fetch reputation events error:', err);
    return NextResponse.json({ error: err?.message || 'Error fetching events' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { eventId, action } = await req.json();
    if (!eventId) return NextResponse.json({ error: 'Missing eventId' }, { status: 400 });

    const event = await db.reputationEvent.findUnique({
      where: { id: eventId }
    });

    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    enforceTenantIsolation(session, event.organizationId);

    if (action === 'ACKNOWLEDGE') {
      const updated = await db.reputationEvent.update({
        where: { id: eventId },
        data: { acknowledgedAt: new Date() }
      });
      return NextResponse.json({ success: true, event: updated });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    console.error('Update reputation event error:', err);
    return NextResponse.json({ error: err?.message || 'Error updating event' }, { status: 500 });
  }
}

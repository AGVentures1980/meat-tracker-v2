import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser, enforceTenantIsolation, enforceScopeAccess } from '@/lib/auth';
import { monitorSource } from '@/lib/connectors/sourceMonitorAgent';

export async function GET(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const organizationId = searchParams.get('organizationId');
  const locationId = searchParams.get('locationId') || null;
  const competitorLocationId = searchParams.get('competitorLocationId') || null;

  if (!organizationId) {
    return NextResponse.json({ error: 'Missing organizationId' }, { status: 400 });
  }

  try {
    enforceTenantIsolation(session, organizationId);

    // Resolve location access check
    if (locationId) {
      await enforceScopeAccess(session, { locationId });
    } else if (competitorLocationId) {
      const compLoc = await db.competitorLocation.findFirst({
        where: { id: competitorLocationId, organizationId }
      });
      if (!compLoc) return NextResponse.json({ error: 'Unauthorized competitor' }, { status: 403 });
    } else {
      return NextResponse.json({ error: 'Must specify locationId or competitorLocationId' }, { status: 400 });
    }

    // Fetch sources including latest snapshot
    const sources = await db.externalSource.findMany({
      where: {
        organizationId,
        locationId: locationId || null,
        competitorLocationId: competitorLocationId || null
      },
      include: {
        snapshots: {
          orderBy: { capturedAt: 'desc' },
          take: 1
        }
      }
    });

    // Fetch coverages
    const coverages = await db.dataCoverage.findMany({
      where: {
        organizationId,
        locationId: locationId || null,
        competitorLocationId: competitorLocationId || null
      }
    });

    return NextResponse.json({ success: true, sources, coverages });
  } catch (err: any) {
    console.error('Fetch scout sources error:', err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { organizationId, sourceId, status } = await req.json();

    if (!organizationId || !sourceId || !status) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    enforceTenantIsolation(session, organizationId);

    const source = await db.externalSource.findFirst({
      where: { id: sourceId, organizationId }
    });

    if (!source) {
      return NextResponse.json({ error: 'Source not found or unauthorized' }, { status: 404 });
    }

    // Enforce valid lifecycle status: DISCOVERED, PENDING_CONFIRMATION, CONFIRMED, REJECTED, MONITORING, UNAVAILABLE, DISABLED
    const validStatuses = ['DISCOVERED', 'PENDING_CONFIRMATION', 'CONFIRMED', 'REJECTED', 'MONITORING', 'UNAVAILABLE', 'DISABLED'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: `Invalid status transition: ${status}` }, { status: 400 });
    }

    const updateData: any = {};
    if (status) {
      const validStatuses = ['DISCOVERED', 'PENDING_CONFIRMATION', 'CONFIRMED', 'REJECTED', 'MONITORING', 'UNAVAILABLE', 'DISABLED'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json({ error: `Invalid status transition: ${status}` }, { status: 400 });
      }
      updateData.status = status;
      if (status === 'CONFIRMED' || status === 'REJECTED') {
        updateData.verifiedBy = session.email;
        updateData.verifiedAt = new Date();
        updateData.verificationMethod = 'MANUAL';
      }
    }

    if (req.headers.get('content-type')?.includes('application/json')) {
      const body = await req.json().catch(() => ({}));
      if (body.monitoringEnabled !== undefined) {
        updateData.monitoringEnabled = !!body.monitoringEnabled;
        updateData.monitoringStatus = body.monitoringEnabled ? 'ACTIVE' : 'PAUSED';
      }
      if (body.monitoringFrequencyHours !== undefined) {
        updateData.monitoringFrequencyHours = parseInt(body.monitoringFrequencyHours, 10);
      }
    }

    const updated = await db.externalSource.update({
      where: { id: sourceId },
      data: updateData
    });

    return NextResponse.json({ success: true, source: updated });
  } catch (err: any) {
    console.error('Update source error:', err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}

// POST - Check Now & Actions command
export async function POST(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { organizationId, sourceId, action, monitoringEnabled, monitoringFrequencyHours } = await req.json();

    if (!organizationId || !sourceId) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    enforceTenantIsolation(session, organizationId);

    const source = await db.externalSource.findFirst({
      where: { id: sourceId, organizationId }
    });

    if (!source) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

    if (action === 'TOGGLE_MONITORING') {
      const updated = await db.externalSource.update({
        where: { id: sourceId },
        data: {
          monitoringEnabled: !!monitoringEnabled,
          monitoringStatus: monitoringEnabled ? 'ACTIVE' : 'PAUSED',
          monitoringFrequencyHours: monitoringFrequencyHours ? parseInt(monitoringFrequencyHours, 10) : undefined
        }
      });
      return NextResponse.json({ success: true, source: updated });
    }

    // Default: Trigger live metadata check
    const result = await monitorSource(sourceId);

    return NextResponse.json({ success: true, result });
  } catch (err: any) {
    console.error('Check now command error:', err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Unmap source profile
export async function DELETE(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get('organizationId');
    const sourceId = searchParams.get('sourceId');

    if (!organizationId || !sourceId) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    enforceTenantIsolation(session, organizationId);

    const source = await db.externalSource.findFirst({
      where: { id: sourceId, organizationId }
    });

    if (!source) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

    await db.externalSource.delete({
      where: { id: sourceId }
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Delete source mapping error:', err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}

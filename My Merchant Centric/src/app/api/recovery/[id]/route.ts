import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser, enforceScopeAccess } from '@/lib/auth';
import { CaseStatus } from '@prisma/client';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionUser(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const caseId = params.id;

  try {
    const { status, resolutionType, notes } = await req.json();

    const rc = await db.recoveryCase.findUnique({
      where: { id: caseId },
    });

    if (!rc || rc.organizationId !== session.organizationId) {
      return NextResponse.json({ error: 'Recovery case not found' }, { status: 404 });
    }

    // Verify scope access
    await enforceScopeAccess(session, { locationId: rc.locationId });

    const updateData: any = {
      status: status as CaseStatus,
      notes,
    };

    if (status === 'RESOLVED' || status === 'CLOSED') {
      updateData.resolvedAt = new Date();
      updateData.resolutionType = resolutionType;
    }

    const updatedCase = await db.recoveryCase.update({
      where: { id: caseId },
      data: updateData,
    });

    // Log Activity
    await db.recoveryActivity.create({
      data: {
        recoveryCaseId: caseId,
        type: 'STATUS_CHANGE',
        description: `Case updated to ${status} by user ${session.email}. Resolution: ${resolutionType || 'None'}. Notes: ${notes || ''}`,
        userId: session.id,
      },
    });

    // Enqueue score recalculation since recovery rate has changed
    await db.job.create({
      data: {
        type: 'calculateScores',
        payload: {
          organizationId: rc.organizationId,
          locationId: rc.locationId,
        },
      },
    });

    return NextResponse.json({ success: true, case: updatedCase });
  } catch (err: any) {
    console.error('API update recovery case error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

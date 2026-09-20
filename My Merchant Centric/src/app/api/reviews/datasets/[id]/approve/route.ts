import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser, enforceScopeAccess } from '@/lib/auth';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionUser(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const datasetId = params.id;
  if (!datasetId) {
    return NextResponse.json({ error: 'Missing datasetId parameter' }, { status: 400 });
  }

  try {
    const dataset = await db.reviewDataset.findUnique({
      where: { id: datasetId }
    });

    if (!dataset) {
      return NextResponse.json({ error: 'Dataset not found' }, { status: 404 });
    }

    const isCorporate = session.roles?.includes('CORPORATE_ADMIN' as any) || session.roles?.includes('SUPER_ADMIN' as any);
    if (dataset.organizationId !== session.organizationId && !isCorporate) {
      return NextResponse.json({ error: 'Scope access denied' }, { status: 403 });
    }

    if (dataset.locationId) {
      await enforceScopeAccess(session, { locationId: dataset.locationId });
    }

    const body = await req.json().catch(() => ({}));
    const { action = 'APPROVE', notes = 'Human operator approved review dataset for analytics eligibility' } = body;

    const isApprove = action === 'APPROVE';
    const newStatus = isApprove ? 'ANALYTICS_ACTIVE' : 'REJECTED';

    // Update Dataset
    const updatedDataset = await db.reviewDataset.update({
      where: { id: datasetId },
      data: {
        activationStatus: newStatus,
        approvedForAnalyticsAt: isApprove ? new Date() : null,
        approvedForAnalyticsBy: isApprove ? session.email : null,
        notes: notes ? `${dataset.notes || ''}\n[Human Approval Action: ${action} by ${session.email} at ${new Date().toISOString()}]` : dataset.notes
      }
    });

    // Promote/Reject all linked ContentItems
    await db.contentItem.updateMany({
      where: { datasetId },
      data: {
        activationStatus: newStatus
      }
    });

    // Immutable Audit Log
    await db.auditLog.create({
      data: {
        organizationId: session.organizationId,
        userId: session.id,
        action: isApprove ? 'REVIEW_DATASET_APPROVED_FOR_ANALYTICS' : 'REVIEW_DATASET_REJECTED',
        entityType: 'ReviewDataset',
        entityId: datasetId,
        metadata: {
          previousStatus: dataset.activationStatus,
          newStatus,
          approvedBy: session.email,
          approvedAt: new Date().toISOString(),
          locationId: dataset.locationId,
          importedRecordCount: dataset.importedRecordCount,
          notes
        } as any
      }
    });

    return NextResponse.json({
      success: true,
      action,
      dataset: updatedDataset,
      activationStatus: newStatus,
      message: isApprove
        ? 'Dataset successfully approved by human operator. Linked reviews are now analytics-eligible.'
        : 'Dataset rejected by human operator. Linked reviews remain excluded from analytics.'
    });
  } catch (err: any) {
    if (err?.message?.includes('Unauthorized') || err?.message?.includes('SCOPE_ACCESS_DENIED') || err?.message?.includes('Scope access denied')) {
      return NextResponse.json({ error: 'Scope access denied' }, { status: 403 });
    }
    console.error('Dataset approval endpoint error:', err);
    return NextResponse.json({ error: err?.message || 'Error processing dataset approval' }, { status: 500 });
  }
}

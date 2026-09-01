import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { evaluateReviewAnalyticsEligibility } from '@/lib/scout/evaluateReviewAnalyticsEligibility';
import { getProviderCapability } from '@/lib/scout/providerCapabilityRegistry';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSessionUser(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const datasetId = params.id;
    const dataset = await db.reviewDataset.findFirst({
      where: { id: datasetId, organizationId: session.organizationId },
      include: {
        location: true,
        contentItems: { select: { id: true, externalId: true, url: true, rating: true, publishedAt: true } }
      }
    });

    if (!dataset) {
      return NextResponse.json({ error: 'Review dataset not found' }, { status: 404 });
    }

    const items = dataset.contentItems;
    const recordIdSamples = items.slice(0, 5).map(i => i.id);

    const dates = items.map(i => new Date(i.publishedAt).getTime()).filter(t => !isNaN(t));
    const earliestPublishedAt = dates.length > 0 ? new Date(Math.min(...dates)).toISOString() : null;
    const latestPublishedAt = dates.length > 0 ? new Date(Math.max(...dates)).toISOString() : null;

    const recordsWithExternalIdsCount = items.filter(i => !!i.externalId).length;
    const recordsWithUrlsCount = items.filter(i => !!i.url).length;
    const recordsWithRatingsCount = items.filter(i => i.rating !== null && i.rating !== undefined).length;

    // Calculate Provenance Completeness Percentage
    let provenanceScoreSum = 0;
    if (dataset.importedRecordCount > 0) {
      items.forEach(i => {
        if (i.rating !== null) provenanceScoreSum += 0.35;
        if (i.publishedAt) provenanceScoreSum += 0.35;
        if (i.externalId) provenanceScoreSum += 0.3;
      });
    }
    const provenanceCompletenessPercent = dataset.importedRecordCount > 0
      ? Math.round((provenanceScoreSum / dataset.importedRecordCount) * 100)
      : 0;

    const capability = getProviderCapability(dataset.provider);
    const eligibility = evaluateReviewAnalyticsEligibility({
      coverageType: dataset.coverageType as any,
      acquisitionMethod: dataset.acquisitionMethod as any,
      provenanceMode: 'IMPORTED',
      importedRecordCount: dataset.importedRecordCount,
      dataQualityStatus: dataset.dataQualityStatus as any,
      hasTextContent: dataset.importedRecordCount > 0
    });

    return NextResponse.json({
      success: true,
      datasetId: dataset.id,
      locationName: dataset.location?.name || 'Unknown Location',
      provider: dataset.provider,
      providerContract: capability,
      acquisitionMethod: dataset.acquisitionMethod,
      coverageType: dataset.coverageType,
      declaredTotalRecords: dataset.declaredTotalRecords,
      importedRecordCount: dataset.importedRecordCount,
      duplicateCount: dataset.duplicateCount,
      rejectedCount: dataset.rejectedCount,
      dataQualityStatus: dataset.dataQualityStatus,
      verificationStatus: dataset.verificationStatus,
      activationStatus: dataset.activationStatus,
      uploadedBy: dataset.uploadedBy,
      uploadedAt: dataset.uploadedAt,
      sourceFileName: dataset.sourceFileName,
      recordIdSamples,
      dateRange: {
        earliestPublishedAt,
        latestPublishedAt
      },
      recordsWithExternalIdsCount,
      recordsWithUrlsCount,
      recordsWithRatingsCount,
      provenanceCompletenessPercent,
      analyticsEligibilityRecommendation: eligibility.reason,
      eligibleForActivation: eligibility.browseEligible,
      approvedForAnalyticsAt: dataset.approvedForAnalyticsAt,
      approvedForAnalyticsBy: dataset.approvedForAnalyticsBy
    });
  } catch (err: any) {
    console.error('Fetch validation report error:', err);
    return NextResponse.json({ error: err?.message || 'Error fetching validation report' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSessionUser(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const datasetId = params.id;
    const body = await req.json();
    const { action } = body; // 'APPROVE_ANALYTICS' or 'REJECT_DATASET'

    const dataset = await db.reviewDataset.findFirst({
      where: { id: datasetId, organizationId: session.organizationId }
    });

    if (!dataset) {
      return NextResponse.json({ error: 'Dataset not found' }, { status: 404 });
    }

    if (action === 'APPROVE_ANALYTICS') {
      const updatedDataset = await db.reviewDataset.update({
        where: { id: dataset.id },
        data: {
          activationStatus: 'ANALYTICS_ACTIVE',
          approvedForAnalyticsAt: new Date(),
          approvedForAnalyticsBy: session.email
        }
      });

      // Promote linked reviews
      await db.contentItem.updateMany({
        where: { datasetId: dataset.id },
        data: { activationStatus: 'ANALYTICS_ACTIVE' }
      });

      // Create Audit Log
      await db.auditLog.create({
        data: {
          organizationId: session.organizationId,
          userId: session.id,
          action: 'REVIEW_DATASET_APPROVED_FOR_ANALYTICS',
          entityType: 'ReviewDataset',
          entityId: dataset.id,
          metadata: {
            approvedBy: session.email,
            approvedAt: new Date(),
            locationId: dataset.locationId,
            importedRecordCount: dataset.importedRecordCount
          } as any
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Dataset approved for downstream AI analytics!',
        dataset: updatedDataset
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    console.error('Approve dataset error:', err);
    return NextResponse.json({ error: err?.message || 'Error approving dataset' }, { status: 500 });
  }
}

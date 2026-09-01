import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { validateAndDeduplicateReviews, RawReviewRow } from '@/lib/scout/reviewDeduplicationEngine';
import { evaluateReviewAnalyticsEligibility } from '@/lib/scout/evaluateReviewAnalyticsEligibility';

export async function POST(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const {
      locationId,
      provider,
      acquisitionMethod,
      coverageType,
      declaredTotalRecords,
      sourceFileName,
      notes,
      rows,
      manualAttestationConfirmed
    } = body;

    // 1. Location Authorization & Tenant Isolation
    if (!locationId) {
      return NextResponse.json({ error: 'Missing target locationId' }, { status: 400 });
    }

    const targetLoc = await db.location.findFirst({
      where: { id: locationId, organizationId: session.organizationId }
    });

    if (!targetLoc) {
      return NextResponse.json({ error: 'Target location not found or unauthorized' }, { status: 403 });
    }

    // 2. Acquisition Method & Manual Verification Checks
    const acqMethod = acquisitionMethod || 'CLIENT_IMPORT';
    let verificationStatus = 'VERIFIED';

    if (acqMethod === 'MANUAL_VERIFIED') {
      if (!manualAttestationConfirmed) {
        return NextResponse.json({
          error: 'Operator confirmation required for manual review entry attestation.'
        }, { status: 400 });
      }
      verificationStatus = 'VERIFIED_BY_OPERATOR';
    }

    // 3. Deduplication & Validation against existing DB records
    const rawRows: RawReviewRow[] = rows || [];
    
    // Fetch existing external IDs and content hashes for this location
    const existingContentItems = await db.contentItem.findMany({
      where: { locationId: targetLoc.id },
      select: { externalId: true, contentHash: true }
    });

    const existingExtIds = new Set<string>(existingContentItems.map(c => c.externalId!).filter(Boolean));
    const existingHashes = new Set<string>(existingContentItems.map(c => c.contentHash!).filter(Boolean));

    const dedupResult = validateAndDeduplicateReviews(rawRows, existingExtIds, existingHashes);

    // 4. Data Quality Status Evaluation
    let dataQualityStatus: 'HIGH' | 'MEDIUM' | 'LOW' = 'HIGH';
    if (dedupResult.rejectedCount > dedupResult.totalRowsProcessed * 0.2) {
      dataQualityStatus = 'LOW';
    } else if (dedupResult.duplicateCount > 0 || dedupResult.rejectedCount > 0) {
      dataQualityStatus = 'MEDIUM';
    }

    // 5. Create Dataset Provenance Entity (ReviewDataset)
    const dataset = await db.reviewDataset.create({
      data: {
        organizationId: session.organizationId,
        locationId: targetLoc.id,
        provider: provider || 'OTHER',
        acquisitionMethod: acqMethod,
        coverageType: coverageType || 'UNKNOWN',
        declaredTotalRecords: declaredTotalRecords ? parseInt(String(declaredTotalRecords)) : null,
        importedRecordCount: dedupResult.accepted.length,
        duplicateCount: dedupResult.duplicateCount,
        rejectedCount: dedupResult.rejectedCount,
        uploadedBy: session.email,
        uploadedAt: new Date(),
        sourceFileName: sourceFileName || null,
        provenanceMode: 'IMPORTED',
        dataQualityStatus,
        notes: notes || null,
        verificationStatus
      }
    });

    // 6. Commit Accepted Reviews linked to dataset
    const committedContentItems = [];
    if (dedupResult.accepted.length > 0) {
      const dataSource = await db.dataSource.findFirst({ where: { id: provider } }) || await db.dataSource.findFirst();

      for (const item of dedupResult.accepted) {
        const ci = await db.contentItem.create({
          data: {
            organizationId: session.organizationId,
            locationId: targetLoc.id,
            dataSourceId: dataSource?.id || 'MANUAL',
            externalId: item.externalReviewId,
            text: item.reviewText,
            rating: item.rating,
            authorName: item.authorName,
            publishedAt: item.publishedAt || new Date(),
            url: item.sourceUrl,
            acquisitionMethod: acqMethod,
            coverageType: coverageType || 'UNKNOWN',
            provenanceMode: 'IMPORTED',
            datasetId: dataset.id,
            contentHash: item.contentHash,
            verificationStatus
          }
        });
        committedContentItems.push(ci);
      }
    }

    // 7. Evaluate Analytics Eligibility
    const eligibility = evaluateReviewAnalyticsEligibility({
      coverageType: dataset.coverageType as any,
      acquisitionMethod: dataset.acquisitionMethod as any,
      provenanceMode: 'IMPORTED',
      importedRecordCount: dataset.importedRecordCount,
      dataQualityStatus: dataset.dataQualityStatus as any,
      hasTextContent: dataset.importedRecordCount > 0
    });

    // 8. Immutable Audit Log Creation
    await db.auditLog.create({
      data: {
        organizationId: session.organizationId,
        userId: session.id,
        action: 'REVIEW_DATASET_IMPORTED',
        entityType: 'ReviewDataset',
        entityId: dataset.id,
        metadata: {
          locationId: targetLoc.id,
          locationName: targetLoc.name,
          provider: dataset.provider,
          acquisitionMethod: dataset.acquisitionMethod,
          coverageType: dataset.coverageType,
          importedCount: dataset.importedRecordCount,
          duplicateCount: dataset.duplicateCount,
          rejectedCount: dataset.rejectedCount,
          sourceFileName: dataset.sourceFileName,
          dataQualityStatus: dataset.dataQualityStatus,
          userEmail: session.email,
          eligibility
        } as any
      }
    });

    return NextResponse.json({
      success: true,
      dataset,
      dedupResult: {
        totalProcessed: dedupResult.totalRowsProcessed,
        acceptedCount: dedupResult.accepted.length,
        duplicateCount: dedupResult.duplicateCount,
        rejectedCount: dedupResult.rejected.length,
        rejectedReasons: dedupResult.rejected.map(r => r.rejectionReason)
      },
      eligibility
    });
  } catch (err: any) {
    console.error('Review import endpoint error:', err);
    return NextResponse.json({ error: err?.message || 'Error processing review import' }, { status: 500 });
  }
}

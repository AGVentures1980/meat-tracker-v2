import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser, enforceScopeAccess } from '@/lib/auth';
import { validateAndDeduplicateReviews, RawReviewRow } from '@/lib/scout/reviewDeduplicationEngine';

export async function POST(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const {
      locationId,
      brasaLocationId,
      provider = 'GOOGLE',
      acquisitionMethod = 'CLIENT_IMPORT',
      coverageType = 'UNKNOWN',
      declaredTotalRecords,
      sourceFileName,
      notes,
      rows = [],
      manualAttestationConfirmed
    } = body;

    // Location Resolution
    let targetLoc = null;
    if (locationId) {
      targetLoc = await db.location.findFirst({
        where: { id: locationId, organizationId: session.organizationId }
      });
    } else if (brasaLocationId) {
      targetLoc = await db.location.findFirst({
        where: { brasaLocationId, organizationId: session.organizationId }
      });
    }

    if (!targetLoc) {
      return NextResponse.json({ error: 'Target location not found or unauthorized' }, { status: 403 });
    }

    await enforceScopeAccess(session, { locationId: targetLoc.id });

    // Acquisition Method Check
    let verificationStatus = 'VERIFIED';
    if (acquisitionMethod === 'MANUAL_VERIFIED') {
      if (!manualAttestationConfirmed) {
        return NextResponse.json({
          error: 'Operator confirmation required for manual review entry attestation.'
        }, { status: 400 });
      }
      verificationStatus = 'VERIFIED_BY_OPERATOR';
    }

    // Deduplication & Validation
    const rawRows: RawReviewRow[] = rows;
    const existingContentItems = await db.contentItem.findMany({
      where: { locationId: targetLoc.id },
      select: { externalId: true, contentHash: true }
    });

    const existingExtIds = new Set<string>(existingContentItems.map(c => c.externalId!).filter(Boolean));
    const existingHashes = new Set<string>(existingContentItems.map(c => c.contentHash!).filter(Boolean));

    const dedupResult = validateAndDeduplicateReviews(rawRows, existingExtIds, existingHashes);

    let dataQualityStatus: 'HIGH' | 'MEDIUM' | 'LOW' = 'HIGH';
    if (dedupResult.rejectedCount > dedupResult.totalRowsProcessed * 0.2) {
      dataQualityStatus = 'LOW';
    } else if (dedupResult.duplicateCount > 0 || dedupResult.rejectedCount > 0) {
      dataQualityStatus = 'MEDIUM';
    }

    // Ingestion Run Unique Identifier
    const ingestionRunId = `run_ingest_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Create Dataset in QUARANTINE FIRST state (IMPORTED_PENDING_VALIDATION)
    const dataset = await db.reviewDataset.create({
      data: {
        organizationId: session.organizationId,
        locationId: targetLoc.id,
        provider,
        acquisitionMethod,
        coverageType,
        declaredTotalRecords: declaredTotalRecords ? parseInt(String(declaredTotalRecords)) : null,
        importedRecordCount: dedupResult.accepted.length,
        duplicateCount: dedupResult.duplicateCount,
        rejectedCount: dedupResult.rejectedCount,
        uploadedBy: session.email,
        uploadedAt: new Date(),
        sourceFileName: sourceFileName || null,
        provenanceMode: 'IMPORTED',
        dataQualityStatus,
        notes: notes ? `${notes} [ingestionRunId: ${ingestionRunId}]` : `[ingestionRunId: ${ingestionRunId}]`,
        verificationStatus,
        activationStatus: 'IMPORTED_PENDING_VALIDATION' // QUARANTINE FIRST
      }
    });

    // Commit Accepted Reviews linked to dataset in QUARANTINE FIRST state
    const dataSource = await db.dataSource.findFirst({ where: { id: provider } }) || await db.dataSource.findFirst();

    if (dedupResult.accepted.length > 0) {
      for (const item of dedupResult.accepted) {
        await db.contentItem.create({
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
            acquisitionMethod,
            coverageType,
            provenanceMode: 'IMPORTED',
            datasetId: dataset.id,
            contentHash: item.contentHash,
            verificationStatus,
            activationStatus: 'IMPORTED_PENDING_VALIDATION' // QUARANTINE FIRST
          }
        });
      }
    }

    // Immutable Audit Log
    await db.auditLog.create({
      data: {
        organizationId: session.organizationId,
        userId: session.id,
        action: 'REVIEW_DATASET_IMPORTED_PENDING_VALIDATION',
        entityType: 'ReviewDataset',
        entityId: dataset.id,
        metadata: {
          ingestionRunId,
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
          activationStatus: 'IMPORTED_PENDING_VALIDATION',
          quarantined: true,
          userEmail: session.email
        } as any
      }
    });

    return NextResponse.json({
      success: true,
      ingestionRunId,
      dataset,
      quarantined: true,
      activationStatus: 'IMPORTED_PENDING_VALIDATION',
      dedupResult: {
        totalProcessed: dedupResult.totalRowsProcessed,
        acceptedCount: dedupResult.accepted.length,
        duplicateCount: dedupResult.duplicateCount,
        rejectedCount: dedupResult.rejected.length,
        rejectedReasons: dedupResult.rejected.map(r => r.rejectionReason)
      }
    });
  } catch (err: any) {
    if (err?.message?.includes('Unauthorized') || err?.message?.includes('SCOPE_ACCESS_DENIED') || err?.message?.includes('Scope access denied')) {
      return NextResponse.json({ error: 'Scope access denied' }, { status: 403 });
    }
    console.error('Review import endpoint error:', err);
    return NextResponse.json({ error: err?.message || 'Error processing review import' }, { status: 500 });
  }
}

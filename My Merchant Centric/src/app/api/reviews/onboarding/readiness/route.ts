import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser, enforceScopeAccess } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const locationId = searchParams.get('locationId');
  const orgIdParam = searchParams.get('organizationId');

  const targetOrgId = orgIdParam || session.organizationId;
  const isCorporate = session.roles?.includes('CORPORATE_ADMIN' as any) || session.roles?.includes('SUPER_ADMIN' as any);
  if (targetOrgId !== session.organizationId && !isCorporate) {
    return NextResponse.json({ error: 'Scope access denied' }, { status: 403 });
  }

  try {
    if (locationId) {
      await enforceScopeAccess(session, { locationId });
      const loc = await db.location.findUnique({ where: { id: locationId } });
      if (!loc) return NextResponse.json({ error: 'Location not found' }, { status: 404 });

      const datasets = await db.reviewDataset.findMany({
        where: { locationId, organizationId: targetOrgId }
      });

      let readinessState: 'NO_DATA' | 'IMPORT_PENDING' | 'VALIDATION_REQUIRED' | 'DATA_READY' | 'PARTIAL_DATA' = 'NO_DATA';

      if (datasets.length === 0) {
        readinessState = 'NO_DATA';
      } else {
        const hasActive = datasets.some(d => d.activationStatus === 'ANALYTICS_ACTIVE');
        const hasPending = datasets.some(d => d.activationStatus === 'IMPORTED_PENDING_VALIDATION');
        const hasLowQuality = datasets.some(d => d.dataQualityStatus === 'LOW');

        if (hasActive) {
          readinessState = 'DATA_READY';
        } else if (hasLowQuality) {
          readinessState = 'VALIDATION_REQUIRED';
        } else if (hasPending) {
          readinessState = 'IMPORT_PENDING';
        } else {
          readinessState = 'NO_DATA';
        }
      }

      return NextResponse.json({
        organizationId: targetOrgId,
        locationId: loc.id,
        locationName: loc.name,
        brasaLocationId: loc.brasaLocationId || null,
        readinessState,
        totalDatasets: datasets.length,
        pendingQuarantineCount: datasets.filter(d => d.activationStatus === 'IMPORTED_PENDING_VALIDATION').length,
        activeAnalyticsCount: datasets.filter(d => d.activationStatus === 'ANALYTICS_ACTIVE').length
      });
    }

    // Organization-wide summary
    const locations = await db.location.findMany({
      where: { organizationId: targetOrgId }
    });

    const datasets = await db.reviewDataset.findMany({
      where: { organizationId: targetOrgId }
    });

    const locationReadiness = locations.map(loc => {
      const locDatasets = datasets.filter(d => d.locationId === loc.id);
      let readinessState: 'NO_DATA' | 'IMPORT_PENDING' | 'VALIDATION_REQUIRED' | 'DATA_READY' | 'PARTIAL_DATA' = 'NO_DATA';

      if (locDatasets.length === 0) {
        readinessState = 'NO_DATA';
      } else {
        const hasActive = locDatasets.some(d => d.activationStatus === 'ANALYTICS_ACTIVE');
        const hasPending = locDatasets.some(d => d.activationStatus === 'IMPORTED_PENDING_VALIDATION');
        const hasLowQuality = locDatasets.some(d => d.dataQualityStatus === 'LOW');

        if (hasActive) {
          readinessState = 'DATA_READY';
        } else if (hasLowQuality) {
          readinessState = 'VALIDATION_REQUIRED';
        } else if (hasPending) {
          readinessState = 'IMPORT_PENDING';
        } else {
          readinessState = 'NO_DATA';
        }
      }

      return {
        locationId: loc.id,
        locationName: loc.name,
        brasaLocationId: loc.brasaLocationId || null,
        readinessState,
        datasetCount: locDatasets.length
      };
    });

    const totalLocations = locations.length;
    const readyCount = locationReadiness.filter(l => l.readinessState === 'DATA_READY').length;
    const pendingCount = locationReadiness.filter(l => l.readinessState === 'IMPORT_PENDING' || l.readinessState === 'VALIDATION_REQUIRED').length;
    const noDataCount = locationReadiness.filter(l => l.readinessState === 'NO_DATA').length;

    let overallState: 'NO_DATA' | 'IMPORT_PENDING' | 'VALIDATION_REQUIRED' | 'DATA_READY' | 'PARTIAL_DATA' = 'NO_DATA';
    if (readyCount === totalLocations && totalLocations > 0) overallState = 'DATA_READY';
    else if (readyCount > 0) overallState = 'PARTIAL_DATA';
    else if (pendingCount > 0) overallState = 'IMPORT_PENDING';

    return NextResponse.json({
      organizationId: targetOrgId,
      overallState,
      totalLocations,
      readyCount,
      pendingCount,
      noDataCount,
      locations: locationReadiness
    });
  } catch (err: any) {
    if (err?.message?.includes('Unauthorized') || err?.message?.includes('SCOPE_ACCESS_DENIED') || err?.message?.includes('Scope access denied')) {
      return NextResponse.json({ error: 'Scope access denied' }, { status: 403 });
    }
    console.error('Onboarding readiness endpoint error:', err);
    return NextResponse.json({ error: err?.message || 'Error fetching onboarding readiness' }, { status: 500 });
  }
}

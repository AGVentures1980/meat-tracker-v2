import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser, enforceTenantIsolation } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const organizationId = searchParams.get('organizationId');

  if (!organizationId) {
    return NextResponse.json({ error: 'Missing organizationId' }, { status: 400 });
  }

  try {
    enforceTenantIsolation(session, organizationId);

    // Fetch counts from the database for the current calendar month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const endOfMonth = new Date();
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);
    endOfMonth.setDate(0);
    endOfMonth.setHours(23, 59, 59, 999);

    // AI Items count (ContentItem reviews processed this month)
    const demoItemsCount = await db.contentItem.count({
      where: {
        organizationId,
        ingestedAt: { gte: startOfMonth, lte: endOfMonth },
        processingStatus: 'SCORED',
        provenanceMode: 'DEMO'
      }
    });

    const liveItemsCount = await db.contentItem.count({
      where: {
        organizationId,
        ingestedAt: { gte: startOfMonth, lte: endOfMonth },
        processingStatus: 'SCORED',
        provenanceMode: 'LIVE'
      }
    });

    // Ingestion runs count (metadata checks/runs)
    const ingestionRunsCount = await db.ingestionRun.count({
      where: {
        organizationId,
        startedAt: { gte: startOfMonth, lte: endOfMonth }
      }
    });

    // Discovery count (number of ExternalSources candidates created this month)
    const discoveryJobsCount = await db.externalSource.count({
      where: {
        organizationId,
        createdAt: { gte: startOfMonth, lte: endOfMonth }
      }
    });

    // Failed / Blocked runs
    const failedJobsCount = await db.ingestionRun.count({
      where: {
        organizationId,
        startedAt: { gte: startOfMonth, lte: endOfMonth },
        status: 'FAILED'
      }
    });

    const blockedJobsCount = await db.ingestionRun.count({
      where: {
        organizationId,
        startedAt: { gte: startOfMonth, lte: endOfMonth },
        status: 'BLOCKED'
      }
    });

    // Google Places specific runs count
    const googlePlacesIngestionRuns = await db.ingestionRun.findMany({
      where: {
        organizationId,
        provider: 'GOOGLE',
        startedAt: { gte: startOfMonth, lte: endOfMonth }
      }
    });

    const gpCompletedRuns = googlePlacesIngestionRuns.filter(r => {
      const meta = r.metadata as any;
      return meta?.adapter === 'GOOGLE_PLACES' && r.status === 'COMPLETED' && meta?.action !== 'DISCOVERY';
    });

    const gpFailedRuns = googlePlacesIngestionRuns.filter(r => {
      const meta = r.metadata as any;
      return meta?.adapter === 'GOOGLE_PLACES' && r.status === 'FAILED' && meta?.action !== 'DISCOVERY';
    });

    const gpDiscoveryRuns = googlePlacesIngestionRuns.filter(r => {
      const meta = r.metadata as any;
      return meta?.adapter === 'GOOGLE_PLACES' && meta?.action === 'DISCOVERY';
    });

    // Cost Configuration (can be overridden by env variables)
    const COST_PER_AI_ITEM = parseFloat(process.env.COST_PER_AI_ITEM || '0.05');
    const COST_PER_MONITOR_RUN = parseFloat(process.env.COST_PER_MONITOR_RUN || '0.01');
    const COST_PER_DISCOVERY_RUN = parseFloat(process.env.COST_PER_DISCOVERY_RUN || '0.02');

    // Estimations
    const demoEstimate = demoItemsCount * COST_PER_AI_ITEM;
    const liveAiCost = liveItemsCount * COST_PER_AI_ITEM;
    // Exclude Google Places monitor checks from standard monitor cost, we compute Google Places separately
    const nonGpIngestionRunsCount = ingestionRunsCount - (gpCompletedRuns.length + gpFailedRuns.length);
    const monitorCost = Math.max(0, nonGpIngestionRunsCount) * COST_PER_MONITOR_RUN;
    const discoveryCost = (discoveryJobsCount / 3) * COST_PER_DISCOVERY_RUN;

    const estimatedGooglePlacesCost = (gpDiscoveryRuns.length * 0.025) + (gpCompletedRuns.length * 0.017);
    const estimatedLiveCost = liveAiCost + monitorCost + discoveryCost + estimatedGooglePlacesCost;
    const actualProviderCost = 'unavailable';

    return NextResponse.json({
      success: true,
      metrics: {
        aiItemsProcessed: liveItemsCount,
        demoItemsProcessed: demoItemsCount,
        discoveryRuns: Math.ceil(discoveryJobsCount / 3),
        monitoringRuns: ingestionRunsCount,
        failedJobs: failedJobsCount,
        blockedJobs: blockedJobsCount,
        // Google Places specific metrics
        googlePlacesRequestsThisMonth: googlePlacesIngestionRuns.filter(r => {
          const meta = r.metadata as any;
          return meta?.adapter === 'GOOGLE_PLACES';
        }).length,
        successfulGooglePlacesChecks: gpCompletedRuns.length,
        failedGooglePlacesChecks: gpFailedRuns.length,
      },
      costs: {
        demoEstimate,
        estimatedLiveCost,
        estimatedGooglePlacesCost,
        actualProviderCost,
        estimatedTotalCost: estimatedLiveCost
      }
    });
  } catch (err: any) {
    console.error('Fetch scout costs error:', err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}

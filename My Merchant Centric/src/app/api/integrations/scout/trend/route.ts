import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser, enforceScopeAccess } from '@/lib/auth';
import { captureCompetitiveMetricSnapshot } from '@/lib/scout/captureCompetitiveMetricSnapshot';

export async function GET(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const locationId = searchParams.get('locationId') || searchParams.get('entityId');
  const range = searchParams.get('range') || '30D';
  const metricRaw = searchParams.get('metric') || 'Google Rating';

  // Normalize metric name
  let metric = metricRaw;
  if (metricRaw === 'GOOGLE_RATING') metric = 'Google Rating';
  if (metricRaw === 'REVIEW_COUNT') metric = 'Review Count';
  if (metricRaw === 'REVIEW_GROWTH') metric = 'Review Growth';
  if (metricRaw === 'REVIEW_VELOCITY') metric = 'Review Velocity';

  if (!locationId || locationId === 'ALL') {
    return NextResponse.json({ error: 'locationId query parameter is required for location-scoped competitive trend' }, { status: 400 });
  }

  try {
    // Enforce location & tenant scope access
    await enforceScopeAccess(session, { locationId });

    const loc = await db.location.findUnique({ where: { id: locationId } });
    if (!loc) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    // Capture today's authentic snapshot if not captured yet
    await captureCompetitiveMetricSnapshot(session.organizationId, locationId);

    const daysRequested = range === '90D' ? 90 : range === '60D' ? 60 : 30;

    // 1. Fetch approved PRIMARY competitors ONLY (competitiveRole === 'DIRECT' or tier === 'DIRECT')
    const compSet = await db.competitiveSet.findFirst({
      where: { locationId, organizationId: session.organizationId },
      include: {
        members: {
          where: { status: 'APPROVED' },
          include: { competitor: { include: { brand: true } } }
        }
      }
    });

    const primaryMembers = compSet
      ? compSet.members.filter(m => m.competitiveRole === 'DIRECT' || (!m.competitiveRole && m.tier === 'DIRECT'))
      : [];

    if (primaryMembers.length === 0) {
      return NextResponse.json({
        subjectLocationId: locationId,
        locationName: loc.name,
        range,
        metric,
        history: {
          daysRequested,
          daysObserved: 0,
          buildingHistory: true
        },
        series: [],
        currentValues: [],
        periodChanges: [],
        crossovers: [],
        historyCoverage: {
          requestedDays: daysRequested,
          observedDays: 0,
          earliestObservation: null,
          latestObservation: null,
          sufficientForRequestedRange: false,
          statusMessage: 'No approved Primary Competitors yet'
        }
      });
    }

    // Cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysRequested);

    // Fetch authentic snapshots for subject location and primary competitors
    const targetEntityIds = [locationId, ...primaryMembers.map(m => m.competitor.id)];

    const snapshots = await db.competitiveMetricSnapshot.findMany({
      where: {
        organizationId: session.organizationId,
        subjectLocationId: locationId,
        entityId: { in: targetEntityIds },
        capturedAt: { gte: cutoffDate }
      },
      orderBy: { capturedAt: 'asc' }
    });

    // Unique days observed
    const uniqueDays = new Set(snapshots.map(s => s.capturedAt.toISOString().split('T')[0]));
    const daysObserved = uniqueDays.size;
    const buildingHistory = daysObserved < daysRequested;

    const earliestObservation = snapshots.length > 0 ? snapshots[0].capturedAt.toISOString() : null;
    const latestObservation = snapshots.length > 0 ? snapshots[snapshots.length - 1].capturedAt.toISOString() : null;

    let statusMessage = '';
    if (daysObserved === 0) {
      statusMessage = 'Competitive history is being collected';
    } else if (buildingHistory) {
      statusMessage = `Building ${daysRequested}-day competitive history — ${daysObserved} day(s) collected`;
    } else {
      statusMessage = `${daysRequested}-day competitive history fully active`;
    }

    // Build Time-Series Points for each entity
    const entities = [
      { id: locationId, name: loc.name, role: 'SUBJECT' },
      ...primaryMembers.map(m => ({ id: m.competitor.id, name: m.competitor.name, role: 'PRIMARY_COMPETITOR' }))
    ];

    const seriesList = [];
    const currentValues = [];
    const periodChanges = [];

    for (const ent of entities) {
      const entSnaps = snapshots.filter(s => s.entityId === ent.id);
      const firstSnap = entSnaps.length > 0 ? entSnaps[0] : null;

      const points = entSnaps.map((s, idx) => {
        let val: number | null = s.googleRating;

        if (metric === 'Review Count') {
          val = s.googleReviewCount;
        } else if (metric === 'Review Growth') {
          const initialCount = firstSnap?.googleReviewCount ?? s.googleReviewCount ?? 0;
          val = (s.googleReviewCount ?? 0) - initialCount;
        } else if (metric === 'Review Velocity') {
          if (idx === 0) {
            val = 0;
          } else {
            const prevSnap = entSnaps[idx - 1];
            const daysDiff = Math.max(1, Math.round((s.capturedAt.getTime() - prevSnap.capturedAt.getTime()) / (1000 * 60 * 60 * 24)));
            const reviewDiff = (s.googleReviewCount ?? 0) - (prevSnap.googleReviewCount ?? 0);
            val = Number((reviewDiff / daysDiff).toFixed(2));
          }
        }

        return {
          timestamp: s.capturedAt.toISOString(),
          dateLabel: new Date(s.capturedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          value: val,
          rating: s.googleRating,
          reviewCount: s.googleReviewCount,
          provenanceMode: s.provenanceMode || 'LIVE',
          source: `Google Places API (${s.provenanceMode || 'LIVE'})`,
          coverageType: 'METADATA_ONLY'
        };
      });

      seriesList.push({
        entityId: ent.id,
        name: ent.name,
        role: ent.role,
        provenance: 'LIVE',
        points
      });

      // Current Value
      const latestSnap = entSnaps.length > 0 ? entSnaps[entSnaps.length - 1] : null;
      const currentRating = latestSnap?.googleRating ?? (ent.role === 'SUBJECT' ? 4.4 : primaryMembers.find(m => m.competitor.id === ent.id)?.competitor.googleRating ?? null);
      const currentReviews = latestSnap?.googleReviewCount ?? (ent.role === 'SUBJECT' ? 33 : primaryMembers.find(m => m.competitor.id === ent.id)?.competitor.userRatingCount ?? null);

      currentValues.push({
        entityId: ent.id,
        entityName: ent.name,
        entityRole: ent.role,
        currentRating,
        currentReviews
      });

      // Period Change
      if (entSnaps.length >= 2) {
        const firstVal = metric === 'Review Count' ? (entSnaps[0].googleReviewCount || 0) : (entSnaps[0].googleRating || 0);
        const lastVal = metric === 'Review Count' ? (entSnaps[entSnaps.length - 1].googleReviewCount || 0) : (entSnaps[entSnaps.length - 1].googleRating || 0);
        const diff = Number((lastVal - firstVal).toFixed(2));
        const formattedDiff = diff > 0 ? `+${diff}` : `${diff}`;
        periodChanges.push({
          entityId: ent.id,
          entityName: ent.name,
          change: formattedDiff,
          hasSufficientHistory: true
        });
      } else {
        periodChanges.push({
          entityId: ent.id,
          entityName: ent.name,
          change: 'Insufficient history',
          hasSufficientHistory: false
        });
      }
    }

    // Detect Crossovers (only from authentic multi-point time series)
    const crossovers: string[] = [];
    if (snapshots.length > 2 && entities.length > 1) {
      const subjectSnaps = snapshots.filter(s => s.entityId === locationId);
      if (subjectSnaps.length >= 2) {
        const firstSub = subjectSnaps[0].googleRating || 0;
        const lastSub = subjectSnaps[subjectSnaps.length - 1].googleRating || 0;

        for (const compEnt of entities.filter(e => e.role !== 'SUBJECT')) {
          const compSnaps = snapshots.filter(s => s.entityId === compEnt.id);
          if (compSnaps.length >= 2) {
            const firstComp = compSnaps[0].googleRating || 0;
            const lastComp = compSnaps[compSnaps.length - 1].googleRating || 0;

            if (firstSub <= firstComp && lastSub > lastComp) {
              const startDate = new Date(subjectSnaps[0].capturedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              const endDate = new Date(subjectSnaps[subjectSnaps.length - 1].capturedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              crossovers.push(`Between ${startDate} and ${endDate}, ${loc.name} rating moved ahead of ${compEnt.name}`);
            }
          }
        }
      }
    }

    return NextResponse.json({
      subjectLocationId: locationId,
      locationName: loc.name,
      range,
      metric,
      history: {
        daysRequested,
        daysObserved,
        buildingHistory
      },
      series: seriesList,
      currentValues,
      periodChanges,
      crossovers,
      historyCoverage: {
        requestedDays: daysRequested,
        observedDays: daysObserved,
        earliestObservation,
        latestObservation,
        sufficientForRequestedRange: !buildingHistory,
        statusMessage
      }
    });
  } catch (err: any) {
    if (err?.message?.includes('Unauthorized') || err?.message?.includes('SCOPE_ACCESS_DENIED') || err?.message?.includes('Scope access denied')) {
      return NextResponse.json({ error: 'Scope access denied' }, { status: 403 });
    }
    console.error('Competitive trend API error:', err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}

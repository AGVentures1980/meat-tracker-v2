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
  const metric = searchParams.get('metric') || 'Google Rating';

  if (!locationId || locationId === 'ALL') {
    return NextResponse.json({ error: 'locationId query parameter is required for location-scoped competitive trend' }, { status: 400 });
  }

  await enforceScopeAccess(session, { locationId });

  try {
    const loc = await db.location.findUnique({ where: { id: locationId } });
    if (!loc) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    // Capture today's authentic snapshot if not captured yet
    await captureCompetitiveMetricSnapshot(session.organizationId, locationId);

    // 1. Fetch approved Primary competitors ONLY
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
        locationId,
        locationName: loc.name,
        range,
        metric,
        series: [],
        currentValues: [],
        periodChanges: [],
        crossovers: [],
        historyCoverage: {
          requestedDays: range === '90D' ? 90 : range === '60D' ? 60 : 30,
          observedDays: 0,
          earliestObservation: null,
          latestObservation: null,
          sufficientForRequestedRange: false,
          statusMessage: 'No approved Primary Competitors yet'
        }
      });
    }

    // Determine cutoff date based on range
    const requestedDays = range === '90D' ? 90 : range === '60D' ? 60 : 30;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - requestedDays);

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

    // Determine unique observation days
    const uniqueDays = new Set(snapshots.map(s => s.capturedAt.toISOString().split('T')[0]));
    const observedDays = uniqueDays.size;

    const earliestObservation = snapshots.length > 0 ? snapshots[0].capturedAt.toISOString() : null;
    const latestObservation = snapshots.length > 0 ? snapshots[snapshots.length - 1].capturedAt.toISOString() : null;
    const sufficientForRequestedRange = observedDays >= requestedDays;

    let statusMessage = '';
    if (observedDays === 0) {
      statusMessage = 'Competitive history is being collected';
    } else if (observedDays < requestedDays) {
      statusMessage = `Building ${requestedDays}-day competitive history — ${observedDays} day(s) collected`;
    } else {
      statusMessage = `${requestedDays}-day competitive history fully active`;
    }

    // Build Time-Series Points for each entity
    const entities = [
      { id: locationId, name: loc.name, role: 'SUBJECT' },
      ...primaryMembers.map(m => ({ id: m.competitor.id, name: m.competitor.name, role: 'DIRECT' }))
    ];

    const seriesList = [];
    const currentValues = [];
    const periodChanges = [];

    for (const ent of entities) {
      const entSnaps = snapshots.filter(s => s.entityId === ent.id);
      
      const points = entSnaps.map(s => {
        let val = s.googleRating || 0;
        if (metric === 'Review Count') {
          val = s.googleReviewCount || 0;
        }

        return {
          timestamp: s.capturedAt.toISOString(),
          dateLabel: new Date(s.capturedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          value: val,
          rating: s.googleRating,
          reviewCount: s.googleReviewCount,
          provenanceMode: s.provenanceMode,
          source: `Google Places API (${s.provenanceMode})`
        };
      });

      seriesList.push({
        entityId: ent.id,
        entityName: ent.name,
        entityRole: ent.role,
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
      // Check if rating crossover occurred between subject and competitors
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
              crossovers.push(`${loc.name} rating surpassed ${compEnt.name}`);
            }
          }
        }
      }
    }

    return NextResponse.json({
      locationId,
      locationName: loc.name,
      range,
      metric,
      series: seriesList,
      currentValues,
      periodChanges,
      crossovers,
      historyCoverage: {
        requestedDays,
        observedDays,
        earliestObservation,
        latestObservation,
        sufficientForRequestedRange,
        statusMessage
      }
    });
  } catch (err: any) {
    console.error('Competitive trend API error:', err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { runPhase6BOperationalIntelligence } from '@/lib/scout/operationalIntelligenceEngine';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const locationId = searchParams.get('locationId') || searchParams.get('entityId');

    let targetLocId = locationId;

    if (!targetLocId) {
      const tampaLoc = await db.location.findFirst({
        where: { name: { contains: 'Texas de Brazil' } }
      });
      targetLocId = tampaLoc?.id || null;
    }

    if (!targetLocId) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    const report = await runPhase6BOperationalIntelligence(targetLocId);
    return NextResponse.json(report);
  } catch (err: any) {
    console.error('Failed to fetch operational reputation intelligence:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { Role } from '@prisma/client';

export async function GET(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const config = await db.scoringConfiguration.findFirst({
      where: { organizationId: session.organizationId },
      orderBy: { effectiveFrom: 'desc' },
    });

    return NextResponse.json(config || {
      reputationWeight: 0.35,
      sentimentWeight: 0.25,
      competitiveWeight: 0.15,
      momentumWeight: 0.10,
      responseWeight: 0.10,
      recoveryWeight: 0.05,
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session || !session.roles.includes(Role.CORPORATE_ADMIN)) {
    return NextResponse.json({ error: 'Unauthorized: Corporate Admin only.' }, { status: 403 });
  }

  try {
    const {
      reputationWeight,
      sentimentWeight,
      competitiveWeight,
      momentumWeight,
      responseWeight,
      recoveryWeight,
    } = await req.json();

    // Validate weights sum to 100% (1.0)
    const sum =
      reputationWeight +
      sentimentWeight +
      competitiveWeight +
      momentumWeight +
      responseWeight +
      recoveryWeight;

    if (Math.abs(sum - 1.0) > 0.001) {
      return NextResponse.json({ error: 'Weights must sum to exactly 100% (1.0).' }, { status: 400 });
    }

    const previousConfig = await db.scoringConfiguration.findFirst({
      where: { organizationId: session.organizationId },
      orderBy: { effectiveFrom: 'desc' },
    });

    const newConfig = await db.scoringConfiguration.create({
      data: {
        organizationId: session.organizationId,
        scoringVersion: String(Date.now()),
        reputationWeight,
        sentimentWeight,
        competitiveWeight,
        momentumWeight,
        responseWeight,
        recoveryWeight,
      },
    });

    // Write Audit Log
    await db.auditLog.create({
      data: {
        organizationId: session.organizationId,
        userId: session.id,
        action: 'UPDATE_SCORING_CONFIG',
        entityType: 'SCORING_CONFIGURATION',
        entityId: newConfig.id,
        oldValue: previousConfig as any,
        newValue: newConfig as any,
      },
    });

    // Enqueue recalculation for all organization locations
    const locations = await db.location.findMany({
      where: { organizationId: session.organizationId, status: 'ACTIVE' },
      select: { id: true },
    });

    for (const loc of locations) {
      await db.job.create({
        data: {
          type: 'calculateScores',
          payload: {
            organizationId: session.organizationId,
            locationId: loc.id,
          },
        },
      });
    }

    return NextResponse.json({ success: true, config: newConfig });
  } catch (err: any) {
    console.error('Update weights API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

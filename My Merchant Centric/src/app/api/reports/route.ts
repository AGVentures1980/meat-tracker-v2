import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const subscriptions = await db.reportSubscription.findMany({
      where: { userId: session.id },
      include: {
        deliveries: { orderBy: { generatedAt: 'desc' }, take: 10 },
      },
    });

    return NextResponse.json(subscriptions);
  } catch (err: any) {
    console.error('Fetch reports API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { AlertStatus } from '@prisma/client';

export async function GET(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const unreadCount = await db.alert.count({
      where: {
        organizationId: session.organizationId,
        status: AlertStatus.OPEN,
      },
    });

    return NextResponse.json({ hasUnread: unreadCount > 0, count: unreadCount });
  } catch (err: any) {
    console.error('API alerts status fetch error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

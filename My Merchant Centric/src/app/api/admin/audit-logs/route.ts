import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { Role } from '@prisma/client';

export async function GET(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session || !session.roles.includes(Role.CORPORATE_ADMIN)) {
    return NextResponse.json({ error: 'Unauthorized: Corporate Admin only.' }, { status: 403 });
  }

  try {
    const logs = await db.auditLog.findMany({
      where: {
        organizationId: session.organizationId,
      },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json(logs);
  } catch (err: any) {
    console.error('Fetch audit logs API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

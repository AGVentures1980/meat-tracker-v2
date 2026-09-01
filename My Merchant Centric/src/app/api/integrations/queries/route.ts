import { NextResponse } from 'next/server';
import { db } from '../../../../lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('organizationId');

  if (!orgId) {
    return NextResponse.json({ error: 'Missing organizationId' }, { status: 400 });
  }

  const queries = await db.socialMonitoredQuery.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: 'desc' }
  });

  return NextResponse.json(queries);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { organizationId, locationId, queryType, queryText } = body;

    if (!organizationId || !queryType || !queryText) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const query = await db.socialMonitoredQuery.create({
      data: {
        organizationId,
        locationId: locationId || null,
        queryType,
        queryText,
        enabled: true
      }
    });

    return NextResponse.json(query);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing query id' }, { status: 400 });
  }

  await db.socialMonitoredQuery.delete({
    where: { id }
  });

  return NextResponse.json({ success: true });
}

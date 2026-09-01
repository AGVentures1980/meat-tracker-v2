import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser, enforceTenantIsolation } from '@/lib/auth';
import { GooglePlacesAdapter } from '@/lib/scout/adapters/googlePlacesAdapter';

export async function GET(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const policies = await db.sourcePolicy.findMany({
      orderBy: { provider: 'asc' }
    });

    const placesAdapter = new GooglePlacesAdapter();
    const googleOperational = (await placesAdapter.healthCheck()) === 'OPERATIONAL';
    const yelpOperational = !!process.env.YELP_API_KEY;
    const opentableOperational = !!process.env.OPENTABLE_API_KEY;

    const adapterOperational = {
      GOOGLE: googleOperational,
      YELP: yelpOperational,
      OPENTABLE: opentableOperational,
      FACEBOOK: false,
      INSTAGRAM: false,
      TIKTOK: false,
      YOUTUBE: false,
      REDDIT: false
    };

    return NextResponse.json({ success: true, policies, adapterOperational });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Error occurred' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { provider, allowDiscovery, allowPublicMetadata, allowAutomatedMonitoring } = await req.json();
    if (!provider) return NextResponse.json({ error: 'Missing provider' }, { status: 400 });

    const updated = await db.sourcePolicy.update({
      where: { provider: provider.toUpperCase() },
      data: {
        allowDiscovery: allowDiscovery !== undefined ? !!allowDiscovery : undefined,
        allowPublicMetadata: allowPublicMetadata !== undefined ? !!allowPublicMetadata : undefined,
        allowAutomatedMonitoring: allowAutomatedMonitoring !== undefined ? !!allowAutomatedMonitoring : undefined,
      }
    });

    return NextResponse.json({ success: true, policy: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Error occurred' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { fuegoStoresMasterList, computeMasterManifestHash, FOGO_ORG_BRASA_ID } from '@/lib/masterManifest';

export async function GET(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const manifestHash = computeMasterManifestHash();

    const operatingLocations = fuegoStoresMasterList.filter(s => s.active && s.operatingStatus === 'OPERATIONAL');
    const comingSoonLocations = fuegoStoresMasterList.filter(s => s.operatingStatus === 'COMING_SOON');
    const inactiveLocations = fuegoStoresMasterList.filter(s => !s.active && s.operatingStatus !== 'COMING_SOON');

    return NextResponse.json({
      success: true,
      schemaVersion: '1.0',
      manifestVersion: '7B-5N-v1',
      manifestHash,
      organization: {
        name: 'Fogo de Chão',
        brasaOrganizationId: FOGO_ORG_BRASA_ID,
      },
      counts: {
        totalRecords: fuegoStoresMasterList.length,
        operatingLocations: operatingLocations.length,
        comingSoonLocations: comingSoonLocations.length,
        inactiveLocations: inactiveLocations.length,
        operatingInTampa: 0
      },
      locations: fuegoStoresMasterList
    });
  } catch (err: any) {
    console.error('Master manifest API error:', err);
    return NextResponse.json({ error: err?.message || 'Error generating master manifest' }, { status: 500 });
  }
}

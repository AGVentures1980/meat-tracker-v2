import { db } from '../src/lib/db';

async function auditBoizaoProvenance() {
  console.log('==================================================');
  console.log('AUDITING BOIZÃO BRAZILIAN STEAKHOUSE PROVENANCE');
  console.log('==================================================\n');

  const boizaoLocs = await db.competitorLocation.findMany({
    where: { name: { contains: 'Boiz' } },
    include: {
      externalSources: {
        include: { snapshots: { orderBy: { capturedAt: 'desc' }, take: 1 } }
      },
      setMembers: true
    }
  });

  console.log(`Found ${boizaoLocs.length} Boizão record(s) in DB:`);

  for (const loc of boizaoLocs) {
    const extSource = loc.externalSources[0];
    const snap = extSource?.snapshots[0];

    console.log(`\n• ID: ${loc.id}`);
    console.log(`  - Name: "${loc.name}"`);
    console.log(`  - Address: ${loc.address}, ${loc.city}, ${loc.state}`);
    console.log(`  - Place ID: ${extSource?.externalLocationId || 'N/A'}`);
    console.log(`  - Rating / Reviews: ${snap?.rating || 'N/A'} ★ (${snap?.reviewCount || 0} reviews)`);
    console.log(`  - Provenance Mode: ${loc.provenanceMode}`);
    console.log(`  - Provider: ${extSource?.provider || 'N/A'}`);
    
    // Check if Boizão was returned by live Google Places API textSearch
    const isLiveVerified = extSource?.discoveryMethod === 'OFFICIAL_GOOGLE_PLACES_API';

    if (!isLiveVerified) {
      console.log(`  - Official API Verified: NO (Originated from local test execution)`);
      console.log(`  - ACTION: Marking status = "UNVERIFIED" and excluding from human approval queue.`);

      await db.competitiveSetMember.updateMany({
        where: { competitorLocationId: loc.id },
        data: {
          status: 'UNVERIFIED',
          approvedByUser: false,
          approvalReason: 'UNVERIFIED_PROVENANCE: Must be re-validated via official Google Places API before human review.'
        }
      });
    } else {
      console.log(`  - Official API Verified: YES`);
    }
  }

  console.log('\n==================================================');
  console.log('🎉 BOIZÃO PROVENANCE AUDIT COMPLETE');
  console.log('==================================================');
}

auditBoizaoProvenance().catch(console.error);

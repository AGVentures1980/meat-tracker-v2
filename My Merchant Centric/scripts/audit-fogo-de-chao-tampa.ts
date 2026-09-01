import { db } from '../src/lib/db';

async function auditAndRemoveFogoTampa() {
  console.log('==================================================');
  console.log('AUDITING & INVALIDATING FOGO DE CHÃO TAMPA');
  console.log('==================================================\n');

  // 1. Locate all Fogo de Chão Tampa records
  const fuegoLocs = await db.competitorLocation.findMany({
    where: {
      name: { contains: 'Fogo' }
    }
  });

  console.log(`Found ${fuegoLocs.length} Fogo de Chão competitor location record(s).`);

  for (const loc of fuegoLocs) {
    console.log(`\n• Invalidating CompetitorLocation ID: ${loc.id} ("${loc.name}")`);
    
    // Update CompetitorLocation
    await db.competitorLocation.update({
      where: { id: loc.id },
      data: {
        provenanceMode: 'DEMO',
        priceTier: 'INVALID_REAL_WORLD_ENTITY'
      }
    });

    // Update SetMembers
    const setMembers = await db.competitiveSetMember.updateMany({
      where: { competitorLocationId: loc.id },
      data: {
        provenanceMode: 'DEMO',
        status: 'REJECTED',
        approvedByUser: false,
        approvalReason: 'INVALID_REAL_WORLD_ENTITY: No physical Fogo de Chão location operates in Tampa, FL.'
      }
    });

    console.log(`  - Marked ${setMembers.count} CompetitiveSetMember record(s) as REJECTED / DEMO.`);
  }

  // 2. Audit remaining candidates
  const liveApprovedCount = await db.competitiveSetMember.count({
    where: { status: 'APPROVED', approvedByUser: true, provenanceMode: { in: ['LIVE', 'IMPORTED'] } }
  });

  console.log(`\nLIVE Approved Competitors Remaining: ${liveApprovedCount}`);
  console.log('==================================================');
  console.log('🎉 FOGO DE CHÃO TAMPA INVALIDATION COMPLETE');
  console.log('==================================================');
}

auditAndRemoveFogoTampa().catch(err => {
  console.error('❌ Audit failed:', err);
  process.exit(1);
});

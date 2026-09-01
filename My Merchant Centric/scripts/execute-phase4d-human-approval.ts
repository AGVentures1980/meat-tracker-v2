import { db } from '../src/lib/db';

async function executePhase4DHumanApproval() {
  console.log('==================================================');
  console.log('PHASE 4D — HUMAN COMPETITIVE SET APPROVAL EXECUTION');
  console.log('==================================================\n');

  const tenantOrg = await db.organization.findFirst({ where: { name: { contains: 'Demo' } } }) || await db.organization.findFirst();
  if (!tenantOrg) throw new Error('Tenant organization missing');

  const texasLoc = await db.location.findFirst({
    where: { name: { contains: 'Texas de Brazil' }, provenanceMode: 'LIVE' }
  });

  if (!texasLoc) throw new Error('Texas de Brazil location missing');

  const approvalReasonStr = 'Human competitive-set review — approved based on verified operating model, trade-area relevance, dining occasion and competitive proposition.';
  const approvedByAdmin = 'alexandre@brasabrandpulse.com';
  const approvalTimestamp = new Date();

  // 1. DIRECT APPROVED (2 Stores)
  const directPlaceIds = [
    'ChIJ5XkDzRfDwogRnH0PSg_mFGk', // Terra Gaucha Brazilian Steakhouse - Tampa
    'ChIJpbHvSdrBwogRJPRuAGCHWSg'  // Bahia Churrascaria Brazilian Steakhouse
  ];

  // 2. SECONDARY APPROVED (3 Stores)
  const secondaryPlaceIds = [
    'ChIJHUT6O_7CwogR5cYxe7yk5nM', // Charley's Steak House
    'ChIJVwY-iKzDwogRertNM1YPMjg', // Fleming’s Prime Steakhouse & Wine Bar
    'ChIJATbxbGrpwogRC4OgXnnmLwU'  // El Churrascaso Grill Tampa (Physical Store)
  ];

  // 3. WATCHLIST APPROVED (6 Entries/Stores)
  const watchlistPlaceIds = [
    'ChIJn5Z0ZePlwogR6jTE6D6G0N8', // Terra Mar Brazilian Steakhouse
    'ChIJpxvtv47DwogRReiKNchxx9M', // Mister Churrasco
    'ChIJiWTxIS7dwogRCRFc-h3mXkI', // El Churrascaso Grill - Tampa (Food Truck)
    'ChIJz-r4PA7BwogRiAnH8BNVagI', // El Churrascaso Grill Food Truck
    'ChIJUY1pZADNwogR9fuISFl90ro', // Leña Churrascaria Food Truck
    'ChIJ3Xm8q73DwogR0xP3kM76C90'  // Brazas Grill Tampa
  ];

  // Execute DIRECT approvals
  for (const placeId of directPlaceIds) {
    const ext = await db.externalSource.findFirst({ where: { externalLocationId: placeId } });
    if (ext && ext.competitorLocationId) {
      await db.competitiveSetMember.updateMany({
        where: { competitorLocationId: ext.competitorLocationId },
        data: {
          status: 'APPROVED',
          competitiveRole: 'DIRECT',
          approvedByUser: true,
          approvedBy: approvedByAdmin,
          approvedAt: approvalTimestamp,
          approvalReason: approvalReasonStr,
          provenanceMode: 'LIVE'
        }
      });
    }
  }

  // Execute SECONDARY approvals
  for (const placeId of secondaryPlaceIds) {
    const ext = await db.externalSource.findFirst({ where: { externalLocationId: placeId } });
    if (ext && ext.competitorLocationId) {
      await db.competitiveSetMember.updateMany({
        where: { competitorLocationId: ext.competitorLocationId },
        data: {
          status: 'APPROVED',
          competitiveRole: 'SECONDARY',
          approvedByUser: true,
          approvedBy: approvedByAdmin,
          approvedAt: approvalTimestamp,
          approvalReason: approvalReasonStr,
          provenanceMode: 'LIVE'
        }
      });
    }
  }

  // Execute WATCHLIST additions
  for (const placeId of watchlistPlaceIds) {
    const ext = await db.externalSource.findFirst({ where: { externalLocationId: placeId } });
    if (ext && ext.competitorLocationId) {
      await db.competitiveSetMember.updateMany({
        where: { competitorLocationId: ext.competitorLocationId },
        data: {
          status: 'APPROVED',
          competitiveRole: 'WATCHLIST',
          approvedByUser: true,
          approvedBy: approvedByAdmin,
          approvedAt: approvalTimestamp,
          approvalReason: approvalReasonStr,
          provenanceMode: 'LIVE'
        }
      });
    }
  }

  // Ensure Boizão is EXCLUDED / UNVERIFIED
  const boizaoExt = await db.externalSource.findFirst({ where: { externalLocationId: 'ChIJY99q_7nDwogR85K4x19L271' } });
  if (boizaoExt && boizaoExt.competitorLocationId) {
    await db.competitiveSetMember.updateMany({
      where: { competitorLocationId: boizaoExt.competitorLocationId },
      data: {
        status: 'UNVERIFIED',
        approvedByUser: false,
        approvalReason: 'UNVERIFIED_PROVENANCE: Must be revalidated via official Google API.'
      }
    });
  }

  // Verify DB Counts
  const directApproved = await db.competitiveSetMember.findMany({
    where: { status: 'APPROVED', competitiveRole: 'DIRECT', approvedByUser: true },
    include: { competitor: true }
  });

  const secondaryApproved = await db.competitiveSetMember.findMany({
    where: { status: 'APPROVED', competitiveRole: 'SECONDARY', approvedByUser: true },
    include: { competitor: true }
  });

  const watchlistApproved = await db.competitiveSetMember.findMany({
    where: { status: 'APPROVED', competitiveRole: 'WATCHLIST', approvedByUser: true },
    include: { competitor: true }
  });

  const unverifiedExcluded = await db.competitiveSetMember.findMany({
    where: { status: 'UNVERIFIED' },
    include: { competitor: true }
  });

  console.log('--- PHASE 4D HUMAN APPROVAL RESULTS ---');
  console.log(`\n• DIRECT APPROVED (${directApproved.length} stores):`);
  directApproved.forEach(m => console.log(`  - ${m.competitor.name} (Role: ${m.competitiveRole})`));

  console.log(`\n• SECONDARY APPROVED (${secondaryApproved.length} stores):`);
  secondaryApproved.forEach(m => console.log(`  - ${m.competitor.name} (Role: ${m.competitiveRole})`));

  console.log(`\n• WATCHLIST ADDED (${watchlistApproved.length} stores):`);
  watchlistApproved.forEach(m => console.log(`  - ${m.competitor.name} (Role: ${m.competitiveRole})`));

  console.log(`\n• UNVERIFIED EXCLUDED (${unverifiedExcluded.length} stores):`);
  unverifiedExcluded.forEach(m => console.log(`  - ${m.competitor.name}`));

  console.log('\n==================================================');
  console.log('🎉 PHASE 4D HUMAN APPROVAL SUCCESSFULLY APPLIED!');
  console.log('==================================================');
}

executePhase4DHumanApproval().catch(err => {
  console.error('\n❌ HUMAN APPROVAL EXECUTION FAILED:', err);
  process.exit(1);
});

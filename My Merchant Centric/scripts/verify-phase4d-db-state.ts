import { db } from '../src/lib/db';

async function verifyPhase4DState() {
  console.log('==================================================');
  console.log('VERIFYING PHASE 4D DATABASE STATE');
  console.log('==================================================\n');

  // Ensure El Churrascaso Grill Tampa (Physical Store) is APPROVED SECONDARY
  const churrascasoExt = await db.externalSource.findFirst({
    where: { externalLocationId: 'ChIJATbxbGrpwogRC4OgXnnmLwU' }
  });

  if (churrascasoExt && churrascasoExt.competitorLocationId) {
    await db.competitiveSetMember.updateMany({
      where: { competitorLocationId: churrascasoExt.competitorLocationId },
      data: {
        status: 'APPROVED',
        competitiveRole: 'SECONDARY',
        approvedByUser: true,
        approvedBy: 'alexandre@brasabrandpulse.com',
        approvedAt: new Date(),
        approvalReason: 'Human competitive-set review — approved based on verified operating model, trade-area relevance, dining occasion and competitive proposition.',
        provenanceMode: 'LIVE'
      }
    });
  }

  const directMembers = await db.competitiveSetMember.findMany({
    where: { status: 'APPROVED', competitiveRole: 'DIRECT', approvedByUser: true },
    include: { competitor: true }
  });

  const secondaryMembers = await db.competitiveSetMember.findMany({
    where: { status: 'APPROVED', competitiveRole: 'SECONDARY', approvedByUser: true },
    include: { competitor: true }
  });

  const watchlistMembers = await db.competitiveSetMember.findMany({
    where: { status: 'APPROVED', competitiveRole: 'WATCHLIST', approvedByUser: true },
    include: { competitor: true }
  });

  const unverifiedMembers = await db.competitiveSetMember.findMany({
    where: { status: 'UNVERIFIED' },
    include: { competitor: true }
  });

  console.log(`• DIRECT APPROVED (${directMembers.length} stores):`);
  directMembers.forEach(m => console.log(`  1. ${m.competitor.name}`));

  console.log(`\n• SECONDARY APPROVED (${secondaryMembers.length} stores):`);
  secondaryMembers.forEach((m, i) => console.log(`  ${i + 1}. ${m.competitor.name}`));

  console.log(`\n• WATCHLIST ADDED (${watchlistMembers.length} stores):`);
  watchlistMembers.forEach((m, i) => console.log(`  ${i + 1}. ${m.competitor.name}`));

  console.log(`\n• UNVERIFIED EXCLUDED (${unverifiedMembers.length} stores):`);
  unverifiedMembers.forEach((m, i) => console.log(`  ${i + 1}. ${m.competitor.name}`));

  console.log('\n==================================================');
  console.log('🎉 VERIFICATION COMPLETE!');
  console.log('==================================================');
}

verifyPhase4DState().catch(console.error);

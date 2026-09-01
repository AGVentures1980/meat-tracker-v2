import { db } from '../src/lib/db';

async function setPhysicalChurrascasoSecondary() {
  console.log('Setting physical restaurant El Churrascaso Grill Tampa to APPROVED SECONDARY...');

  const approvalReasonStr = 'Human competitive-set review — approved based on verified operating model, trade-area relevance, dining occasion and competitive proposition.';
  const approvedByAdmin = 'alexandre@brasabrandpulse.com';
  const approvalTimestamp = new Date();

  // Physical Restaurant El Churrascaso Grill Tampa
  const targetMember = await db.competitiveSetMember.findFirst({
    where: { competitor: { name: 'El Churrascaso Grill Tampa' } }
  });

  if (targetMember) {
    await db.competitiveSetMember.update({
      where: { id: targetMember.id },
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

  // Summary counts
  const direct = await db.competitiveSetMember.findMany({
    where: { status: 'APPROVED', competitiveRole: 'DIRECT', approvedByUser: true },
    include: { competitor: true }
  });

  const secondary = await db.competitiveSetMember.findMany({
    where: { status: 'APPROVED', competitiveRole: 'SECONDARY', approvedByUser: true },
    include: { competitor: true }
  });

  const watchlist = await db.competitiveSetMember.findMany({
    where: { status: 'APPROVED', competitiveRole: 'WATCHLIST', approvedByUser: true },
    include: { competitor: true }
  });

  const unverified = await db.competitiveSetMember.findMany({
    where: { status: 'UNVERIFIED' },
    include: { competitor: true }
  });

  console.log('\n==================================================');
  console.log('FINAL APPROVED COMPETITIVE SET BREAKDOWN');
  console.log('==================================================');
  console.log(`\n• DIRECT APPROVED (${direct.length} stores):`);
  direct.forEach((m, i) => console.log(`  ${i + 1}. ${m.competitor.name}`));

  console.log(`\n• SECONDARY APPROVED (${secondary.length} stores):`);
  secondary.forEach((m, i) => console.log(`  ${i + 1}. ${m.competitor.name}`));

  console.log(`\n• WATCHLIST ADDED (${watchlist.length} stores):`);
  watchlist.forEach((m, i) => console.log(`  ${i + 1}. ${m.competitor.name}`));

  console.log(`\n• UNVERIFIED EXCLUDED (${unverified.length} stores):`);
  unverified.forEach((m, i) => console.log(`  ${i + 1}. ${m.competitor.name}`));
  console.log('==================================================\n');
}

setPhysicalChurrascasoSecondary().catch(console.error);

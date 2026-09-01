import { db } from '../src/lib/db';

async function auditTampaCompetitors() {
  const tampaLoc = await db.location.findFirst({
    where: {
      OR: [
        { id: '2c3c9ac6-5504-4af0-84b6-8b96bb00fa03' },
        { name: { contains: 'Tampa' } }
      ]
    }
  });

  if (!tampaLoc) {
    console.error('Tampa location not found!');
    return;
  }

  console.log(`Tampa Location ID: ${tampaLoc.id}`);
  console.log(`Tampa Location Name: ${tampaLoc.name}\n`);

  const sets = await db.competitiveSet.findMany({
    where: { locationId: tampaLoc.id },
    include: {
      members: {
        include: {
          competitor: true
        }
      }
    }
  });

  console.log(`Competitive Sets Count for Tampa: ${sets.length}`);
  let totalMembers = 0;
  const tierCounts: Record<string, number> = {
    DIRECT: 0,
    SECONDARY: 0,
    WATCHLIST: 0,
    UNVERIFIED: 0
  };

  sets.forEach((s, setIdx) => {
    console.log(`\n--- Competitive Set #${setIdx + 1}: "${s.name}" (ID: ${s.id}) ---`);
    s.members.forEach((m, idx) => {
      totalMembers++;
      const compName = m.competitor ? m.competitor.name : 'UNKNOWN';
      const role = m.competitiveRole || m.tier || 'UNVERIFIED';
      const status = m.status || 'PENDING';
      const approvedForBenchmark = (status === 'APPROVED' && ['DIRECT', 'SECONDARY'].includes(role)) ? 'YES' : 'NO';

      tierCounts[role] = (tierCounts[role] || 0) + 1;

      console.log(`  [${idx + 1}] ID: ${m.competitorLocationId}`);
      console.log(`      Name: ${compName}`);
      console.log(`      Tier/Role: ${role}`);
      console.log(`      Status: ${status}`);
      console.log(`      Approved for Benchmark: ${approvedForBenchmark}`);
      console.log(`      Active: YES`);
    });
  });

  console.log('\n=============================================');
  console.log('TAMPA COMPETITIVE RELATIONSHIP TIER BREAKDOWN:');
  console.log(`Total Relationships: ${totalMembers}`);
  console.log(`DIRECT Count: ${tierCounts.DIRECT || 0}`);
  console.log(`SECONDARY Count: ${tierCounts.SECONDARY || 0}`);
  console.log(`WATCHLIST Count: ${tierCounts.WATCHLIST || 0}`);
  console.log(`UNVERIFIED Count: ${tierCounts.UNVERIFIED || 0}`);
  console.log('=============================================\n');
}

auditTampaCompetitors().catch(console.error);

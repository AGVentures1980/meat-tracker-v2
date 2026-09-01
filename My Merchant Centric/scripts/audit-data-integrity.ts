import { db } from '../src/lib/db';
import { getMonitoredEntities } from '../src/lib/services/monitoredEntityService';

async function runDataIntegrityAudit() {
  console.log('==================================================');
  console.log('STARTING BRASA DATA INTEGRITY AUDIT');
  console.log('==================================================\n');

  // 1. Audit Selector Entities in /pulse before cleanup
  const tenantOrg = await db.organization.findFirst({ where: { name: { contains: 'Demo' } } }) || await db.organization.findFirst();
  if (!tenantOrg) throw new Error('No tenant organization found');

  const selectorEntitiesBefore = await getMonitoredEntities(tenantOrg.id);
  console.log(`[SELECTOR AUDIT BEFORE] Entities returned by getMonitoredEntities: ${selectorEntitiesBefore.length}`);
  selectorEntitiesBefore.forEach((e: any, idx: number) => {
    console.log(`  ${idx + 1}. ID: ${e.id} | Brand: ${e.brandName} | Loc: ${e.locationName} | Type: ${e.entityType} | Prov: ${e.provenanceMode || 'LIVE'}`);
  });

  // Revert all automatic or seeded competitor approvals to PENDING
  console.log('\n[COMPETITOR AUDIT] Checking for unverified/seeded competitor approvals...');
  const allMembers = await db.competitiveSetMember.findMany({
    include: { competitor: true }
  });

  let invalidApprovalsReverted = 0;
  for (const member of allMembers) {
    if (member.status === 'APPROVED' && (!member.approvedBy || member.approvedBy.includes('system') || member.approvedBy.includes('corporate'))) {
      await db.competitiveSetMember.update({
        where: { id: member.id },
        data: {
          status: 'PENDING',
          approvedByUser: false,
          approvedBy: null,
          approvedAt: null,
          approvalReason: null
        }
      });
      invalidApprovalsReverted++;
      console.log(`[REVERTED] Reset automatic approval to PENDING for competitor: ${member.competitor.name}`);
    }
  }

  const legitimateApproved = await db.competitiveSetMember.count({
    where: { status: 'APPROVED', approvedByUser: true }
  });

  console.log(`\nLegitimate manually approved competitors: ${legitimateApproved}`);
  console.log(`Invalid approvals reverted: ${invalidApprovalsReverted > 0 ? 'YES' : 'NO'} (${invalidApprovalsReverted} reverted)`);

  // 3. Audit LIVE SourceSnapshot History for Texas de Brazil Tampa
  console.log('\n[SNAPSHOT AUDIT] Checking LIVE SourceSnapshots for Texas de Brazil - Tampa...');
  const texasLoc = await db.location.findFirst({
    where: { name: { contains: 'Texas de Brazil' } }
  });

  const texasSource = texasLoc ? await db.externalSource.findFirst({
    where: { locationId: texasLoc.id },
    include: {
      snapshots: { orderBy: { capturedAt: 'asc' } }
    }
  }) : null;

  const liveSnapshots = texasSource?.snapshots || [];
  console.log(`Total LIVE SourceSnapshots for Texas de Brazil Tampa: ${liveSnapshots.length}`);

  let oldestTimestamp: string | null = null;
  let newestTimestamp: string | null = null;
  let has7dHistory = false;
  let has30dHistory = false;

  if (liveSnapshots.length > 0) {
    oldestTimestamp = new Date(liveSnapshots[0].capturedAt).toISOString();
    newestTimestamp = new Date(liveSnapshots[liveSnapshots.length - 1].capturedAt).toISOString();

    const timespanMs = new Date(newestTimestamp).getTime() - new Date(oldestTimestamp).getTime();
    const timespanDays = timespanMs / (1000 * 3600 * 24);

    has7dHistory = timespanDays >= 7 && liveSnapshots.length >= 2;
    has30dHistory = timespanDays >= 30 && liveSnapshots.length >= 2;
  }

  console.log(`Oldest LIVE snapshot: ${oldestTimestamp || 'None'}`);
  console.log(`Newest LIVE snapshot: ${newestTimestamp || 'None'}`);
  console.log(`7-day history sufficient: ${has7dHistory ? 'YES' : 'NO'}`);
  console.log(`30-day history sufficient: ${has30dHistory ? 'YES' : 'NO'}`);

  console.log('\n==================================================');
  console.log('🎉 AUDIT COMPLETED SUCCESSFULLY');
  console.log('==================================================');
}

runDataIntegrityAudit().catch(err => {
  console.error('\n❌ AUDIT FAILED:', err);
  process.exit(1);
});

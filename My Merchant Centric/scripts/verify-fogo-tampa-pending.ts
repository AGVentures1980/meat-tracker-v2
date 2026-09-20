import fs from 'fs';
const envFile = fs.readFileSync('.env', 'utf8');
envFile.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2 && parts[0].trim()) {
    process.env[parts[0].trim()] = parts.slice(1).join('=').replace(/"/g, '').trim();
  }
});

import { db } from '../src/lib/db';

async function verifyFogoPending() {
  const locId = 'c84ad3bc-2876-4776-861c-330c522c86e0'; // Fogo Tampa
  const compSet = await db.competitiveSet.findFirst({
    where: { locationId: locId },
    include: { members: true }
  });

  if (!compSet) {
    console.log('No competitive set found for Fogo Tampa');
    return;
  }

  console.log(`Fogo Tampa Competitive Set ID: ${compSet.id}`);
  console.log(`Total Members: ${compSet.members.length}`);

  const approved = compSet.members.filter(m => m.status === 'APPROVED');
  const pending = compSet.members.filter(m => m.status === 'PENDING' || m.status === 'UNVERIFIED');

  console.log(`Approved Count: ${approved.length}`);
  console.log(`Pending / Unverified Count: ${pending.length}`);

  if (approved.length > 0) {
    console.log('\nReverting test-approved members to PENDING state...');
    await db.competitiveSetMember.updateMany({
      where: { competitiveSetId: compSet.id, status: 'APPROVED' },
      data: {
        status: 'PENDING',
        approvedByUser: false,
        approvedBy: null,
        approvedAt: null,
        approvalReason: null
      }
    });
    console.log('Reverted all test approvals for Fogo Tampa to PENDING status.');
  } else {
    console.log('✔ All Fogo Tampa discovery candidates are 100% PENDING / UNAPPROVED.');
  }
}

verifyFogoPending().catch(console.error);

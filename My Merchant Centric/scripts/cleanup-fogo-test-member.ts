import fs from 'fs';
const envFile = fs.readFileSync('.env', 'utf8');
envFile.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2 && parts[0].trim()) {
    process.env[parts[0].trim()] = parts.slice(1).join('=').replace(/"/g, '').trim();
  }
});

import { db } from '../src/lib/db';

async function cleanupFogoTestMember() {
  const fogoSet = await db.competitiveSet.findFirst({
    where: { locationId: 'c84ad3bc-2876-4776-861c-330c522c86e0' }
  });
  if (fogoSet) {
    await db.competitiveSetMember.updateMany({
      where: { competitiveSetId: fogoSet.id },
      data: { status: 'PENDING', approvedByUser: false }
    });
    console.log(`Reset Fogo Tampa test members to PENDING state.`);
  }
}

cleanupFogoTestMember().catch(console.error);

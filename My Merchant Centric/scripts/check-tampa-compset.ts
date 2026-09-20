import fs from 'fs';
const envFile = fs.readFileSync('.env', 'utf8');
envFile.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2 && parts[0].trim()) {
    process.env[parts[0].trim()] = parts.slice(1).join('=').replace(/"/g, '').trim();
  }
});

import { db } from '../src/lib/db';

async function checkTampaCompSet() {
  const locId = '87465c11-ec18-4a26-85d0-99ec0d29e912';
  const compSets = await db.competitiveSet.findMany({
    where: { locationId: locId },
    include: {
      members: {
        where: { status: 'APPROVED' },
        include: { competitor: true }
      }
    }
  });

  console.log(`Found ${compSets.length} competitive set(s) for Tampa:`);
  compSets.forEach(cs => {
    console.log(` - CompSet ID: ${cs.id} | Org ID: ${cs.organizationId}`);
    cs.members.forEach(m => {
      console.log(`    • Member: ${m.competitor.name} | role: ${m.competitiveRole} | tier: ${m.tier} | status: ${m.status}`);
    });
  });
}

checkTampaCompSet().catch(console.error);

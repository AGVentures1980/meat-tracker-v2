import fs from 'fs';
const envFile = fs.readFileSync('.env', 'utf8');
envFile.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2 && parts[0].trim()) {
    process.env[parts[0].trim()] = parts.slice(1).join('=').replace(/"/g, '').trim();
  }
});

import { db } from '../src/lib/db';

async function cleanupTestDatasets() {
  const fairfaxLoc = await db.location.findFirst({ where: { brasaLocationId: '710' } });
  if (fairfaxLoc) {
    await db.reviewDataset.deleteMany({
      where: { locationId: fairfaxLoc.id }
    });
    await db.contentItem.deleteMany({
      where: { locationId: fairfaxLoc.id, acquisitionMethod: 'CLIENT_IMPORT' }
    });
    console.log(`Cleaned test datasets and items for Fairfax (${fairfaxLoc.id})`);
  }
}

cleanupTestDatasets().catch(console.error);

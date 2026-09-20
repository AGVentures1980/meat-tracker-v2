import fs from 'fs';
const envFile = fs.readFileSync('.env', 'utf8');
envFile.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2 && parts[0].trim()) {
    process.env[parts[0].trim()] = parts.slice(1).join('=').replace(/"/g, '').trim();
  }
});

import { db } from '../src/lib/db';

async function checkTampaReviews() {
  const locId = '87465c11-ec18-4a26-85d0-99ec0d29e912';

  const datasets = await db.reviewDataset.findMany({
    where: { locationId: locId }
  });
  console.log(`Found ${datasets.length} review dataset(s) for Tampa:`);
  datasets.forEach(d => {
    console.log(` - Dataset: ${d.provider} | reportChannel: ${d.reportChannel} | declaredTotal: ${d.declaredTotalRecords} | imported: ${d.importedRecordCount}`);
  });

  const reviews = await db.contentItem.findMany({
    where: { locationId: locId, contentType: 'REVIEW' }
  });
  console.log(`Total Tampa ContentItem reviews in DB: ${reviews.length}`);
}

checkTampaReviews().catch(console.error);

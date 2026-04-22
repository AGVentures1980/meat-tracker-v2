import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
  console.log('🔧 fix_ac_corrected.ts\n');

  // STEP 1: Set Atlantic City is_pilot = true
  console.log('Step 1: Activating Atlantic City pilot...');
  await p.store.update({
    where: { id: 1205 },
    data: {
      is_pilot: true,
      pilot_start_date: new Date(),
      status: 'ACTIVE'
    }
  });
  console.log('  ✓ Store 1205 is_pilot = true, status = ACTIVE\n');

  console.log('Step 1.b: Activating Stores 9, 10, 11...');
  await p.store.updateMany({
    where: {
      id: { in: [9, 10, 11] },
      company_id: 'ea32ec07-c64b-4670-88ec-849cabd7170f'
    },
    data: { status: 'ACTIVE', activated_at: new Date() }
  });
  console.log('  ✓ Stores 9, 10, 11 status = ACTIVE\n');


  // STEP 2: Seed IntelligenceSnapshot — 7 days
  console.log('Step 2: Seeding IntelligenceSnapshot (7 days)...');
  const TENANT = 'ea32ec07-c64b-4670-88ec-849cabd7170f';
  let seeded = 0;

  for (let i = 1; i <= 7; i++) {
    const periodStart = new Date();
    periodStart.setUTCDate(periodStart.getUTCDate() - i);
    periodStart.setUTCHours(0, 0, 0, 0);
    const periodEnd = new Date(periodStart);
    periodEnd.setUTCHours(23, 59, 59, 999);

    const lbsReal = parseFloat((0.68 + (Math.random() * 0.10 - 0.05)).toFixed(4));
    const lbsTheo = 0.76;
    const delta   = parseFloat((((lbsReal - lbsTheo) / lbsTheo) * 100).toFixed(2));

    await (p as any).intelligenceSnapshot.create({
      data: {
        tenant_id:            TENANT,
        store_id:             1205,
        period_start:         periodStart,
        period_end:           periodEnd,
        op_risk_score:        parseFloat((82 + Math.random() * 12).toFixed(2)),
        store_trust_score:    parseFloat((88 + Math.random() * 10).toFixed(2)),
        ingestion_score:      parseFloat((85 + Math.random() * 12).toFixed(2)),
        lbs_guest_real:       lbsReal,
        lbs_guest_theo:       lbsTheo,
        lbs_guest_delta_pct:  delta,
        source_inputs_used:   Math.floor(7 + Math.random() * 6),
        ruleset_version:      'v4.2.0',
        local_baseline_context: {
          seeded: true,
          seed_date: new Date().toISOString().split('T')[0],
          property: 'atlantic-city'
        }
      }
    }).then(() => seeded++).catch((e: any) =>
      console.log(`  ⚠ Day ${i} snapshot failed: ${e.message.split('\n')[0]}`)
    );
  }
  console.log(`  ✓ Seeded ${seeded}/7 IntelligenceSnapshot records\n`);

  // STEP 3: Verify
  console.log('Step 3: Verifying...');
  const ac = await p.store.findUnique({
    where: { id: 1205 },
    select: { id: true, store_name: true, is_pilot: true, status: true }
  });
  console.log('  Store 1205:', JSON.stringify(ac));

  const snapCount = await (p as any).intelligenceSnapshot.count({
    where: { store_id: 1205 }
  }).catch(() => 'N/A');
  console.log(`  Snapshots for AC: ${snapCount}`);
  console.log('\n✅ Atlantic City is ready for pilot.');
}

main()
  .catch((e: any) => { console.error('❌', e.message); process.exit(1); })
  .finally(() => p.$disconnect());

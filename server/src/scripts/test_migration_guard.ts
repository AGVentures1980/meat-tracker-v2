import { PrismaMigrationGuard } from '../utils/PrismaMigrationGuard';

process.env.TEST_MODE = 'true';

async function runTests() {
  console.log("=== STARTING QA FOR PRISMA MIGRATION GUARD ===");
  let passed = 0;
  let total = 0;

  // Helper
  const eq = (a: any, b: any, testName: string) => {
    total++;
    if (a === b) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName} (Expected ${b}, got ${a})`);
    }
  };

  // Mock
  const originalDetect = PrismaMigrationGuard.detectFailedMigrations;
  const originalParse = PrismaMigrationGuard.parseMigrationSQL;
  const originalVerify = PrismaMigrationGuard.verifyPhysicalSchema;

  try {
    // Caso 1: Fail + schema compatível -> auto-resolve
    PrismaMigrationGuard.detectFailedMigrations = async () => 'test_mig_1';
    PrismaMigrationGuard.parseMigrationSQL = () => ({ tables: ['A'], columns: [], enums: [], indices: [], hasDestructive: false, destructiveReasons: [] });
    PrismaMigrationGuard.verifyPhysicalSchema = async () => ({ isFullyCompliant: true, score: 1, found: 1, total: 1, missingDetails: [] });
    
    let res = await PrismaMigrationGuard.run();
    eq(res?.decision, 'SAFE_AUTO_RESOLVE', 'Cenario 1: Schema 100% compativel');

    // Caso 2: Fail + schema parcialmente compatível -> block
    PrismaMigrationGuard.detectFailedMigrations = async () => 'test_mig_2';
    PrismaMigrationGuard.verifyPhysicalSchema = async () => ({ isFullyCompliant: false, score: 0.5, found: 1, total: 2, missingDetails: ['Table[B]'] });
    
    try {
      await PrismaMigrationGuard.run();
      eq('did_not_throw', 'threw', 'Cenario 2: Schema parcial deveria bloquear');
    } catch (e: any) {
      eq(e.message.includes('BLOCK_AND_ALERT'), true, 'Cenario 2: Schema parcial gerou BLOCK_AND_ALERT');
    }

    // Caso 3: Sem fail -> NO_ACTION
    PrismaMigrationGuard.detectFailedMigrations = async () => null;
    res = await PrismaMigrationGuard.run();
    eq(res?.decision, 'NO_ACTION', 'Cenario 3: Sem falhas faz NO_ACTION');

    // Caso 4: Fail com Destrutivo -> block
    PrismaMigrationGuard.detectFailedMigrations = async () => 'test_mig_4';
    PrismaMigrationGuard.parseMigrationSQL = () => ({ tables: [], columns: [], enums: [], indices: [], hasDestructive: true, destructiveReasons: ['DROP TABLE X;'] });
    try {
      await PrismaMigrationGuard.run();
      eq('did_not_throw', 'threw', 'Cenario 4: SQL destrutivo deveria bloquear');
    } catch (e: any) {
      eq(e.message.includes('BLOCK_AND_ALERT') && e.message.includes('destructive SQL'), true, 'Cenario 4: SQL destrutivo gerou BLOCK_AND_ALERT exato');
    }

  } finally {
    PrismaMigrationGuard.detectFailedMigrations = originalDetect;
    PrismaMigrationGuard.parseMigrationSQL = originalParse;
    PrismaMigrationGuard.verifyPhysicalSchema = originalVerify;
  }

  console.log(`\n=== QA SUMMARY: ${passed}/${total} PASSED ===`);
  if (passed !== total) process.exit(1);
}

runTests().catch(console.error);

import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

export class SREStartupGuard {
  static async verifyEnvironmentSafety() {
    console.log("[SRE-GUARD] Initiating Operational Environment Integrity Check...");

    const env = process.env.NODE_ENV || 'development';
    const dbUrl = process.env.DATABASE_URL || '';

    // 1. EXTRACT DATABASE FINGERPRINT
    // Retira senhas para não vazar log
    const safeDbUrl = dbUrl.replace(/\/\/.*@/, '//***:***@');
    const dbFingerprint = crypto.createHash('md5').update(dbUrl).digest('hex').substring(0, 8);
    
    // 2. CHECK DATABASE NAME MATCH
    const isProdDb = dbUrl.includes('brasa_prod_db') || dbUrl.includes('postgres-prod') || dbUrl.includes('postgres-production');
    const isStagingDb = dbUrl.includes('brasa_staging_db') || dbUrl.includes('postgres-staging');

    if (env === 'production' && isStagingDb) {
      console.error("🔥 [FATAL] PRODUCTION APP CONNECTED TO STAGING DATABASE. HALTING SYSTEM.");
      process.exit(1);
    }

    if (env === 'staging' && isProdDb) {
      console.error("🔥 [FATAL] STAGING APP CONNECTED TO PRODUCTION DATABASE. HALTING SYSTEM.");
      process.exit(1);
    }

    // 3. FETCH SCHEMA STATE (via internal migrations table if using migrations)
    let lastMigration = "UNKNOWN (Using db push)";
    try {
        const migrations = await prisma.$queryRaw`SELECT migration_name FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 1`;
        if (Array.isArray(migrations) && migrations.length > 0) {
            lastMigration = migrations[0].migration_name;
        }
    } catch (e) {
        console.warn("[SRE-GUARD] Warning: No robust migration history found (_prisma_migrations not found). Ensure you are not relying solely on db push in PRD.");
    }

    console.log("=========================================");
    console.log(`✅ SRE SYSTEM VERIFICATION PASSED`);
    console.log(`🌍 ENVIRONMENT        : ${env.toUpperCase()}`);
    console.log(`🗄️ DATABASE TARGET    : ${safeDbUrl}`);
    console.log(`🔐 DB FINGERPRINT     : ${dbFingerprint}`);
    console.log(`📜 LAST MIGRATION     : ${lastMigration}`);
    console.log("=========================================");

    return { env, dbFingerprint, lastMigration };
  }
}

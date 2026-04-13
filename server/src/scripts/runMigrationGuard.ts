import { PrismaClient } from '@prisma/client';
import { safeMigrationGuardEngine } from '../utils/PrismaMigrationGuard';
import fs from 'fs';
import path from 'path';

function checkModeLexicalRules(): void {
  const migrationsPath = path.join(__dirname, '../../../prisma/migrations');
  if (!fs.existsSync(migrationsPath)) return;
  const migrations = fs.readdirSync(migrationsPath);
  for (const dir of migrations) {
    const filePath = path.join(migrationsPath, dir, 'migration.sql');
    if (fs.existsSync(filePath)) {
      const sqlObjectContent = fs.readFileSync(filePath, 'utf-8').toUpperCase();
      if (sqlObjectContent.includes('DROP TABLE') || sqlObjectContent.includes('ALTER TABLE') && sqlObjectContent.includes('DROP COLUMN')) {
        console.error(`🚨 [SRE CHECK FATAL] Destructive Mutation Encontrada Off-line: ${dir}`);
        process.exit(1);
      }
    }
  }
}

async function startEngine(): Promise<void> {
  const SRE_MODE = process.env.GUARD_MODE || 'execute';

  if (SRE_MODE === 'check') {
    console.log("🛡️ [SRE CHECK MODE] Gatekeeper offline ativado. Validando DDL no sistema de arquivos...");
    checkModeLexicalRules();
    console.log("✅ [SRE-GUARD-INFO] Analysis Lexical Passiva Validada. Deploy liberado no Actions.");
    process.exit(0);
  } else {
    console.log("🛡️ [SRE EXECUTE MODE] Engine de boot estrita conectada ao contexto de máquina.");
    const prisma = new PrismaClient();
    try {
      await safeMigrationGuardEngine(prisma);
      await prisma.$disconnect();
      process.exit(0);
    } catch (error: any) {
      console.error(error.message);
      await prisma.$disconnect();
      process.exit(1);
    }
  }
}

startEngine();

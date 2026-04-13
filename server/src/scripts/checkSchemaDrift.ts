import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function runDriftCheck() {
  try {
    console.log("-> [SRE] Inicializando Gate de Prisma Migrate Status (Schema Baseline Alignment)...");
    const { stdout, stderr } = await execAsync('npx prisma migrate status');
    
    // Check for explicit failed migrations or unreachable DB
    if (stdout.includes('failed to apply') || stdout.includes('failed') || stderr.includes('failed') || stderr.includes('P1001')) {
        console.error("🚨 [SRE DRIFT ALERT] Prisma Detectou failed migrations ou banco fora do ar.");
        console.error(stdout);
        console.error(stderr);
        process.exit(1);
    }
    
    if (stdout.includes('pending migrations') || stdout.includes('pending migration')) {
        console.log("⚠️ [SRE] Migrations pendentes detectadas. ALLOWED. O container irá aplicar via migrate deploy.");
        console.log(stdout);
        process.exit(0);
    }

    if (stdout.includes('Database schema is in sync with Prisma schema') || stdout.includes('No pending migrations')) {
        console.log("✅ [SRE] Gateway de mutações reportou integridade. Zero divergências lógicas no Banco.");
        process.exit(0);
    }

    // Default allow if it didn't explicitly fail
    console.log("⚠️ [SRE] Status desconhecido mas não-falho. ALLOWED.");
    console.log(stdout);
    process.exit(0);

  } catch (error: any) {
    if (error.stdout && (error.stdout.includes('failed') || error.stdout.includes('P3009'))) {
        console.error("🚨 [SRE FATAL] Failed migrations no banco (P3009) detectado pelo status.");
        console.error(error.stdout);
        process.exit(1);
    }
    
    // prisma migrate status exits with 1 if there are pending migrations!
    if (error.stdout && error.stdout.includes('pending')) {
        console.log("⚠️ [SRE] Migrations pendentes detectadas via exit code 1. ALLOWED.");
        console.log(error.stdout);
        process.exit(0);
    }

    console.error("🚨 [SRE FATAL] Banco inatingível ou erro fatal no CLI.");
    console.error(error.message);
    process.exit(1);
  }
}

runDriftCheck();

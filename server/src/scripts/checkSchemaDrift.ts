import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function runDriftCheck() {
  try {
    console.log("-> [SRE] Inicializando Gate de Prisma Migrate Status (Schema Baseline Alignment)...");
    const { stdout, stderr } = await execAsync('npx prisma migrate status');
    
    if (stdout.includes('Database schema is in sync with Prisma schema') || stdout.includes('No pending migrations')) {
        console.log("✅ [SRE] Gateway de mutações reportou integridade. Zero divergências lógicas no Banco.");
        process.exit(0);
    } else {
        console.error("🚨 [SRE DRIFT ALERT] Prisma Detectou desbalanceamento. Impossível assumir nuvem.");
        console.error(stdout);
        process.exit(1);
    }
  } catch (error: any) {
    console.error("🚨 [SRE FATAL] Drift Barrier acionada. Deploy abortado passivamente devido a divergências de Schema.");
    console.error(error.message);
    process.exit(1);
  }
}

runDriftCheck();

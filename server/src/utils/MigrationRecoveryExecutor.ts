import { PrismaClient } from '@prisma/client';

export type ResolutionActionType = 
  | 'resolve_applied' 
  | 'resolve_rolled_back' 
  | 'diagnose_only';

export async function executeIncidentManualRecoveryProcedure(
  prisma: PrismaClient,
  migrationName: string,
  resolutionContext: ResolutionActionType
): Promise<void> {

  console.log(`🛡️ [SRE MANUAL RECOVERY PROTOCOL] Acionado.`);
  console.log(`-> Target Incident Object: ${migrationName}`);
  console.log(`-> Commanded Override Procedure: ${resolutionContext}`);

  if (process.env.NODE_ENV === "production") {
    throw new Error("🚨 [SRE BLOCK] AUTO-RECOVERY DESABILITADO EM PRODUÇÃO");
  }

  if (resolutionContext === 'diagnose_only') {
    const audit = await prisma.$queryRaw`
      SELECT * FROM _prisma_migrations 
      WHERE migration_name = ${migrationName} 
      LIMIT 1
    `;
    console.log(`[SYS-AUDIT]`, audit);
    return;
  }

  throw new Error(`
🚨 [SRE BLOCK] Recovery automático proibido.

Execute manualmente:

npx prisma migrate resolve --applied ${migrationName}

ou

npx prisma migrate resolve --rolled-back ${migrationName}
`);
}

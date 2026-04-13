import { PrismaClient } from '@prisma/client';

export type ResolutionActionType = 'resolve_applied' | 'resolve_rolled_back' | 'diagnose_only';

export async function executeIncidentManualRecoveryProcedure(
  prisma: PrismaClient,
  migrationName: string,
  resolutionContext: ResolutionActionType
): Promise<void> {
  console.log(`🛡️ [SRE MANUAL RECOVERY PROTOCOL] Acionado.`);
  console.log(`-> Target Incident Object: ${migrationName}`);
  console.log(`-> Commanded Override Procedure: ${resolutionContext}`);

  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTO-RECOVERY DESABILITADO EM PRODUÇÃO");
  }

  // Gateway Diagnosis 
  if (resolutionContext === 'diagnose_only') {
      console.log(`[SYS-AUDIT] Executando Análise de Tracker sem aplicar mutações lógicas.`);
      const audit = await prisma.$queryRaw`SELECT * FROM _prisma_migrations WHERE migration_name = ${migrationName} LIMIT 1`;
      console.log(`[SYS-AUDIT] Database Resposta Física:`, audit);
      return;
  }

  // Gateway Recovery Modulators
  if (resolutionContext === 'resolve_applied') {
      // Re-significa migration travada assumindo intervenção externa DB manual corrigida
      await prisma.$executeRaw`UPDATE _prisma_migrations SET finished_at = NOW(), rolled_back_at = NULL WHERE migration_name = ${migrationName}`;
      console.log(`✅ [SRE RESOLVED] Tracker Forçado: ${migrationName} transacionou como APPLIED no Prisma.`);
      return;
  }

  if (resolutionContext === 'resolve_rolled_back') {
      await prisma.$executeRaw`UPDATE _prisma_migrations SET rolled_back_at = NOW() WHERE migration_name = ${migrationName}`;
      console.log(`✅ [SRE ROLLED BACK] Tracker Forçado: ${migrationName} marcado como ignorado na ORM Engine.`);
      return;
  }

  throw new Error("🚨 Gatekeeper Error: Operação desconhecida demandada ao executor restrito.");
}

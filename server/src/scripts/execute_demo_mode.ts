import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runDemoInject() {
  console.log('🟩 ------------------------------------------ 🟩');
  console.log('🥩 INITIATING EXECUTIVE DEMO INJECTION');
  console.log('🟩 ------------------------------------------ 🟩\n');

  try {
      // 1. Encontrar Terra Gaucha
      const terra = await prisma.company.findFirst({
          where: { name: { contains: 'Terra Gaucha' } }
      });
      if (!terra) throw new Error('Tenant "Terra Gaucha" not found in DB!');

      // 2. Encontrar loja correta (Orlando, Tampa ou Jacksonville iniciada pelo seeder)
      const terraStores = await prisma.store.findMany({ where: { company_id: terra.id } });
      let targetStore = terraStores.find(s => 
          s.store_name.toLowerCase().includes('orlando') || 
          s.store_name.toLowerCase().includes('tampa') ||
          s.store_name.toLowerCase().includes('jacksonville')
      );
      if (!targetStore) throw new Error('No valid demo store found for Terra Gaucha.');
      
      console.log(`[+] Target Store Locked: ${targetStore.store_name} (ID: ${targetStore.id})`);

      // 3. Limpar a área (Reversibilidade Absoluta)
      await prisma.recommendationEvent.deleteMany({
          where: { store_id: targetStore.id, description: { contains: 'DEMO_MODE' } }
      });
      await prisma.anomalyEvent.deleteMany({
          where: { store_id: targetStore.id, message: { contains: 'DEMO_MODE' } }
      });
      console.log('[+] Cleared previous DEMO_MODE anomaly events.');

      // 4. Garantir que temos um Intelligence Snapshot da ultima meia noite ou criar um Dummy
      const now = new Date();
      let dummySnapshot = await prisma.intelligenceSnapshot.findFirst({
          where: { store_id: targetStore.id }
      });
      if (!dummySnapshot) {
          dummySnapshot = await prisma.intelligenceSnapshot.create({
              data: {
                  tenant_id: terra.id,
                  store_id: targetStore.id,
                  period_start: new Date(now.getTime() - 86400000),
                  period_end: now,
                  op_risk_score: 85,
                  store_trust_score: 95,
                  ruleset_version: 'DEMO_v1'
              }
          });
          console.log('[+] Created DEMO_v1 Intelligence Snapshot.');
      }

      // 5. Injetar as 3 Anomalias Críticas (com DEMO_MODE mudo)
      const anomalies = [
          {
              snapshot_id: dummySnapshot.id,
              tenant_id: terra.id,
              store_id: targetStore.id,
              anomaly_type: 'YIELD_VARIANCE',
              severity: 'CRITICAL',
              confidence: 89,
              message: 'Lbs/Guest acima do threshold operacional esperado (+9.2%) [DEMO]',
              is_capped: false,
              trigger_value: 0.92,
              baseline_value: 0.84,
              created_at: new Date(now.getTime() - 2 * 60 * 60 * 1000) 
          },
          {
              snapshot_id: dummySnapshot.id,
              tenant_id: terra.id,
              store_id: targetStore.id,
              anomaly_type: 'INVOICE_DISCREPANCY',
              severity: 'HIGH',
              confidence: 82,
              message: 'Discrepância entre consumo e volume de compra detectada (-6.5%) [DEMO]',
              is_capped: false,
              trigger_value: -0.065,
              baseline_value: 0,
              created_at: new Date(now.getTime() - 4 * 60 * 60 * 1000) 
          },
          {
              snapshot_id: dummySnapshot.id,
              tenant_id: terra.id,
              store_id: targetStore.id,
              anomaly_type: 'RECEIVING_QC_FAILURE',
              severity: 'MEDIUM',
              confidence: 78,
              message: 'Falha no protocolo de verificação de recebimento (QC) [DEMO]',
              is_capped: false,
              trigger_value: 1,
              baseline_value: 0,
              created_at: new Date(now.getTime() - 8 * 60 * 60 * 1000) 
          }
      ];
      
      for (const anomaly of anomalies) {
          const a = await prisma.anomalyEvent.create({ data: anomaly });
          
          const expectedPriority = a.severity === 'CRITICAL' ? 'URGENT' : (a.severity === 'HIGH' ? 'HIGH' : 'MEDIUM');
          const title = a.anomaly_type === 'YIELD_VARIANCE' ? 'Action Required: Resolve Yield Anomaly' 
             : (a.anomaly_type === 'INVOICE_DISCREPANCY' ? 'Action Required: Validate Open Invoices' : 'Action Required: Review QC Log');
          const code = a.anomaly_type === 'YIELD_VARIANCE' ? 'YIELD_STATION_AUDIT' : (a.anomaly_type === 'INVOICE_DISCREPANCY' ? 'INVOICE_AUDIT' : 'QC_RECEIVING_FLUSH');
          
          await prisma.recommendationEvent.create({
              data: {
                  tenant_id: terra.id,
                  store_id: targetStore.id,
                  snapshot_id: dummySnapshot.id,
                  anomaly_id: a.id,
                  action_code: code,
                  title: title,
                  description: a.message,
                  rationale: 'Algorithm detected statistical deviation needing manager override. This action is enforced by the Garcia Rule.',
                  owner_role: 'STORE_MANAGER',
                  priority: expectedPriority,
                  status: 'PENDING',
                  deadline_at: new Date(now.getTime() + (expectedPriority === 'URGENT' ? 8 : (expectedPriority === 'HIGH' ? 24 : 48)) * 3600000),
                  created_at: a.created_at
              }
          });
      }

      console.log('\n✅ ------------------------------------------ ✅');
      console.log('DEMO STATE SUCCESSFULLY INJECTED AND ACTIONABLE');
      console.log('✅ ------------------------------------------ ✅\n');

  } catch (error: any) {
      console.error('\n❌ DEMO INJECTION FAILED:', error.message);
  } finally {
      await prisma.$disconnect();
  }
}

async function resetDemoState() {
     const terra = await prisma.company.findFirst({ where: { name: { contains: 'Terra Gaucha' } } });
     if (!terra) return;
     const terraStores = await prisma.store.findMany({ where: { company_id: terra.id } });
     const targetStore = terraStores.find(s => s.store_name.toLowerCase().includes('orlando') || s.store_name.toLowerCase().includes('tampa') || s.store_name.toLowerCase().includes('jacksonville'));
     if (targetStore) {
        await prisma.recommendationEvent.deleteMany({
           where: { store_id: targetStore.id, description: { contains: 'DEMO' } }
        });
        await prisma.anomalyEvent.deleteMany({
           where: { store_id: targetStore.id, message: { contains: 'DEMO' } }
        });
        console.log(`[+] Reverted Demo State for ${targetStore.store_name}`);
     }
}

const args = process.argv.slice(2);
if (args.includes('--reset')) {
    resetDemoState().finally(() => prisma.$disconnect());
} else {
    runDemoInject();
}

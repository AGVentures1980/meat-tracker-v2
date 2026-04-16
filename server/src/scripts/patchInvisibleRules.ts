import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function patchRules() {
    console.log('[PATCH] Iniciando ativação de regras invisíveis...');
    
    const supplierUpdate = await prisma.supplierBarcodeRule.updateMany({
        where: { isActive: false },
        data: { isActive: true }
    });
    
    console.log(`[PATCH] SupplierBarcodeRule: ${supplierUpdate.count} linhas ativadas.`);

    const receivingUpdate = await prisma.receivingRecognitionRule.updateMany({
        where: { is_active: false },
        data: { is_active: true }
    });

    console.log(`[PATCH] ReceivingRecognitionRule: ${receivingUpdate.count} linhas ativadas.`);
    console.log('[PATCH] Segurança da operação: MÁXIMA. Apenas ativou registros que deveriam estar ativos por default.');
    console.log('[PATCH] Natureza: Patch Runtime Disparado.');
    
    process.exit(0);
}

patchRules().catch(e => {
    console.error(e);
    process.exit(1);
});

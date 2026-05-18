import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

const DOMAIN_MAP: Record<string, string> = {
  'texasdebrazil.com': 'tdb-main',
  'fogo.com': '43670635-c205-4b19-99d4-445c7a683730',
  'terragaucha.com': '9e371bc2-594f-46a3-8c95-8fc91a13041f',
  'adegagaucha.com': 'ca545221-ff0c-44a1-802c-da015b516709',
  'outback.com': '66c8dc51-e1ed-48dd-8c03-57603796d22f',
  'alexgarciaventures.co': 'c9ebe4e1-ee9c-4a8d-ba64-469f4ce96b10',
  'agv.co': 'c9ebe4e1-ee9c-4a8d-ba64-469f4ce96b10',
  'agv.com': 'c9ebe4e1-ee9c-4a8d-ba64-469f4ce96b10'
};

async function run() {
  console.log('--- INICIANDO SANEAMENTO DE DADOS ---');

  // 1. Deletar Rodrigo duplicado
  try {
    const deleted = await (p as any).user.delete({
      where: { email: 'rodrigo.davila@texasdebrazil.com' }
    });
    console.log('DELETADO:', deleted.email);
  } catch (e) {
    console.log('Rodrigo duplicado não encontrado ou já deletado.');
  }

  // 2. Buscar órfãos
  const orphans = await (p as any).user.findMany({
    where: { company_id: null }
  });

  console.log(`Encontrados ${orphans.length} usuários órfãos.`);

  let updatedCount = 0;
  for (const user of orphans) {
    const domain = user.email.split('@')[1];
    const targetCompanyId = DOMAIN_MAP[domain];

    if (targetCompanyId) {
      await (p as any).user.update({
        where: { id: user.id },
        data: { company_id: targetCompanyId }
      });
      console.log(`FIXED: ${user.email} -> ${targetCompanyId}`);
      updatedCount++;
    } else {
      console.log(`SKIPPED: ${user.email} (Domínio não mapeado)`);
    }
  }

  console.log(`\nSANEAMENTO CONCLUÍDO.`);
  console.log(`Total de usuários corrigidos: ${updatedCount}`);
  
  await p.$disconnect();
}

run().catch(console.error);

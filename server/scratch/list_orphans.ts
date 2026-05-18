import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
async function run() {
  const orphans = await (p as any).user.findMany({
    where: { company_id: null },
    select: { email: true, role: true, created_at: true }
  });
  
  console.log('--- RELATÓRIO DE USUÁRIOS ÓRFÃOS (company_id: null) ---');
  console.log('Total:', orphans.length);
  
  const domains: Record<string, number> = {};
  orphans.forEach((u: any) => {
    const domain = u.email.split('@')[1];
    domains[domain] = (domains[domain] || 0) + 1;
  });
  
  console.log('\nPor Domínio:');
  Object.entries(domains).forEach(([domain, count]) => {
    console.log(` - ${domain}: ${count}`);
  });
  
  console.log('\nLista Completa:');
  orphans.forEach((u: any) => {
    console.log(` - [${u.role}] ${u.email} (Criado em: ${u.created_at.toISOString().split('T')[0]})`);
  });
  
  await p.$disconnect();
}
run().catch(console.error);

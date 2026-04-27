const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: "postgresql://postgres:jGGSjkxLCUhXQYntCHXoJQKGVRuWhIWu@yamanote.proxy.rlwy.net:48358/railway" } } });
async function main() {
  const stores = await prisma.store.findMany({ where: { company_id: '3a6ac28e-6b5e-4a60-8ad6-5bc18a4b5037' } });
  console.log("Stores for Hard Rock:", stores.map(s => s.id));
  const user = await prisma.user.findUnique({ where: { email: 'director@hardrock.brasameat.com' } });
  console.log("User company_id:", user.company_id);
  console.log("User role:", user.role);
}
main().catch(console.dir).finally(() => prisma.$disconnect());

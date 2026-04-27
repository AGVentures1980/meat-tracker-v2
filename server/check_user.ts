import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient({ datasources: { db: { url: "postgresql://postgres:jGGSjkxLCUhXQYntCHXoJQKGVRuWhIWu@yamanote.proxy.rlwy.net:48358/railway" } } });
async function main() {
  const user = await prisma.user.findUnique({ where: { email: 'director@hardrock.brasameat.com' } });
  console.log("User:", JSON.stringify(user, null, 2));
  const stores = await prisma.store.findMany({ where: { company_id: user?.company_id || undefined } });
  console.log("Stores for company:", stores.map(s => s.id));
}
main().catch(console.error).finally(() => prisma.$disconnect());

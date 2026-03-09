const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const user = await prisma.user.findUnique({ where: { email: 'alexandre@alexgarciaventures.co' }});
    console.log('Master User:', user);
    const companies = await prisma.company.findMany();
    console.log('Companies:', companies.map(c => c.id));
    const stores = await prisma.store.findMany({ select: { id: true, company_id: true } });
    console.log('Store Map:', stores.slice(0, 3));
}
main().catch(console.error).finally(() => prisma.$disconnect());

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const companies = await prisma.company.findMany();
    console.log('Companies:');
    companies.forEach(c => console.log(`- [${c.id}] ${c.name} (${c.subdomain})`));
}
main().catch(console.error).finally(() => prisma.$disconnect());

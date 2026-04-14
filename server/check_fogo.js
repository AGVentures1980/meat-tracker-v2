const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const companies = await prisma.company.findMany({ include: { stores: true } });
    for (const c of companies) {
        console.log(`Company ${c.name} (ID: ${c.id}) has ${c.stores.length} stores.`);
    }
}
main().finally(() => prisma.$disconnect());

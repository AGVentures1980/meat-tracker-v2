const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const companies = await prisma.company.findMany();
    console.log(companies.map(c => ({ id: c.id, name: c.name, subdomain: c.subdomain })));
}

main().catch(console.error).finally(() => prisma.$disconnect());

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const companies = await prisma.company.findMany();
  console.log(companies.map(c => ({ name: c.name, subdomain: c.tenant_subdomain })));
}
main().catch(console.error).finally(() => prisma.$disconnect());

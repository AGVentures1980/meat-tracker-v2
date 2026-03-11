const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const companies = await prisma.company.findMany({
    select: { name: true, subdomain: true, theme_logo_url: true, theme_bg_url: true }
  });
  console.log(JSON.stringify(companies, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());

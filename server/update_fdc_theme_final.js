const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  await prisma.company.updateMany({
    where: { subdomain: 'fogo' },
    data: {
      theme_logo_url: '/fdc-logo.svg',
      theme_bg_url: '/background_clean.jpeg'
    }
  });
  console.log("Updated FDC themes to final local paths");
}
main().catch(console.error).finally(() => prisma.$disconnect());

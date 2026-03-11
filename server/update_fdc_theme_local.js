const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  await prisma.company.updateMany({
    where: { subdomain: 'fogo' },
    data: {
      theme_logo_url: '/fdc-logo.png',
      theme_bg_url: '/fdc-bg.jpg'
    }
  });
  console.log("Updated FDC themes to local paths");
}
main().catch(console.error).finally(() => prisma.$disconnect());

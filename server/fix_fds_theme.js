const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  await prisma.company.updateMany({
    where: { subdomain: 'fogo' },
    data: {
      theme_logo_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Fogo_de_Ch%C3%A3o_logo.svg/1024px-Fogo_de_Ch%C3%A3o_logo.svg.png',
      theme_bg_url: 'https://cdn.pixabay.com/video/2022/07/26/125574-733621404_large.mp4' // Using a generic placeholder video as I don't have a direct FDC mp4 link 
    }
  });
  console.log("Fixed FDC themes");
}
main().catch(console.error).finally(() => prisma.$disconnect());

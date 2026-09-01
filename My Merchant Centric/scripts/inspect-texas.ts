import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== EXTERNAL SOURCES ===');
  const sources = await prisma.externalSource.findMany({
    include: {
      location: { include: { brand: true } },
      competitorLocation: true,
      snapshots: { orderBy: { capturedAt: 'desc' }, take: 1 }
    }
  });
  console.log(JSON.stringify(sources, null, 2));

  console.log('=== LOCATIONS ===');
  const locations = await prisma.location.findMany({
    include: { brand: true }
  });
  console.log(JSON.stringify(locations, null, 2));

  console.log('=== COMPETITOR LOCATIONS ===');
  const competitors = await prisma.competitorLocation.findMany();
  console.log(JSON.stringify(competitors, null, 2));

  console.log('=== BRANDS ===');
  const brands = await prisma.brand.findMany();
  console.log(JSON.stringify(brands, null, 2));
}

main().finally(() => prisma.$disconnect());

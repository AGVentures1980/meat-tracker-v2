import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function list() {
  const orgs = await prisma.organization.findMany();
  console.log('Organizations:', orgs.map(o => ({ id: o.id, name: o.name })));

  const locations = await prisma.location.findMany();
  console.log('Locations:', locations.map(l => ({ id: l.id, name: l.name, organizationId: l.organizationId })));

  const sources = await prisma.externalSource.findMany();
  console.log('ExternalSources:', sources.map(s => ({ id: s.id, provider: s.provider, externalLocationId: s.externalLocationId, status: s.status })));
}

list().finally(() => prisma.$disconnect());

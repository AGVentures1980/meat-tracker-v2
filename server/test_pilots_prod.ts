import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function fix() {
  const tdbCompany = await prisma.company.findFirst({
    where: { name: { contains: 'Texas' } }
  });

  if (!tdbCompany) {
    console.error("TDB company not found");
    return;
  }
  
  const cid = tdbCompany.id;
  console.log("TDB CID:", cid);

  // Unflag all
  await prisma.store.updateMany({ data: { is_pilot: false } });

  const stores = await prisma.store.findMany({ where: { company_id: cid } });
  
  const pilots = stores.filter(s => {
    const raw = s.store_name.toLowerCase();
    return raw.includes('dallas') || raw.includes('addison') || raw.includes('miami beach') || raw.includes('las vegas');
  });

  for (const s of pilots) {
    await prisma.store.update({
      where: { id: s.id },
      data: { is_pilot: true }
    });
    console.log("Enabled Pilot:", s.store_name, s.id);
  }
}

fix().finally(() => prisma.$disconnect());

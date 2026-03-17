import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
prisma.store.findMany({ where: { is_pilot: true } }).then(stores => {
  console.log(stores.map(s => ({ id: s.id, name: s.store_name, company: s.company_id })));
}).catch(console.error).finally(() => prisma.$disconnect());

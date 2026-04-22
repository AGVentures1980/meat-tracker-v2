import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
p.store.findMany().then((r: any[]) => {
  console.log(JSON.stringify(r, null, 2));
  p.$disconnect();
});

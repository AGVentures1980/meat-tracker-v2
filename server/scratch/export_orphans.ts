import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
const p = new PrismaClient();
async function run() {
  const orphans = await (p as any).user.findMany({
    where: { company_id: null },
    select: { email: true, role: true, first_name: true, last_name: true }
  });
  
  fs.writeFileSync('scratch/orphans_data.json', JSON.stringify(orphans, null, 2));
  await p.$disconnect();
}
run().catch(console.error);

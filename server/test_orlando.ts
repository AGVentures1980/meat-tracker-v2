import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
    const stores = await prisma.store.findMany({ where: { store_name: { contains: 'Orlando' } }});
    console.log("Found", stores.length, "stores");
    stores.forEach(s => console.log(s.id, s.store_name, s.company_id));
}
run();

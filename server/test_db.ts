import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const stores = await prisma.store.findMany({ include: { company: true }});
    console.log(stores.map(s => `${s.id}: ${s.store_name} | ${s.company.name}`));
}
main();

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
    const store = await prisma.store.findFirst({ where: { store_name: { contains: 'Orlando' } }});
    console.log("Orlando Store:", store);
}
run();

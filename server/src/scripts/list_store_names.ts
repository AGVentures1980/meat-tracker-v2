
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Listing all store names...');
    const stores = await prisma.store.findMany({
        select: { id: true, store_name: true }
    });

    stores.forEach(s => console.log(`${s.id}: ${s.store_name}`));
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });


import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const searchTerms = ['Santana', 'Phoenix', 'Scotts', 'Ariz', 'Juan', 'Puerto'];
    console.log('Searching for stores matching:', searchTerms.join(', '));

    for (const term of searchTerms) {
        const stores = await prisma.store.findMany({
            where: { store_name: { contains: term, mode: 'insensitive' } },
            select: { id: true, store_name: true }
        });

        console.log(`\nResults for "${term}":`);
        if (stores.length === 0) console.log('  (None)');
        stores.forEach(s => console.log(`  - ${s.id}: ${s.store_name}`));
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());

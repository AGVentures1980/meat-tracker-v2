
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Checking Store Targets ---');
    const stores = await prisma.store.findMany({
        orderBy: { store_name: 'asc' }
    });

    const standard = 1.76;
    let varied = false;

    console.log(`Found ${stores.length} stores.`);

    // Print first 5 and any disparate ones
    stores.forEach(s => {
        if (s.target_lbs_guest !== standard) {
            varied = true;
            console.log(`[DIFFERENT] ${s.store_name}: ${s.target_lbs_guest}`);
        }
    });

    if (!varied) {
        console.log('WARNING: All stores have 1.76 target!');
    } else {
        console.log('SUCCESS: Varied targets detected.');
    }

    console.log('--- Sample (Top 5) ---');
    stores.slice(0, 5).forEach(s => console.log(`${s.store_name}: ${s.target_lbs_guest}`));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());

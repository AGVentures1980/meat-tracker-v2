
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Verifying StoreMeatTarget for Store 20 (Addison)...');

    const targets = await prisma.storeMeatTarget.findMany({
        where: { store_id: 20 },
        orderBy: { target: 'desc' }
    });

    console.table(targets.map(t => ({
        Protein: t.protein,
        Target: t.target.toFixed(3)
    })));

    if (targets.length > 0) {
        console.log('✅ Verification Successful: Targets found in DB.');
    } else {
        console.error('❌ No targets found for Store 20.');
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());

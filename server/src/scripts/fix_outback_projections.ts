import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Fixing Outback Pilot Store Targets for A La Carte Math...");

    const stores = await prisma.store.findMany({
        where: { company_id: 'outback-pilot' }
    });

    for (const store of stores) {
        // Deterministic variance for incidence around 35%
        const hashVar = (store.id * 11) % 100;
        const incidence = 0.30 + ((hashVar / 100) * 0.10); // 30% to 40%

        await prisma.store.update({
            where: { id: store.id },
            data: {
                target_lbs_guest: parseFloat(incidence.toFixed(3)),
                target_cost_guest: 10.50,
                lunch_price: 29.99,
                dinner_price: 29.99
            }
        });
        console.log(`Updated Outback Store ${store.store_name} -> Incidence: ${incidence.toFixed(3)}`);
    }

    console.log("Complete.");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

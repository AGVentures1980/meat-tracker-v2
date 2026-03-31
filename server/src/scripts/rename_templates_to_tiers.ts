import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Renaming templates to TIER nomenclature...");

    const updates = [
        { oldName: 'High Volume', newName: 'TIER 1 (High Volume)' },
        { oldName: 'Premium Mix', newName: 'TIER 2 (Premium Mix)' },
        { oldName: 'Ribs-Heavy', newName: 'TIER 3 (Value / Ribs)' },
        { oldName: 'Special Event', newName: 'TIER 4 (Special Event)' },
        { oldName: 'Standard Rodizio', newName: 'TIER 5 (Standard Calibrated)' },
        { oldName: 'Blank Template', newName: 'Blank Custom Tier' },
    ];

    for (const { oldName, newName } of updates) {
        const result = await prisma.storeTemplate.updateMany({
            where: { name: oldName },
            data: { name: newName }
        });
        console.log(`Renamed '${oldName}' to '${newName}': ${result.count} updated.`);
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

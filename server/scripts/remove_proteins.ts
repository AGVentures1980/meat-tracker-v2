
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🧹 Starting Global Protein Cleanup...');

    const PROTEINS_TO_REMOVE = ['Alcatra', 'Pork Belly', 'Ribeye'];

    // Helper to allow partial matching if needed, but request implied specific removal.
    // We will matching exact or case-insensitive name.

    for (const protein of PROTEINS_TO_REMOVE) {
        console.log(`\nProcessing removal of: ${protein}...`);

        // 1. Remove from Order Items (Sales)
        const deletedSales = await prisma.orderItem.deleteMany({
            where: {
                OR: [
                    { item_name: { contains: protein, mode: 'insensitive' } },
                    { protein_type: { contains: protein, mode: 'insensitive' } }
                ]
            }
        });
        console.log(`   - Deleted ${deletedSales.count} sales records.`);

        // 2. Remove from Inventory Records
        const deletedInv = await prisma.inventoryRecord.deleteMany({
            where: {
                item_name: { contains: protein, mode: 'insensitive' }
            }
        });
        console.log(`   - Deleted ${deletedInv.count} inventory records.`);

        // 3. Remove from Purchase Records
        const deletedPurchases = await prisma.purchaseRecord.deleteMany({
            where: {
                item_name: { contains: protein, mode: 'insensitive' }
            }
        });
        console.log(`   - Deleted ${deletedPurchases.count} purchase records.`);

        // 4. Remove from Store Meat Targets
        const deletedTargets = await prisma.storeMeatTarget.deleteMany({
            where: {
                protein: { contains: protein, mode: 'insensitive' }
            }
        });
        console.log(`   - Deleted ${deletedTargets.count} target configurations.`);
    }

    // 5. Clean up System Settings "meat_standards" if they exist there in JSON
    console.log('\nChecking System Settings...');
    const meatStandardsSetting = await prisma.systemSettings.findUnique({ where: { key: 'meat_standards' } });
    if (meatStandardsSetting && meatStandardsSetting.type === 'json') {
        let standards = JSON.parse(meatStandardsSetting.value);
        let updated = false;

        for (const p of PROTEINS_TO_REMOVE) {
            // Check keys case-insensitively
            const key = Object.keys(standards).find(k => k.toLowerCase() === p.toLowerCase());
            if (key) {
                delete standards[key];
                updated = true;
                console.log(`   - Removed ${p} from meat_standards JSON.`);
            }
        }

        if (updated) {
            await prisma.systemSettings.update({
                where: { key: 'meat_standards' },
                data: { value: JSON.stringify(standards) }
            });
            console.log('   - Saved updated meat_standards.');
        } else {
            console.log('   - No changes needed in meat_standards.');
        }
    }

    console.log('\n✅ Cleanup Complete!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

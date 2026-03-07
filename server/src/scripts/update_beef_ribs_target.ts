import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateBeefRibsTarget() {
    console.log('🔄 Updating Beef Ribs target across all stores to 0.16 (25 guests/slab)...');
    try {
        const result = await prisma.storeMeatTarget.updateMany({
            where: {
                protein: 'Beef Ribs'
            },
            data: {
                target: 0.16
            }
        });
        console.log(`✅ Updated ${result.count} StoreMeatTarget records for Beef Ribs.`);

        // Also update CompanyProduct if it has a standard_target
        const productResult = await (prisma as any).companyProduct.updateMany({
            where: {
                name: 'Beef Ribs'
            },
            data: {
                standard_target: 0.16
            }
        });
        console.log(`✅ Updated ${productResult.count} CompanyProduct records for Beef Ribs.`);

    } catch (e) {
        console.error('❌ Error updating Beef Ribs targets:', e);
    } finally {
        await prisma.$disconnect();
    }
}

updateBeefRibsTarget();

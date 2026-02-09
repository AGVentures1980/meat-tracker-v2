
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Removing Alcatra Targets from Database...');

    // Delete StoreMeatTarget entries for 'Alcatra'
    const result = await prisma.storeMeatTarget.deleteMany({
        where: {
            protein: 'Alcatra'
        }
    });

    console.log(`✅ Deleted ${result.count} Alcatra target records.`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());

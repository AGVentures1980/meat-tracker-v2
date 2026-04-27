import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkUsers() {
    try {
        const company = await prisma.company.findFirst({
            where: { subdomain: 'hardrock' }
        });

        if (!company) {
            console.log('Hard Rock company not found.');
            return;
        }

        const users = await prisma.user.findMany({
            where: { company_id: company.id }
        });

        console.log(`Found ${users.length} users for Hard Rock.`);
        for (const user of users) {
            console.log(`- ${user.email} (Role: ${user.role})`);
        }
    } catch (error) {
        console.error('Error checking users:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkUsers();

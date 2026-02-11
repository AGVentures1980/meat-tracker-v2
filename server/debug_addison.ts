
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function debug() {
    try {
        console.log(`Checking ALL logs in PrepLog...`);

        const logs = await prisma.prepLog.findMany({
            orderBy: { created_at: 'desc' },
            take: 10,
            include: { store: true }
        });

        console.log('JSON_START');
        console.log(JSON.stringify({ logs }, null, 2));
        console.log('JSON_END');
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

debug();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    try {
        const date = new Date();
        const logs = await prisma.prepLog.findMany({
            where: { date: date },
            select: { store_id: true, forecast: true, created_at: true, data: true }
        });
        console.log("Success:", logs.length);
    } catch (err) {
        console.error("Error:", err);
    } finally {
        await prisma.$disconnect();
    }
}
run();

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
    const user = await prisma.user.findUnique({ where: { email: 'addison@texasdebrazil.com' } });
    if (!user) return console.log("User not found!");
    console.log("User:", user.id, "Store:", user.store_id);

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 2);

    const logs = await prisma.wasteLog.findMany({
        where: { store_id: user.store_id || 1, date: { gte: yesterday } }
    });

    console.log("Waste Logs:", logs.length, logs);
}

run().finally(() => prisma.$disconnect());

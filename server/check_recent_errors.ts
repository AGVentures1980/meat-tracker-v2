import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkErrors() {
    try {
        const recentErrors = await prisma.auditLog.findMany({
            where: {
                action: {
                    contains: 'error',
                    mode: 'insensitive'
                },
                created_at: {
                    gte: new Date(Date.now() - 48 * 60 * 60 * 1000)
                }
            },
            orderBy: { created_at: 'desc' },
            take: 20
        });

        console.log(`Found ${recentErrors.length} recent error logs.`);
        for (const log of recentErrors) {
            console.log(`[${log.created_at}] Action: ${log.action}, Details: ${JSON.stringify(log.details)}`);
        }
    } catch (error) {
        console.error('Error checking logs:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkErrors();

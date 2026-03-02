const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkVault() {
    try {
        const messages = await prisma.ownerVaultMessage.findMany({
            orderBy: { created_at: 'desc' },
            take: 5
        });
        console.log("Last 5 Idea Vault Messages:");
        messages.forEach(m => {
            console.log(`[${m.created_at.toISOString()}] ${m.sender}: ${m.text}`);
            if (m.file_url) console.log(`  File: ${m.file_name} (${m.file_type}) - ${m.file_url}`);
        });
    } catch (e) {
        console.error("Error fetching messages:", e);
    } finally {
        await prisma.$disconnect();
    }
}

checkVault();

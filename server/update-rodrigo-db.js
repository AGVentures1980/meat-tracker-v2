const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const urls = [
    'postgresql://postgres:jGGSjkxLCUhXQYntCHXoJQKGVRuWhIWu@yamanote.proxy.rlwy.net:48358/railway'
];

async function run() {
    const prisma = new PrismaClient({ datasources: { db: { url: urls[0] } } });
    
    try {
        await prisma.$connect();
        
        console.log("Hashing new password...");
        const newHash = await bcrypt.hash('TDB2026@', 10);
        
        console.log("Updating target Rodrigo (rodrigodavila@texasdebrazil.com)...");
        const updatedUser = await prisma.user.update({
            where: { email: 'rodrigodavila@texasdebrazil.com' },
            data: { password_hash: newHash }
        });
        console.log(`Updated successfully: ${updatedUser.email}`);
        
        console.log("Deleting other Rodrigos...");
        const toDelete = ['rodrigo.davila@texasdebrazil.com', 'rodrigo@fogo.com'];
        for (const email of toDelete) {
            try {
                await prisma.user.delete({ where: { email } });
                console.log(`Deleted: ${email}`);
            } catch (err) {
                console.log(`Could not delete ${email} (Maybe it doesn't exist or has foreign keys). Error: ${err.message}`);
            }
        }
        
        console.log("Done.");
    } catch (e) {
        console.error("Error during DB operations:", e);
    } finally {
        await prisma.$disconnect();
    }
}
run();

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

// Connect to Local SQLite just for rapid Testing of Prisma's insert cycle
const prisma = new PrismaClient();

async function main() {
    const plainPassword = 'TDB2026@';
    
    // Hash Memory Test
    console.log("Memory Test Started...");
    const hash = await bcrypt.hash(plainPassword, 10);
    console.log("Generated:", hash);
    console.log("Memory validates:", await bcrypt.compare(plainPassword, hash));
    
    // DB Test
    console.log("\nDatabase Test Started...");
    const user = await prisma.user.upsert({
        where: { email: 'rodtest@tmp' },
        update: { password_hash: hash },
        create: { email: 'rodtest@tmp', password_hash: hash, role: 'director' }
    });
    
    console.log("DB Saved Hash:", user.password_hash);
    console.log("Strings Match?", hash === user.password_hash);
    console.log("Compare Validates?", await bcrypt.compare(plainPassword, user.password_hash));
    
    await prisma.user.delete({ where: { email: 'rodtest@tmp' } });
}
main().finally(() => prisma.$disconnect());

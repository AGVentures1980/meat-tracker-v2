const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const urls = [
    'postgresql://postgres:jGGSjkxLCUhXQYntCHXoJQKGVRuWhIWu@yamanote.proxy.rlwy.net:48358/railway'
];

async function run() {
    const prisma = new PrismaClient({ datasources: { db: { url: urls[0] } } });
    const users = await prisma.user.findMany({
        where: { email: { contains: 'rodrigo', mode: 'insensitive' } }
    });
    
    const possiblePasswords = ['TDB2026@', 'TDB-Dir-2026', 'demo123', 'admin123', 'password123'];
    
    for (const u of users) {
        console.log(`\nEmail: ${u.email}`);
        let found = false;
        for (const pwd of possiblePasswords) {
            if (bcrypt.compareSync(pwd, u.password_hash)) {
                console.log(`  -> Match found! Password is: ${pwd}`);
                found = true;
                break;
            }
        }
        if (!found) {
            console.log(`  -> No match among default passwords.`);
        }
    }
    await prisma.$disconnect();
}
run();

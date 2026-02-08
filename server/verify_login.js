
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function verify() {
    const email = 'dallas@texasdebrazil.com';
    const password = 'Dallas2026';

    console.log(`Checking user: ${email}`);

    const user = await prisma.user.findUnique({
        where: { email }
    });

    if (!user) {
        console.error('❌ User not found in database!');
        return;
    }

    console.log(`User found. Role: ${user.role}`);
    console.log(`Stored Hash: ${user.password_hash.substring(0, 10)}...`);

    const valid = await bcrypt.compare(password, user.password_hash);

    if (valid) {
        console.log('✅ Password Match! Credentials are correct.');
    } else {
        console.error('❌ Password Mismatch! The stored hash does not match "Dallas2026".');

        // Re-hash and update if wrong
        console.log('Fixing password...');
        const newHash = await bcrypt.hash(password, 10);
        await prisma.user.update({
            where: { email },
            data: { password_hash: newHash }
        });
        console.log('✅ Password updated to "Dallas2026"');
    }
}

verify()
    .catch(console.error)
    .finally(() => prisma.$disconnect());

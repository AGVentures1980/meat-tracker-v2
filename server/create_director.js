
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
    const email = 'dallas@texasdebrazil.com';
    const password = 'Dallas2026';
    const role = 'director';
    const name = 'Director Dallas';

    console.log(`Hashing password for ${email}...`);
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log('Upserting user...');
    const user = await prisma.user.upsert({
        where: { email },
        update: {
            password_hash: hashedPassword,
            role: role
        },
        create: {
            email,
            password_hash: hashedPassword,
            role: role
        },
    });

    console.log(`SUCCESS: User ${user.email} created/updated with role ${user.role}`);
}

main()
    .catch((e) => {
        console.error('ERROR:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

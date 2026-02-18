
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    const email = 'dallas@texasdebrazil.com';
    const password = 'Dallas2026';
    const role = 'director'; // Matches the enum in schema
    const name = 'Director Dallas';

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.upsert({
        where: { email },
        update: {
            password_hash: hashedPassword,
            role: role
        },
        create: {
            email,
            password_hash: hashedPassword,
            role: role,
        },
    });

    console.log(`User ${user.email} created/updated with role ${user.role}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

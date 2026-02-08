
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

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
            password: hashedPassword,
            role: role,
            name: name
        },
        create: {
            email,
            password: hashedPassword,
            role: role,
            name: name,
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

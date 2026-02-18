import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const userEmail = 'alexandre@alexgarciaventures.co';
    const user = await prisma.user.upsert({
        where: { email: userEmail },
        update: { role: 'admin' },
        create: {
            email: userEmail,
            password_hash: '$2b$10$wKIDi5MUpC1V9p.6z6M4uee0yM9T.zQ5I3F9U8Xy6O8.l6jM/4w3.', // Default placeholder if new
            role: 'admin'
        }
    });
    console.log('User updated/created:', user.email, 'Role:', user.role);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

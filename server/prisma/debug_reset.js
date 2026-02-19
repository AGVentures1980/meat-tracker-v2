const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
    const email = 'alexandre@alexgarciaventures.co';
    const newPassword = 'Ag2113@9';

    console.log(`🔍 DIAGNOSTIC RESET for ${email}`);
    console.log(`Target DB: ${process.env.DATABASE_URL}`);

    // 1. Generate Hash
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    console.log(`🔑 Generated Hash: ${hashedPassword.substring(0, 10)}...`);

    // 2. Update DB
    try {
        const user = await prisma.user.upsert({
            where: { email },
            update: {
                password_hash: hashedPassword,
                force_change: false,
                last_password_change: new Date()
            },
            create: {
                email,
                password_hash: hashedPassword,
                role: 'admin',
                force_change: false,
                last_password_change: new Date()
            }
        });
        console.log(`✅ User Updated/Created: ID=${user.id}, Role=${user.role}`);

        // 3. Verify Immediately
        const verifyUser = await prisma.user.findUnique({ where: { email } });
        const match = await bcrypt.compare(newPassword, verifyUser.password_hash);

        if (match) {
            console.log(`✅ VERIFICATION SUCCESS: Password '${newPassword}' matches hash in DB.`);
        } else {
            console.error(`❌ VERIFICATION FAILED: Password '${newPassword}' DOES NOT match hash in DB.`);
        }

    } catch (error) {
        console.error(`❌ Error operation: ${error.message}`);
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

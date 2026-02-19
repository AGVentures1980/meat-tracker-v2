const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
    const email = 'alexandre@alexgarciaventures.co';
    const newPassword = 'Ag2113@9';

    console.log(`🔐 Updating password for ${email}...`);

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    try {
        const user = await prisma.user.findUnique({ where: { email } });

        if (user) {
            await prisma.user.update({
                where: { email },
                data: {
                    password_hash: hashedPassword,
                    force_change: false // Ensure they aren't forced to change it immediately
                }
            });
            console.log(`✅ Password successfully updated for: ${user.email}`);
        } else {
            console.log(`⚠️ User ${email} not found. Creating new admin user...`);
            await prisma.user.create({
                data: {
                    email,
                    password_hash: hashedPassword,
                    role: 'admin',
                    force_change: false,
                    last_password_change: new Date()
                }
            });
            console.log(`✅ User created and password set.`);
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

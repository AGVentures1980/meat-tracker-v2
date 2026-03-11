import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const email = 'ngiachini@fogo.com';
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
        console.log("User found:", user.email, "Role:", user.role);
        
        // Let's just reset the password to something standard 
        // because we can't unhash the old one.
        const newPassword = 'FogoPassword2025!';
        const hash = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { email },
            data: { password_hash: hash }
        });
        console.log("Password successfully reset to:", newPassword);

    } else {
        console.log("User not found: " + email);
    }
}
main().finally(() => prisma.$disconnect());

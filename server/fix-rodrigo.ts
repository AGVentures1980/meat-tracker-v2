import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function fixPassword() {
    try {
        console.log("Generating fresh bcryptjs hash for TDB2026@...");
        const hash = await bcrypt.hash('TDB2026@', 10);
        
        console.log("Updating database row for rodrigodavila@texasdebrazil.com...");
        const result = await prisma.user.updateMany({
            where: { email: 'rodrigodavila@texasdebrazil.com' },
            data: { password_hash: hash }
        });
        
        console.log(`Successfully updated ${result.count} record(s).`);
    } catch (e) {
        console.error("Error updating password:", e);
    } finally {
        await prisma.$disconnect();
    }
}

fixPassword();

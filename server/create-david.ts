import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createDavid() {
    try {
        const hash = await bcrypt.hash('Castro2026@', 10);
        
        // Find TDB tenant
        const tdb = await prisma.company.findFirst({
            where: { name: { contains: 'Texas de Brazil', mode: 'insensitive' } }
        });

        if (!tdb) {
            console.log("Texas de Brazil company not found!");
            return;
        }

        const user = await prisma.user.upsert({
            where: { email: 'davidcastro@texasdebrazil.com' },
            update: { password_hash: hash, first_name: 'David', last_name: 'Castro', role: 'director' },
            create: {
                email: 'davidcastro@texasdebrazil.com',
                password_hash: hash,
                first_name: 'David',
                last_name: 'Castro',
                role: 'director'
            }
        });
        
        console.log(`Successfully created/updated David Castro: ${user.email} under tenant ${tdb.name}`);
    } catch (e) {
        console.error("Error creating user:", e);
    } finally {
        await prisma.$disconnect();
    }
}

createDavid();

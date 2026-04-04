import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const cid = (await prisma.company.findFirst({ where: { name: { contains: 'Texas de Brazil', mode: 'insensitive' } } }))?.id;

    if (!cid) {
        console.log('TDB Company not found!');
        return;
    }

    // Carlos (Area Manager)
    const passCarlos = await bcrypt.hash('TDB-AM-2026', 10);
    await prisma.user.upsert({
        where: { email: 'carlosrestrepo@texasdebrazil.com' },
        update: { password_hash: passCarlos, role: 'area_manager', is_primary: true },
        create: {
            email: 'carlosrestrepo@texasdebrazil.com',
            first_name: 'Carlos',
            last_name: 'Restrepo',
            password_hash: passCarlos,
            role: 'area_manager',
            is_primary: true
        }
    });
    console.log('Linked Carlos:', 'carlosrestrepo@texasdebrazil.com', 'TDB-AM-2026');

    // Rodrigo (Director)
    const passRodrigo = await bcrypt.hash('TDB2026@', 10);
    await prisma.user.upsert({
        where: { email: 'rodrigodavila@texasdebrazil.com' },
        update: { password_hash: passRodrigo, role: 'director', is_primary: true },
        create: {
            email: 'rodrigodavila@texasdebrazil.com',
            first_name: 'Rodrigo',
            last_name: 'Davila',
            password_hash: passRodrigo,
            role: 'director',
            director_region: 'National',
            is_primary: true
        }
    });
    console.log('Linked Rodrigo:', 'rodrigodavila@texasdebrazil.com', 'TDB2026@');

    // Clean up my old fake accounts so they don't break anything or cause confusion
    await prisma.user.deleteMany({
        where: {
            email: {
                in: ['carlos.am@texasdebrazil.com', 'rodrigo.davila@texasdebrazil.com', 'gm.addison@texasdebrazil.com']
            }
        }
    });
}

main().finally(() => prisma.$disconnect());

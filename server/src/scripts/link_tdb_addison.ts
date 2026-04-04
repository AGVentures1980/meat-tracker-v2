import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const cid = (await prisma.company.findFirst({ where: { name: { contains: 'Texas de Brazil', mode: 'insensitive' } } }))?.id;
    const addisonStore = await prisma.store.findFirst({ where: { store_name: { contains: 'Addison' }, company_id: cid } });

    if (!cid || !addisonStore) {
        console.log('Company or Store not found!');
        return;
    }

    const password = await bcrypt.hash('TDB-Addison-20', 10);

    const user = await prisma.user.upsert({
        where: { email: 'addison@texasdebrazil.com' },
        update: { store_id: addisonStore.id, password_hash: password },
        create: {
            email: 'addison@texasdebrazil.com',
            first_name: 'Addison',
            last_name: 'Manager',
            password_hash: password,
            role: 'manager',
            store_id: addisonStore.id,
            is_primary: true
        }
    });

    console.log('Linked addison@texasdebrazil.com to Addison Store ID:', addisonStore.id);
    console.log('Password reset to: TDB-Addison-20');
}

main().finally(() => prisma.$disconnect());

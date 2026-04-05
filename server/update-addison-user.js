require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function run() {
    try {
        console.log("Looking up Addison store...");
        const addisonStore = await prisma.store.findFirst({
            where: { store_name: { contains: 'Addison' } }
        });

        if (!addisonStore) {
            console.log("Addison store not found in db.");
            return;
        }

        console.log("Found Addison Store:", addisonStore.id);
        
        const passwordHash = await bcrypt.hash('TDB-Addison-20', 10);
        
        console.log("Upserting user addison@texasdebrazil.com ...");
        const user = await prisma.user.upsert({
            where: { email: 'addison@texasdebrazil.com' },
            update: {
                role: 'manager',
                store_id: addisonStore.id,
                password_hash: passwordHash,
                first_name: 'Addison',
                last_name: 'Manager',
                is_primary: true
            },
            create: {
                email: 'addison@texasdebrazil.com',
                first_name: 'Addison',
                last_name: 'Manager',
                role: 'manager',
                store_id: addisonStore.id,
                password_hash: passwordHash,
                is_primary: true
            }
        });
        
        console.log("Successfully updated/created user:", user.email);
        console.log("Role is now:", user.role);
    } catch(err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}
run();

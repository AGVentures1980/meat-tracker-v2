require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function run() {
    try {
        console.log("Looking for any exact store...");
        const store = await prisma.store.findFirst({
            where: { store_name: { contains: 'Addison' } }
        });

        let storeId;
        if (!store) {
            console.log("Addison store not found. Finding ANY TDB Store...");
            const anyStore = await prisma.store.findFirst();
            if(!anyStore) {
                console.log("No stores exist. Exiting.");
                return;
            }
            storeId = anyStore.id;
        } else {
            storeId = store.id;
        }

        console.log("Using Store ID:", storeId);
        
        const passwordHash = await bcrypt.hash('TDB-Addison-20', 10);
        
        console.log("Upserting user addison@texasdebrazil.com ...");
        const user = await prisma.user.upsert({
            where: { email: 'addison@texasdebrazil.com' },
            update: {
                role: 'manager',
                store_id: storeId,
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
                store_id: storeId,
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

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const urls = [
    'postgresql://postgres:jGGSjkxLCUhXQYntCHXoJQKGVRuWhIWu@yamanote.proxy.rlwy.net:48358/railway',
    'postgresql://postgres:wQfTDRItZtZqQZrmVdDrtYpXQWbYhZzM@autorack.proxy.rlwy.net:19955/railway'
];

async function trySeed(url) {
    console.log(`Trying URL: ${url.split('@')[1]}`);
    const prisma = new PrismaClient({ datasources: { db: { url } } });
    
    try {
        await prisma.$connect();
        
        // Count users to see if it's a real DB
        const count = await prisma.user.count();
        console.log(`DB has ${count} users.`);
        
        // Check if partner exists
        const exists = await prisma.user.findUnique({ where: { email: 'partner@example.com' } });
        if (exists) {
            console.log("Partner already exists here. Password Hash (first 10):", exists.password_hash.substring(0, 10));
            // Let's force update the password to partner123 just in case
        }
        
        // Upsert Partner
        const hashedPartnerPassword = await bcrypt.hash('partner123', 10);
        const partnerUser = await prisma.user.upsert({
            where: { email: 'partner@example.com' },
            update: {
                first_name: 'John',
                last_name: 'Doe (Partner)',
                role: 'partner',
                password_hash: hashedPartnerPassword
            },
            create: {
                email: 'partner@example.com',
                password_hash: hashedPartnerPassword,
                first_name: 'John',
                last_name: 'Doe (Partner)',
                role: 'partner'
            }
        });
        
        console.log(`Ensured Partner User: ${partnerUser.email}`);
        
        const partner = await prisma.partner.upsert({
            where: { user_id: partnerUser.id },
            update: {
                country: 'USA',
                tax_id: '99-9999999',
                paypal_email: 'johndoe.payouts@example.com',
                status: 'Active'
            },
            create: {
                user_id: partnerUser.id,
                legal_entity_type: 'Individual',
                country: 'USA',
                tax_id: '99-9999999',
                paypal_email: 'johndoe.payouts@example.com',
                status: 'Active'
            }
        });
        
        console.log("Success on this DB!");
        await prisma.$disconnect();
    } catch (e) {
        console.error("Failed on this DB", e.message);
    }
}

async function run() {
    for (const u of urls) {
        await trySeed(u);
    }
}

run();

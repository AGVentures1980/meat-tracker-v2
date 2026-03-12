const { PrismaClient } = require('@prisma/client');
const urls = [
    'postgresql://postgres:jGGSjkxLCUhXQYntCHXoJQKGVRuWhIWu@yamanote.proxy.rlwy.net:48358/railway',
    'postgresql://postgres:wQfTDRItZtZqQZrmVdDrtYpXQWbYhZzM@autorack.proxy.rlwy.net:19955/railway'
];

async function run() {
    for (const url of urls) {
        console.log(`Trying URL: ${url.split('@')[1]}`);
        const prisma = new PrismaClient({ datasources: { db: { url } } });
        try {
            await prisma.$connect();
            const users = await prisma.user.findMany({
                where: { email: { contains: 'rodrigo', mode: 'insensitive' } }
            });
            console.log(`Found ${users.length} Rodrigos in this DB:`);
            users.forEach(u => console.log(`- ${u.email} | Role: ${u.role} | First 10 hash chars: ${u.password_hash.substring(0, 10)}`));
            await prisma.$disconnect();
        } catch(e) { console.error("Failed on this DB", e.message); }
    }
}
run();

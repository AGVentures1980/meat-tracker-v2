const { PrismaClient } = require('@prisma/client');
// Original string: postgresql://postgres:wQfTDRItZtZqQZrmVdDrtYpXQWbYhZzM@autorack.proxy.rlwy.net:19955/railway
// This connects perfectly from within Railway, but fails externally because the proxy port rotates.
// Reading the .env file from the local root
require('dotenv').config({ path: '../.env' });
console.log("Local DB URL:", process.env.DATABASE_URL?.substring(0, 40) + "...");

const dbUrl = process.env.DATABASE_URL || "postgresql://postgres:wQfTDRItZtZqQZrmVdDrtYpXQWbYhZzM@autorack.proxy.rlwy.net:19955/railway";
const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });

async function main() {
    console.log("Fetching all users containing rodrigo in email directly via Prisma TCP...");
    const users = await prisma.user.findMany({
        where: { email: { contains: 'rodrigo', mode: 'insensitive' } },
        select: { id: true, email: true, created_at: true, password_hash: true, role: true }
    });
    console.log(users);
}
main().catch(console.error).finally(()=>prisma.$disconnect());

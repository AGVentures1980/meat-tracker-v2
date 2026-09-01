const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("Listing actual PostgreSQL tables...");
    const tables = await prisma.$queryRaw`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema='public' AND table_type='BASE TABLE'
        ORDER BY table_name;
    `;
    console.log(tables.map(t => t.table_name));
}

main().catch(console.error).finally(() => prisma.$disconnect());

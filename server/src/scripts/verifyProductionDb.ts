import { PrismaClient } from '@prisma/client';

async function main() {
    const prisma = new PrismaClient();
    try {
        console.log('--- 1. CHECKING MIGRATION HISTORY ---');
        const migrations: any[] = await prisma.$queryRaw`SELECT migration_name, finished_at, rolled_back_at FROM _prisma_migrations ORDER BY started_at ASC`;
        console.log(`Total migrations recorded in _prisma_migrations: ${migrations.length}`);
        migrations.forEach(m => {
            console.log(`  - ${m.migration_name}: finished_at=${m.finished_at ? m.finished_at.toISOString() : 'NULL'}, rolled_back_at=${m.rolled_back_at ? m.rolled_back_at.toISOString() : 'NULL'}`);
        });

        console.log('\n--- 2. CHECKING PRODUCTION TENANT COUNTS ---');
        const companyCount = await prisma.company.count();
        const storeCount = await prisma.store.count();
        console.log(`Total Companies in DB: ${companyCount}`);
        console.log(`Total Stores in DB:    ${storeCount}`);

        const companies = await prisma.company.findMany({
            select: { id: true, name: true, subdomain: true }
        });
        console.log('\nActive Companies:');
        companies.forEach((c: any) => console.log(`  - ${c.name} (${c.subdomain}) [ID: ${c.id}]`));

        const chimaCheck = await prisma.company.findFirst({
            where: { name: { contains: 'Chima', mode: 'insensitive' } }
        });
        console.log(`\nChima Company Exists: ${chimaCheck ? 'YES (WARNING)' : 'NO (CORRECT)'}`);

        const exampleCheck = await prisma.company.findFirst({
            where: { subdomain: 'example-steakhouse' }
        });
        console.log(`Example Steakhouse Company Exists: ${exampleCheck ? 'YES (WARNING)' : 'NO (CORRECT)'}`);

    } catch (err: any) {
        console.error('Database verification error:', err);
    } finally {
        await prisma.$disconnect();
    }
}

main();

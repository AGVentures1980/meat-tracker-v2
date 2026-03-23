import { PrismaClient } from '@prisma/client';

async function checkUrl(url: string, name: string) {
    console.log(`Checking ${name}...`);
    const prisma = new PrismaClient({ datasources: { db: { url } } });
    try {
        const outback = await prisma.company.findFirst({ where: { name: { contains: 'Outback' } } });
        console.log(`[${name}] Outback Company:`, outback?.name || 'NOT FOUND');
        
        const fdc = await prisma.company.findFirst({ where: { name: { contains: 'Fogo' } } });
        console.log(`[${name}] Fogo Company:`, fdc?.name || 'NOT FOUND');
    } catch (e) {
        console.error(`[${name}] Failed:`, (e as any).message);
    } finally {
        await prisma.$disconnect();
    }
}

async function main() {
    await checkUrl('postgresql://postgres:wQfTDRItZtZqQZrmVdDrtYpXQWbYhZzM@autorack.proxy.rlwy.net:19955/railway', 'autorack');
    await checkUrl('postgresql://postgres:jGGSjkxLCUhXQYntCHXoJQKGVRuWhIWu@yamanote.proxy.rlwy.net:48358/railway', 'yamanote');
}

main();

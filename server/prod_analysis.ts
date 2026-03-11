import { PrismaClient } from '@prisma/client';

const proxyUrl = 'postgresql://postgres:jGGSjkxLCUhXQYntCHXoJQKGVRuWhIWu@yamanote.proxy.rlwy.net:48358/railway';
const prisma = new PrismaClient({
    datasources: {
        db: {
            url: proxyUrl
        }
    }
});

async function main() {
    console.log('--- Connecting to PROD ---');
    const fdcCompany = await prisma.company.findFirst({
        where: { name: { contains: 'Fogo' } }
    });

    if (!fdcCompany) {
        console.log('FDC Company not found in PROD.');
        return;
    }

    console.log(`FDC Company ID: ${fdcCompany.id}\n`);

    const stores = await prisma.store.findMany({
        where: { company_id: fdcCompany.id },
        orderBy: { store_name: 'asc' }
    });

    console.log(`--- FDC Stores in PROD (${stores.length}) ---`);
    for (const store of stores) {
        console.log(`[${store.id}] ${store.store_name} | Location: ${store.location || 'N/A'}`);
    }

    const tdbTarget = await prisma.store.findFirst({
        where: { store_name: 'Tampa' }
    });
    console.log(`\nTampa Store Company ID: ${tdbTarget?.company_id}`);


    const products = await prisma.companyProduct.findMany({
        where: { company_id: fdcCompany.id },
        orderBy: { name: 'asc' }
    });

    console.log(`\n--- FDC Products in PROD (${products.length}) ---`);
    for (const p of products) {
        console.log(`- ${p.name} (${p.category})`);
    }

}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());

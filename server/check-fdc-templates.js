const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: "postgresql://postgres:wQfTDRItZtZqQZrmVdDrtYpXQWbYhZzM@autorack.proxy.rlwy.net:19955/railway" } } });

async function run() {
    try {
        const fdc = await prisma.company.findFirst({ where: { name: { contains: 'Fogo', mode: 'insensitive' } } });
        if (!fdc) return console.log("FDC company not found.");
        
        const templates = await prisma.storeTemplate.findMany({
            where: { company_id: fdc.id }
        });
        
        console.log(`Found ${templates.length} templates for FDC.`);
    } catch(e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}
run();

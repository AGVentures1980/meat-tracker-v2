import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkActivity() {
    try {
        const company = await prisma.company.findFirst({
            where: {
                name: {
                    contains: 'Hard Rock',
                    mode: 'insensitive'
                }
            }
        });

        if (!company) {
            console.log('Company "Hard Rock" not found.');
            return;
        }

        console.log(`Found Company: ${company.name} (ID: ${company.id}, Subdomain: ${company.subdomain})`);

        // Check last AuditLog entry
        const lastAudit = await prisma.auditLog.findFirst({
            where: { company_id: company.id },
            orderBy: { created_at: 'desc' }
        });

        if (lastAudit) {
            console.log(`Last AuditLog activity: ${lastAudit.created_at}`);
        } else {
            console.log('No AuditLog activity found for this company.');
        }

        // Check last AnomalyEvent entry
        const lastAnomaly = await prisma.anomalyEvent.findFirst({
            where: { tenant_id: company.id },
            orderBy: { created_at: 'desc' }
        });

        if (lastAnomaly) {
            console.log(`Last AnomalyEvent: ${lastAnomaly.created_at}`);
        } else {
            console.log('No AnomalyEvents found for this company.');
        }

        // Check stores
        const stores = await prisma.store.findMany({
            where: { company_id: company.id }
        });
        console.log(`Number of stores: ${stores.length}`);
        
        for (const store of stores) {
            console.log(`- Store: ${store.store_name} (ID: ${store.id})`);
        }

    } catch (error) {
        console.error('Error checking activity:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkActivity();

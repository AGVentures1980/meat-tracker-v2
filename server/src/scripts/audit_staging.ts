import { PrismaClient } from '@prisma/client';

const stagingUrl = "postgresql://postgres:jGGSjkxLCUhXQYntCHXoJQKGVRuWhIWu@hopper.proxy.rlwy.net:20472/railway";
const prisma = new PrismaClient({ datasources: { db: { url: stagingUrl } } });

async function auditStaging() {
    console.log("=== STAGING ENVIRONMENT AUDIT ===");
    console.log(`Target: hopper.proxy.rlwy.net:20472\n`);

    try {
        const companies = await prisma.company.findMany({
            include: { stores: true }
        });

        console.log(`Found ${companies.length} Companies in Staging:`);
        for (const c of companies) {
            console.log(`\n- [C] ${c.name} (Subdomain: ${c.subdomain})`);
            console.log(`    Stores (${c.stores.length}):`);
            for (const s of c.stores) {
                console.log(`    - [S] ${s.store_name} | Status: ${s.status} | ID: ${s.id}`);
            }
        }
        
        console.log("\nAudit Complete! DO NOT DELETE ANY DATA UNTIL CONFIRMATION FROM USER REACHED.");

    } catch (e: any) {
        console.log("Error running staging audit: ", e?.message);
    } finally {
        await prisma.$disconnect();
    }
}

auditStaging();

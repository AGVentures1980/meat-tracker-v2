import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const stagingUrl = "postgresql://postgres:bjfQXcrSiHnhNqvYLuSbVvwTnCZDDEyx@hopper.proxy.rlwy.net:20472/railway";
const prisma = new PrismaClient({ datasources: { db: { url: stagingUrl } } });

async function seedStagingClean() {
    console.log("=== STAGING DB CLEANUP & DEMO SEED ===");
    console.log(`Target: hopper.proxy.rlwy.net:20472`);

    try {
        console.log("\n[1/3] Purging all client data...");
        // Wipe in correct dependency order
        await prisma.supportTicket.deleteMany();
        await prisma.recommendationEvent.deleteMany();
        await prisma.anomalyEvent.deleteMany();
        await prisma.intelligenceLog.deleteMany();
        await prisma.intelligenceSnapshot.deleteMany();
        await prisma.outletForecastLog.deleteMany();
        await prisma.outlet.deleteMany();
        await prisma.meatUsage.deleteMany();
        await prisma.inventoryCount.deleteMany();
        await prisma.receivingEvent.deleteMany();
        
        await prisma.store.deleteMany();
        await prisma.user.deleteMany();
        
        const companies = await prisma.company.findMany();
        for (const c of companies) {
            if (c.subdomain !== 'demo-test') {
                await prisma.company.delete({ where: { id: c.id } });
            }
        }
        console.log("Client data absolutely purged.");

        console.log("\n[2/3] Seeding Demo Company & Stores...");
        const demoCompany = await prisma.company.upsert({
            where: { id: 'staging-demo' },
            update: {},
            create: {
                id: 'staging-demo',
                name: 'Demo Restaurant (Staging)',
                subdomain: 'demo',
                plan: 'enterprise'
            }
        });

        await prisma.store.upsert({
            where: { id: 9001 },
            update: {},
            create: { id: 9001, company_id: demoCompany.id, store_name: 'Demo Store Alpha', status: 'ACTIVE', location: 'Demo Location' }
        });
        await prisma.store.upsert({
            where: { id: 9002 },
            update: {},
            create: { id: 9002, company_id: demoCompany.id, store_name: 'Demo Store Beta', status: 'ACTIVE', location: 'Demo Location' }
        });

        console.log("\n[3/3] Seeding Demo User...");
        const hash = await bcrypt.hash('StagingDemo@2026!', 10);
        await prisma.user.upsert({
            where: { email: 'demo@staging.brasameat.com' },
            update: { password_hash: hash },
            create: {
                email: 'demo@staging.brasameat.com',
                first_name: 'Staging',
                last_name: 'Admin',
                password_hash: hash,
                role: 'admin',
                company_id: demoCompany.id,
                is_active: true
            }
        });

        console.log("\nStaging environment successfully formatted to DEMO state.");
    } catch (e: any) {
        console.error("FATAL ERROR IN STAGING CLEANUP: ", e.message);
    } finally {
        await prisma.$disconnect();
    }
}

seedStagingClean();

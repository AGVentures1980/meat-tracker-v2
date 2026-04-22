import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { subDays, startOfDay } from 'date-fns';

const prisma = new PrismaClient();

async function run() {
    console.log("=== STARTING PHASE 5 PILOT SEED (HARD ROCK TAMPA) ===");

    const tampaStore = await prisma.store.findFirst({ where: { store_name: { contains: 'Tampa' } } }) 
                    || await prisma.store.findFirst({ where: { id: 1202 } })
                    || await prisma.store.findFirst();
                    
    if (!tampaStore) {
        throw new Error("Store not found. Ensure Phase 2 seeding was complete.");
    }
    
    const companyId = tampaStore.company_id || 'tdb-main'; 
    const storeId = tampaStore.id;
    console.log(`Targeting Company: ${companyId} | Store: ${storeId}`);

    const coOutlet = await prisma.outlet.findFirst({ where: { slug: 'council-oak-tampa' } });
    const rezOutlet = await prisma.outlet.findFirst({ where: { slug: 'rez-grill-tampa' } });
    const dockOutlet = await prisma.outlet.findFirst({ where: { slug: 'main-dock-tampa' } });
    const comOutlet = await prisma.outlet.findFirst({ where: { slug: 'commissary-tampa' } });

    const coId = coOutlet?.id || 'council-oak-tampa';
    const rezId = rezOutlet?.id || 'rez-grill-tampa';
    const dockId = dockOutlet?.id || 'main-dock-tampa';
    const comId = comOutlet?.id || 'commissary-tampa';

    // --- TASK B.1: CREATE USERS (Bcrypt Hashed) ---
    const users = [
        { email: 'director@hardrock.brasameat.com', role: 'corporate_director', default_landing: 'COMPANY', region_id: null, store_id: null, outletIds: [], pass: 'HardRock@2026!Corp' },
        { email: 'regional.usa@hardrock.brasameat.com', role: 'regional_director', default_landing: 'COMPANY', region_id: 'USA', store_id: null, outletIds: [], pass: 'HardRock@2026!Regional' },
        { email: 'gm.tampa@hardrock.brasameat.com', role: 'property_manager', default_landing: 'PROPERTY', region_id: null, store_id: storeId, outletIds: [], pass: 'HardRock@2026!Tampa' },
        { email: 'chef.tampa@hardrock.brasameat.com', role: 'executive_chef', default_landing: 'PROPERTY', region_id: null, store_id: storeId, outletIds: [], pass: 'HardRock@2026!Chef' },
        { email: 'manager.counciloak@hardrock.brasameat.com', role: 'outlet_manager', default_landing: 'OUTLET', region_id: null, store_id: storeId, outletIds: [coId], pass: 'HardRock@2026!CouncilOak' },
        { email: 'manager.rezgrill@hardrock.brasameat.com', role: 'outlet_manager', default_landing: 'OUTLET', region_id: null, store_id: storeId, outletIds: [rezId], pass: 'HardRock@2026!RezGrill' },
        { email: 'dock.tampa@hardrock.brasameat.com', role: 'kitchen_operator', default_landing: 'OPERATIONAL', region_id: null, store_id: storeId, outletIds: [dockId], pass: 'HardRock@2026!Dock' },
        { email: 'butcher.tampa@hardrock.brasameat.com', role: 'kitchen_operator', default_landing: 'OPERATIONAL', region_id: null, store_id: storeId, outletIds: [comId], pass: 'HardRock@2026!Butcher' },
        { email: 'auditor@hardrock.brasameat.com', role: 'read_only_viewer', default_landing: 'PROPERTY', region_id: null, store_id: storeId, outletIds: [], pass: 'HardRock@2026!Audit' },
    ];

    let createdUsersCount = 0;
    for (const u of users) {
        const existing = await prisma.user.findUnique({ where: { email: u.email } });
        if (!existing) {
            const hash = await bcrypt.hash(u.pass, 10);
            await prisma.user.create({
                data: {
                    email: u.email,
                    password_hash: hash,
                    role: u.role as Role,
                    company_id: companyId,
                    store_id: u.store_id,
                    director_region: u.region_id,
                    outletIds: u.outletIds,
                    is_active: true
                }
            });
            console.log(`[USER] Created: ${u.email}`);
        } else {
            console.log(`[USER] Skipped (already exists): ${u.email}`);
        }
        createdUsersCount++;
    }

    // --- TASK B.2: SEED 7 DAYS OF OPERATIONAL DATA ---
    const today = new Date();
    let forecastRecordsSeeded = 0;
    let meatUsageRecordsSeeded = 0;

    for (let i = 1; i <= 7; i++) {
        const d = subDays(today, i);
        const busDate = startOfDay(d);

        // 1. Council Oak (Target 0.72)
        const mgrForecastCO = Math.floor(Math.random() * 21) + 65; // 65-85
        const actualCO = mgrForecastCO + (Math.floor(Math.random() * 11) - 5);
        const lbsCO = actualCO * 0.72; // Near target
        const varCO = 0.75 > 0 ? (((lbsCO / actualCO) - 0.75) / 0.75) * 100 : 0;

        if (coOutlet) {
            const existCO = await prisma.outletForecastLog.findFirst({
                where: { outlet_id: coId, business_date: busDate, meal_period: 'DINNER' }
            });
            if (!existCO) {
                await prisma.outletForecastLog.create({
                    data: {
                        company_id: companyId,
                        store_id: storeId,
                        outlet_id: coId,
                        business_date: busDate,
                        meal_period: 'DINNER',
                        manager_forecast: mgrForecastCO,
                        actual_guests: actualCO,
                        lbs_consumed: lbsCO,
                        lbs_per_guest: actualCO > 0 ? lbsCO / actualCO : 0,
                        target_lbs_per_guest: 0.75,
                        variance_pct: varCO,
                        submitted_by_user_id: 'SYSTEM_SEED'
                    }
                });
            }
            forecastRecordsSeeded++;

            await prisma.meatUsage.upsert({
                where: { store_id_protein_date: { store_id: storeId, protein: 'Dry Aged Ribeye', date: busDate } },
                update: { outlet_id: coId },
                create: {
                    company_id: companyId,
                    store_id: storeId,
                    outlet_id: coId,
                    date: busDate,
                    protein: 'Dry Aged Ribeye',
                    lbs_total: lbsCO * 0.6,
                    source_type: 'ALACARTE'
                } as any
            }).catch(() => {});
            
            await prisma.meatUsage.upsert({
                where: { store_id_protein_date: { store_id: storeId, protein: 'Tenderloin', date: busDate } },
                update: { outlet_id: coId },
                create: {
                    company_id: companyId,
                    store_id: storeId,
                    outlet_id: coId,
                    date: busDate,
                    protein: 'Tenderloin',
                    lbs_total: lbsCO * 0.4,
                    source_type: 'ALACARTE'
                } as any
            }).catch(() => {});
            meatUsageRecordsSeeded += 2;
        }

        // 2. Rez Grill (Target 0.63)
        const mgrForecastRez = Math.floor(Math.random() * 41) + 100; // 100-140
        const actualRez = mgrForecastRez + (Math.floor(Math.random() * 31) - 15);
        const lbsRez = actualRez * 0.63; // Near target
        const varRez = 0.65 > 0 ? (((lbsRez / actualRez) - 0.65) / 0.65) * 100 : 0;

        if (rezOutlet) {
            const existRez = await prisma.outletForecastLog.findFirst({
                where: { outlet_id: rezId, business_date: busDate, meal_period: 'DINNER' }
            });
            if (!existRez) {
                await prisma.outletForecastLog.create({
                    data: {
                        company_id: companyId,
                        store_id: storeId,
                        outlet_id: rezId,
                        business_date: busDate,
                        meal_period: 'DINNER',
                        manager_forecast: mgrForecastRez,
                        actual_guests: actualRez,
                        lbs_consumed: lbsRez,
                        lbs_per_guest: actualRez > 0 ? lbsRez / actualRez : 0,
                        target_lbs_per_guest: 0.65,
                        variance_pct: varRez,
                        submitted_by_user_id: 'SYSTEM_SEED'
                    }
                });
            }
            forecastRecordsSeeded++;

            await prisma.meatUsage.upsert({
                where: { store_id_protein_date: { store_id: storeId, protein: 'NY Strip', date: busDate } },
                update: { outlet_id: rezId },
                create: {
                    company_id: companyId,
                    store_id: storeId,
                    outlet_id: rezId,
                    date: busDate,
                    protein: 'NY Strip',
                    lbs_total: lbsRez * 0.5,
                    source_type: 'ALACARTE'
                } as any
            }).catch(() => {});
            
            await prisma.meatUsage.upsert({
                where: { store_id_protein_date: { store_id: storeId, protein: 'Pork Chop', date: busDate } },
                update: { outlet_id: rezId },
                create: {
                    company_id: companyId,
                    store_id: storeId,
                    outlet_id: rezId,
                    date: busDate,
                    protein: 'Pork Chop',
                    lbs_total: lbsRez * 0.5,
                    source_type: 'ALACARTE'
                } as any
            }).catch(() => {});
            meatUsageRecordsSeeded += 2;
        }
    }

    console.log(`\n=== SEED SUMMARY ===`);
    console.log(`Users Verified/Created: ${createdUsersCount}/9`);
    console.log(`Forecast Logs Synthesized: ${forecastRecordsSeeded}`);
    console.log(`Meat Usage Logs Synthesized: ${meatUsageRecordsSeeded}`);
    console.log(`=======================================================`);
}

export { run };
// run()
//   .catch(console.error)
//   .finally(() => prisma.$disconnect());

import { PrismaClient, OutletType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Starting Enterprise Phase 2 Seeding (Outlets & Suppliers)...");

    // 1. Get the existing Hard Rock company_id from Tampa Casino
    const baseCompany = await prisma.company.findFirst({
        where: { subdomain: 'hardrock' }
    });

    if (!baseCompany) {
        throw new Error("CRITICAL: Hard Rock company not found.");
    }
    const companyId = baseCompany.id;

    // Dynamically resolve exact local Store IDs to prevent mismatches
    const tampaStore = await prisma.store.findFirst({ where: { company_id: companyId, store_name: { contains: 'Tampa' } }});
    const hollywoodStore = await prisma.store.findFirst({ where: { company_id: companyId, store_name: { contains: 'Hollywood' } }});
    const puntaStore = await prisma.store.findFirst({ where: { company_id: companyId, store_name: { contains: 'Punta Cana' } }});

    const TAMPA_ID = tampaStore?.id || 1202;
    const HOLLYWOOD_ID = hollywoodStore?.id || 1203;
    const PUNTA_ID = puntaStore?.id || 1204;
    const AC_ID = 1205;

    // 2. Ensure Atlantic City Exists conditionally
    await prisma.store.upsert({
        where: { id: AC_ID },
        update: {},
        create: {
            id: AC_ID,
            company_id: companyId,
            store_name: "Atlantic City Casino",
            location: "Atlantic City, NJ",
            status: "ACTIVE"
        }
    });

    console.log(`Store checks passed. Company ID resolved: ${companyId}`);
    console.log(`Resolved IDs -> Tampa: ${TAMPA_ID}, Hollywood: ${HOLLYWOOD_ID}, PuntaCana: ${PUNTA_ID}, AC: ${AC_ID}`);

    // 3. Define the Outlets Payload
    const outletsData = [
        // TAMPA
        { store_id: TAMPA_ID, slug: 'council-oak-tampa', name: 'Council Oak Steaks & Seafood', outlet_type: 'RESTAURANT', covers_per_day: 280 },
        { store_id: TAMPA_ID, slug: 'rez-grill-tampa', name: 'The Rez Grill', outlet_type: 'RESTAURANT', covers_per_day: 420 },
        { store_id: TAMPA_ID, slug: 'cipresso-tampa', name: 'Cipresso', outlet_type: 'RESTAURANT', covers_per_day: 320 },
        { store_id: TAMPA_ID, slug: 'hard-rock-cafe-tampa', name: 'Hard Rock Cafe', outlet_type: 'RESTAURANT', covers_per_day: 600 },
        { store_id: TAMPA_ID, slug: 'rise-kitchen-tampa', name: 'Rise Kitchen & Deli', outlet_type: 'RESTAURANT', covers_per_day: 800 },
        { store_id: TAMPA_ID, slug: 'jubao-palace-tampa', name: 'Jubao Palace Noodle Bar', outlet_type: 'RESTAURANT', covers_per_day: 400 },
        { store_id: TAMPA_ID, slug: 'sugar-factory-tampa', name: 'Sugar Factory', outlet_type: 'RESTAURANT', covers_per_day: 300 },
        { store_id: TAMPA_ID, slug: 'fresh-harvest-tampa', name: 'Fresh Harvest Buffet', outlet_type: 'RESTAURANT', covers_per_day: 500 },
        { store_id: TAMPA_ID, slug: 'rock-n-raw-tampa', name: "Rock 'N Raw", outlet_type: 'RESTAURANT', covers_per_day: 250 },
        { store_id: TAMPA_ID, slug: 'pool-bar-tampa', name: 'Pool Bar & Grill', outlet_type: 'BAR' },
        { store_id: TAMPA_ID, slug: 'poker-snack-tampa', name: 'Poker Snack Bar', outlet_type: 'BAR' },
        { store_id: TAMPA_ID, slug: 'center-bar-tampa', name: 'Center Bar', outlet_type: 'BAR' },
        { store_id: TAMPA_ID, slug: 'l-bar-tampa', name: 'L Bar', outlet_type: 'BAR' },
        { store_id: TAMPA_ID, slug: 'commissary-tampa', name: 'Central Commissary', outlet_type: 'KITCHEN' },
        { store_id: TAMPA_ID, slug: 'main-dock-tampa', name: 'Main Dock', outlet_type: 'KITCHEN' },
        { store_id: TAMPA_ID, slug: 'employee-dining-tampa', name: 'Employee Dining Room', outlet_type: 'EMPLOYEE', covers_per_day: 1400 },

        // HOLLYWOOD
        { store_id: HOLLYWOOD_ID, slug: 'council-oak-hollywood', name: 'Council Oak Steaks & Seafood', outlet_type: 'RESTAURANT' },
        { store_id: HOLLYWOOD_ID, slug: 'kuro-hollywood', name: 'Kuro', outlet_type: 'RESTAURANT' },
        { store_id: HOLLYWOOD_ID, slug: 'abiaka-hollywood', name: 'Abiaka Wood Fire Grill', outlet_type: 'RESTAURANT' },
        { store_id: HOLLYWOOD_ID, slug: 'cipresso-hollywood', name: 'Cipresso', outlet_type: 'RESTAURANT' },
        { store_id: HOLLYWOOD_ID, slug: 'markys-hollywood', name: "Marky's Caviar Lounge", outlet_type: 'RESTAURANT' },
        { store_id: HOLLYWOOD_ID, slug: 'bae-korean-hollywood', name: 'Bae Korean Grill', outlet_type: 'RESTAURANT' },
        { store_id: HOLLYWOOD_ID, slug: 'hard-rock-cafe-hollywood', name: 'Hard Rock Cafe', outlet_type: 'RESTAURANT' },
        { store_id: HOLLYWOOD_ID, slug: 'fresh-harvest-hollywood', name: 'Fresh Harvest Buffet', outlet_type: 'RESTAURANT' },
        { store_id: HOLLYWOOD_ID, slug: 'rise-kitchen-hollywood', name: 'Rise Kitchen & Deli', outlet_type: 'RESTAURANT' },
        { store_id: HOLLYWOOD_ID, slug: 'bol-hollywood', name: 'The BŌL', outlet_type: 'RESTAURANT' },
        { store_id: HOLLYWOOD_ID, slug: 'beach-club-hollywood', name: 'Beach Club Bar & Grill', outlet_type: 'BAR' },
        { store_id: HOLLYWOOD_ID, slug: 'pool-bar-hollywood', name: 'Pool Bar & Grill', outlet_type: 'BAR' },
        { store_id: HOLLYWOOD_ID, slug: 'sports-bar-hollywood', name: 'Hard Rock Sports Bar', outlet_type: 'BAR' },
        { store_id: HOLLYWOOD_ID, slug: 'pla-sports-hollywood', name: 'PLA Sports Bar', outlet_type: 'BAR' },
        { store_id: HOLLYWOOD_ID, slug: 'l-bar-hollywood', name: 'L Bar', outlet_type: 'BAR' },
        { store_id: HOLLYWOOD_ID, slug: 'oculus-bar-hollywood', name: 'Oculus Bar', outlet_type: 'BAR' },
        { store_id: HOLLYWOOD_ID, slug: 'poker-snack-hollywood', name: 'Poker Snack Bar', outlet_type: 'BAR' },
        { store_id: HOLLYWOOD_ID, slug: 'commissary-hollywood', name: 'Central Commissary', outlet_type: 'KITCHEN' },
        { store_id: HOLLYWOOD_ID, slug: 'main-dock-hollywood', name: 'Main Dock', outlet_type: 'KITCHEN' },
        { store_id: HOLLYWOOD_ID, slug: 'employee-dining-hollywood', name: 'Employee Dining Room', outlet_type: 'EMPLOYEE' },

        // PUNTA CANA
        { store_id: PUNTA_ID, slug: 'main-buffet-puntacana', name: 'Main Buffet Restaurant', outlet_type: 'RESTAURANT' },
        { store_id: PUNTA_ID, slug: 'steakhouse-puntacana', name: 'Steakhouse', outlet_type: 'RESTAURANT' },
        { store_id: PUNTA_ID, slug: 'seafood-puntacana', name: 'Seafood Restaurant', outlet_type: 'RESTAURANT' },
        { store_id: PUNTA_ID, slug: 'casual-dining-puntacana', name: 'Casual Dining', outlet_type: 'RESTAURANT' },
        { store_id: PUNTA_ID, slug: 'pool-bar-puntacana', name: 'Pool Bar', outlet_type: 'BAR' },
        { store_id: PUNTA_ID, slug: 'beach-bar-puntacana', name: 'Beach Bar', outlet_type: 'BAR' },
        { store_id: PUNTA_ID, slug: 'commissary-puntacana', name: 'Central Commissary', outlet_type: 'KITCHEN' },
        { store_id: PUNTA_ID, slug: 'main-dock-puntacana', name: 'Main Dock', outlet_type: 'KITCHEN' },
        { store_id: PUNTA_ID, slug: 'employee-dining-puntacana', name: 'Employee Dining', outlet_type: 'EMPLOYEE' },

        // ATLANTIC CITY
        { store_id: AC_ID, slug: 'council-oak-ac', name: 'Council Oak Steaks & Seafood', outlet_type: 'RESTAURANT' },
        { store_id: AC_ID, slug: 'il-mulino-ac', name: 'Il Mulino New York', outlet_type: 'RESTAURANT' },
        { store_id: AC_ID, slug: 'kuro-ac', name: 'Kuro', outlet_type: 'RESTAURANT' },
        { store_id: AC_ID, slug: 'hard-rock-cafe-ac', name: 'Hard Rock Cafe', outlet_type: 'RESTAURANT' },
        { store_id: AC_ID, slug: 'rise-kitchen-ac', name: 'Rise Kitchen & Deli', outlet_type: 'RESTAURANT' },
        { store_id: AC_ID, slug: 'council-oak-bar-ac', name: 'Council Oak Bar', outlet_type: 'BAR' },
        { store_id: AC_ID, slug: 'center-bar-ac', name: 'Center Bar', outlet_type: 'BAR' },
        { store_id: AC_ID, slug: 'pool-bar-ac', name: 'Pool Bar', outlet_type: 'BAR' },
        { store_id: AC_ID, slug: 'lobby-lounge-ac', name: 'Lobby Lounge', outlet_type: 'BAR' },
        { store_id: AC_ID, slug: 'commissary-ac', name: 'Central Commissary', outlet_type: 'KITCHEN' },
        { store_id: AC_ID, slug: 'main-dock-ac', name: 'Main Dock', outlet_type: 'KITCHEN' },
        { store_id: AC_ID, slug: 'employee-dining-ac', name: 'Employee Dining Room', outlet_type: 'EMPLOYEE' }
    ];

    let createdOutlets = 0;

    for (const data of outletsData) {
        await prisma.outlet.upsert({
            where: {
                store_id_slug: { store_id: data.store_id, slug: data.slug }
            },
            update: {
                name: data.name,
                outlet_type: data.outlet_type as OutletType,
                ...(data.covers_per_day ? { covers_per_day: data.covers_per_day } : {})
            },
            create: {
                company_id: companyId,
                store_id: data.store_id,
                slug: data.slug,
                name: data.name,
                outlet_type: data.outlet_type as OutletType,
                covers_per_day: data.covers_per_day || null
            }
        });
        createdOutlets++;
    }

    // Generate output stats
    console.log(`Successfully upserted ${createdOutlets} outlets.`);
    
    const countTampa = await prisma.outlet.count({ where: { store_id: TAMPA_ID }});
    const countHollywood = await prisma.outlet.count({ where: { store_id: HOLLYWOOD_ID }});
    const countPuntaCana = await prisma.outlet.count({ where: { store_id: PUNTA_ID }});
    const countAC = await prisma.outlet.count({ where: { store_id: AC_ID }});
    
    console.log("------------------");
    console.log(`Tampa: ${countTampa}`);
    console.log(`Hollywood: ${countHollywood}`);
    console.log(`Punta Cana: ${countPuntaCana}`);
    console.log(`Atlantic City: ${countAC}`);

    // ===============================================
    // 4. SEED SUPPLIER PROFILES PER STORE
    // ===============================================
    console.log("Seeding SupplierProfiles scoped by store_id...");

    const supplierMappings = [
        { name: "Sysco FL - Tampa", code: 'SYSCO_FL', store_id: TAMPA_ID },
        { name: "Sysco FL - Hollywood", code: 'SYSCO_FL', store_id: HOLLYWOOD_ID },
        { name: "Sysco NJ - AC", code: 'SYSCO_NJ', store_id: AC_ID },
        { name: "Intl Supplier", code: 'INTL', store_id: PUNTA_ID }
    ];

    for (const sp of supplierMappings) {
        const existing = await prisma.supplierProfile.findFirst({
            where: { companyId: companyId, store_id: sp.store_id, code: sp.code }
        });

        if (!existing) {
            await prisma.supplierProfile.create({
                data: {
                    companyId: companyId,
                    store_id: sp.store_id,
                    name: sp.name,
                    code: sp.code,
                    isActive: true
                }
            });
            console.log(`SupplierProfile CREATED: ${sp.name} [Store ${sp.store_id}]`);
        } else {
            console.log(`SupplierProfile EXISTS: ${sp.name} [Store ${sp.store_id}]`);
        }
    }

    console.log("------------------");
    console.log("Phase 2 Seeding completed successfully.");
}

main()
    .catch((e) => {
        console.error("FATAL ERROR EXECUTING SEED:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

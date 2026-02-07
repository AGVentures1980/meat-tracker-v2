const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

const ACCOUNTS = {
    "alexandre@alexgarciaventures.co": { "pass": "Ag2113@9", "name": "MASTER ADMIN", "id": "MASTER", "role": "admin" },
    "partner@example.com": { "pass": "demo123", "name": "Partner User", "id": "PARTNER", "company": "Partner Opportunities" },
    "addison@texasdebrazil.com": { "pass": "TDB-Addison-20", "name": "Addison", "id": "20", "company": "Texas de Brazil" },
    "annarbor@texasdebrazil.com": { "pass": "TDB-AnnArbor-79", "name": "AnnArbor", "id": "79", "company": "Texas de Brazil" },
    "buffalo@texasdebrazil.com": { "pass": "TDB-Buffalo-300", "name": "Buffalo", "id": "300", "company": "Texas de Brazil" },
    "cincinnati@texasdebrazil.com": { "pass": "TDB-Cinci-901", "name": "Cinci", "id": "901", "company": "Texas de Brazil" },
    "dallas@texasdebrazil.com": { "pass": "TDB-Dallas-30", "name": "Dallas", "id": "30", "company": "Texas de Brazil" },
    "fairfax@texasdebrazil.com": { "pass": "TDB-FairOak-110", "name": "FairOak", "id": "110", "company": "Texas de Brazil" },
    "fortworth@texasdebrazil.com": { "pass": "TDB-FtWorth-40", "name": "FtWorth", "id": "40", "company": "Texas de Brazil" },
    "greenville@texasdebrazil.com": { "pass": "TDB-Gville-800", "name": "Gville", "id": "800", "company": "Texas de Brazil" },
    "jacksonville@texasdebrazil.com": { "pass": "TDB-Jax-520", "name": "Jax", "id": "520", "company": "Texas de Brazil" },
    "omaha@texasdebrazil.com": { "pass": "TDB-Omaha-620", "name": "Omaha", "id": "620", "company": "Texas de Brazil" },
    "richmond@texasdebrazil.com": { "pass": "TDB-Rich-100", "name": "Rich", "id": "100", "company": "Texas de Brazil" },
    "rochester@texasdebrazil.com": { "pass": "TDB-Roch-450", "name": "Roch", "id": "450", "company": "Texas de Brazil" },
    "rogers@texasdebrazil.com": { "pass": "TDB-Rogers-770", "name": "Rogers", "id": "770", "company": "Texas de Brazil" },
    "sawgrass@texasdebrazil.com": { "pass": "TDB-Saw-500", "name": "Saw", "id": "500", "company": "Texas de Brazil" },
    "syracuse@texasdebrazil.com": { "pass": "TDB-Syrac-270", "name": "Syrac", "id": "270", "company": "Texas de Brazil" },
    "tacoma@texasdebrazil.com": { "pass": "TDB-Tacoma-690", "name": "Tacoma", "id": "690", "company": "Texas de Brazil" },
    "tyler@texasdebrazil.com": { "pass": "TDB-Tyler-530", "name": "Tyler", "id": "530", "company": "Texas de Brazil" },
    "yonkers@texasdebrazil.com": { "pass": "TDB-Yonkers-210", "name": "Yonkers", "id": "210", "company": "Texas de Brazil" },
    "orlando@texasdebrazil.com": { "pass": "TDB-Orlando-70", "name": "Orlando", "id": "70", "company": "Texas de Brazil" },
    "lasvegas@texasdebrazil.com": { "pass": "TDB-Vegas-140", "name": "Vegas", "id": "140", "company": "Texas de Brazil" },
    "sanantonio@texasdebrazil.com": { "pass": "TDB-SanAnt-170", "name": "SanAnt", "id": "170", "company": "Texas de Brazil" },
    "tampa@texasdebrazil.com": { "pass": "TDB-Tampa-180", "name": "Tampa", "id": "180", "company": "Texas de Brazil" },
    "detroit@texasdebrazil.com": { "pass": "TDB-Detroit-190", "name": "Detroit", "id": "190", "company": "Texas de Brazil" },
    "houston@texasdebrazil.com": { "pass": "TDB-Houston-250", "name": "Houston", "id": "250", "company": "Texas de Brazil" },
    "albany@texasdebrazil.com": { "pass": "TDB-Albany-310", "name": "Albany", "id": "310", "company": "Texas de Brazil" },
    "irvine@texasdebrazil.com": { "pass": "TDB-Irvine-390", "name": "Irvine", "id": "390", "company": "Texas de Brazil" },
    "memphis@texasdebrazil.com": { "pass": "TDB-Memphis-50", "name": "Memphis", "id": "50", "company": "Texas de Brazil" },
    "mcallen@texasdebrazil.com": { "pass": "TDB-Mcallen-540", "name": "Mcallen", "id": "540", "company": "Texas de Brazil" },
    "carlsbad@texasdebrazil.com": { "pass": "TDB-Carls-710", "name": "Carls", "id": "710", "company": "Texas de Brazil" },
    "denver@texasdebrazil.com": { "pass": "TDB-Denver-90", "name": "Denver", "id": "90", "company": "Texas de Brazil" },
    "batonrouge@texasdebrazil.com": { "pass": "TDB-BRouge-150", "name": "BRouge", "id": "150", "company": "Texas de Brazil" },
    "birmingham@texasdebrazil.com": { "pass": "TDB-Birming-290", "name": "Birming", "id": "290", "company": "Texas de Brazil" },
    "fresno@texasdebrazil.com": { "pass": "TDB-Fresno-700", "name": "Fresno", "id": "700", "company": "Texas de Brazil" },
    "grandrapids@texasdebrazil.com": { "pass": "TDB-Kent-902", "name": "Kent", "id": "902", "company": "Texas de Brazil" },
    "huntsville@texasdebrazil.com": { "pass": "TDB-Hville-350", "name": "Hville", "id": "350", "company": "Texas de Brazil" },
    "lexington@texasdebrazil.com": { "pass": "TDB-Lexing-510", "name": "Lexing", "id": "510", "company": "Texas de Brazil" },
    "louisville@texasdebrazil.com": { "pass": "TDB-Louis-903", "name": "Louis", "id": "903", "company": "Texas de Brazil" },
    "milwaukee@texasdebrazil.com": { "pass": "TDB-Milwauk-560", "name": "Milwauk", "id": "560", "company": "Texas de Brazil" },
    "oklahomacity@texasdebrazil.com": { "pass": "TDB-Okc-460", "name": "Okc", "id": "460", "company": "Texas de Brazil" },
    "orlandpark@texasdebrazil.com": { "pass": "TDB-Orland-630", "name": "Orland", "id": "630", "company": "Texas de Brazil" },
    "pittsburgh@texasdebrazil.com": { "pass": "TDB-Pitt-260", "name": "Pitt", "id": "260", "company": "Texas de Brazil" },
    "ranchocucamonga@texasdebrazil.com": { "pass": "TDB-Cucamon-760", "name": "Cucamon", "id": "760", "company": "Texas de Brazil" },
    "schaumburg@texasdebrazil.com": { "pass": "TDB-Schaum-80", "name": "Schaum", "id": "80", "company": "Texas de Brazil" },
    "tulsa@texasdebrazil.com": { "pass": "TDB-Tulsa-440", "name": "Tulsa", "id": "440", "company": "Texas de Brazil" },
    "woodmere@texasdebrazil.com": { "pass": "TDB-Chagrin-430", "name": "Chagrin", "id": "430", "company": "Texas de Brazil" },
    "columbus@texasdebrazil.com": { "pass": "TDB-Cbus-240", "name": "Cbus", "id": "240", "company": "Texas de Brazil" },
    "dadeland@texasdebrazil.com": { "pass": "TDB-DaMall-360", "name": "DaMall", "id": "360", "company": "Texas de Brazil" },
    "miami@texasdebrazil.com": { "pass": "TDB-DolMall-60", "name": "DolMall", "id": "60", "company": "Texas de Brazil" },
    "gulfstream@texasdebrazil.com": { "pass": "TDB-Gulf-160", "name": "Gulf", "id": "160", "company": "Texas de Brazil" },
    "smithhaven@texasdebrazil.com": { "pass": "TDB-LGrove-610", "name": "LGrove", "id": "610", "company": "Texas de Brazil" },
    "miamibeach@texasdebrazil.com": { "pass": "TDB-MiamiB-120", "name": "MiamiB", "id": "120", "company": "Texas de Brazil" },
    "palmbeachgardens@texasdebrazil.com": { "pass": "TDB-PBG-230", "name": "PBG", "id": "230", "company": "Texas de Brazil" },
    "hartford@texasdebrazil.com": { "pass": "TDB-WHart-550", "name": "WHart", "id": "550", "company": "Texas de Brazil" },
    "cleveland@texasdebrazil.com": { "pass": "TDB-Crocker-400", "name": "Crocker", "id": "400", "company": "Texas de Brazil" }
};

async function main() {
    console.log('🌱 Starting Seed with 55 Stores...');

    // 1. Create Main Company
    const tdb = await prisma.company.upsert({
        where: { id: 'tdb-main' },
        update: {},
        create: {
            id: 'tdb-main',
            name: 'Texas de Brazil',
            plan: 'enterprise'
        }
    });

    console.log(`Created Company: ${tdb.name}`);

    // 2. Iterate ACCOUNTS
    for (const [email, account] of Object.entries(ACCOUNTS)) {

        // Hash Password
        const hashedPassword = await bcrypt.hash(account.pass, 10);

        // Skip Non-Stores (Master, Partner)
        if (isNaN(parseInt(account.id))) {
            // Upsert Admin/Partner User
            await prisma.user.upsert({
                where: { email: email },
                update: {
                    password_hash: hashedPassword, // Update password if changed
                    force_change: false,
                    last_password_change: new Date()
                },
                create: {
                    email: email,
                    password_hash: hashedPassword,
                    role: account.role || 'viewer',
                    store_id: null,
                    force_change: false,
                    last_password_change: new Date()
                }
            });
            console.log(`Created Admin User: ${email}`);
            continue;
        }

        const storeId = parseInt(account.id);
        const storeName = account.name;

        // 3. Create Store
        const store = await prisma.store.upsert({
            where: { id: storeId },
            update: {
                store_name: storeName
            },
            create: {
                id: storeId,
                company_id: tdb.id,
                store_name: storeName,
                location: 'USA' // Placeholder for now
            }
        });

        // 4. Create Manager User
        await prisma.user.upsert({
            where: { email: email },
            update: {
                store_id: store.id,
                password_hash: hashedPassword,
                force_change: false,
                last_password_change: new Date()
            },
            create: {
                email: email,
                password_hash: hashedPassword,
                role: 'manager',
                store_id: store.id,
                force_change: false,
                last_password_change: new Date()
            }
        });

        // 5. Generate Mock BI Data (if not exists)
        // Formula: Consumption = (Start Inv + Purchases) - End Inv
        const now = new Date();
        const lastWeek = new Date(now);
        lastWeek.setDate(now.getDate() - 7);

        const existingInv = await prisma.inventoryRecord.findFirst({
            where: {
                store_id: store.id,
                date: lastWeek
            }
        });

        if (!existingInv) {
            // Initial Inventory
            const startInv = 200 + Math.random() * 100;
            await prisma.inventoryRecord.create({
                data: {
                    store_id: store.id,
                    date: lastWeek,
                    item_name: 'Picanha',
                    quantity: startInv
                }
            });

            // Purchases
            const purchased = 500 + Math.random() * 200;
            await prisma.purchaseRecord.create({
                data: {
                    store_id: store.id,
                    date: new Date(now.getDate() - 3),
                    item_name: 'Picanha',
                    quantity: purchased,
                    cost_total: purchased * (5.50 + Math.random())
                }
            });

            // Consumption Logic
            const guests = 800 + Math.floor(Math.random() * 600); // 800-1400 guests
            const targetConsumption = guests * 1.8;
            const realConsumption = targetConsumption * (0.9 + Math.random() * 0.2);

            const endInv = (startInv + purchased) - realConsumption;

            // Final Inventory
            await prisma.inventoryRecord.create({
                data: {
                    store_id: store.id,
                    date: now,
                    item_name: 'Picanha',
                    quantity: Math.max(0, endInv)
                }
            });

            // Report
            await prisma.report.upsert({
                where: {
                    store_id_month: {
                        store_id: store.id,
                        month: '2026-02-BI-WEEK'
                    }
                },
                update: {
                    total_lbs: realConsumption,
                    extra_customers: guests
                },
                create: {
                    store_id: store.id,
                    month: '2026-02-BI-WEEK',
                    total_lbs: realConsumption,
                    extra_customers: guests
                }
            });
            console.log(`Bi-Data Generated for ${storeName}`);
        }
    }

    console.log('✅ Seed Complete with 55 Stores & Users!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

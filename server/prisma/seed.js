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
    "dallas@texasdebrazil.com": { "pass": "Dallas2026", "name": "Dallas", "id": "30", "company": "Texas de Brazil", "role": "director" },
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

    const tdb = await prisma.company.upsert({
        where: { id: 'tdb-main' },
        update: {},
        create: { id: 'tdb-main', name: 'Texas de Brazil', plan: 'enterprise' }
    });

    // ─── Seed Store Templates ───────────────────────────────────────────────
    console.log('📋 Seeding Store Templates...');
    const SYSTEM_TEMPLATES = [
        {
            name: 'Template em Branco',
            description: 'Ponto de partida para criar um template customizado do zero.',
            is_system: true,
            config: {
                target_lbs_guest: null, target_cost_guest: null,
                lunch_price: null, dinner_price: null,
                serves_lamb_chops_rodizio: false,
                protein_targets: {}
            }
        },
        {
            name: 'Rodízio Padrão',
            description: 'Baseline para semanas normais. Todos os valores padrão calibrados.',
            is_system: true,
            config: {
                target_lbs_guest: 1.76, target_cost_guest: 9.94,
                lunch_price: 34.00, dinner_price: 54.00,
                serves_lamb_chops_rodizio: false,
                protein_targets: {
                    'Beef Ribs': 0.12, 'Filet Mignon': 0.15, 'Picanha': 0.14,
                    'Fraldinha': 0.13, 'Chicken': 0.07, 'Lamb Chops': 0.05,
                    'Sirloin': 0.08, 'Sausage': 0.04, 'Pork Ribs': 0.06, 'Pork Loin': 0.05
                }
            }
        },
        {
            name: 'Volume Alto',
            description: 'Finais de semana movimentados, feriados. +20% no target de LBS.',
            is_system: true,
            config: {
                target_lbs_guest: 2.10, target_cost_guest: 11.50,
                lunch_price: 34.00, dinner_price: 54.00,
                serves_lamb_chops_rodizio: false,
                protein_targets: {
                    'Beef Ribs': 0.14, 'Filet Mignon': 0.17, 'Picanha': 0.16,
                    'Fraldinha': 0.15, 'Chicken': 0.08, 'Lamb Chops': 0.05,
                    'Sirloin': 0.09, 'Sausage': 0.05, 'Pork Ribs': 0.07, 'Pork Loin': 0.06
                }
            }
        },
        {
            name: 'Ribs-Heavy',
            description: 'Verão / grilling season. Alta demanda de costela.',
            is_system: true,
            config: {
                target_lbs_guest: 1.95, target_cost_guest: 10.80,
                lunch_price: 34.00, dinner_price: 54.00,
                serves_lamb_chops_rodizio: false,
                protein_targets: {
                    'Beef Ribs': 0.22, 'Filet Mignon': 0.10, 'Picanha': 0.12,
                    'Fraldinha': 0.13, 'Chicken': 0.07, 'Lamb Chops': 0.04,
                    'Sirloin': 0.07, 'Sausage': 0.05, 'Pork Ribs': 0.10, 'Pork Loin': 0.05
                }
            }
        },
        {
            name: 'Premium Mix',
            description: 'Eventos corporativos, noites de alto ticket. Mais Filet e Picanha.',
            is_system: true,
            config: {
                target_lbs_guest: 1.65, target_cost_guest: 12.50,
                lunch_price: 38.00, dinner_price: 62.00,
                serves_lamb_chops_rodizio: true,
                protein_targets: {
                    'Beef Ribs': 0.08, 'Filet Mignon': 0.22, 'Picanha': 0.20,
                    'Fraldinha': 0.10, 'Chicken': 0.05, 'Lamb Chops': 0.08,
                    'Sirloin': 0.08, 'Sausage': 0.03, 'Pork Ribs': 0.04, 'Pork Loin': 0.04
                }
            }
        },
        {
            name: 'Evento Especial',
            description: "Valentine's Day, NYE, Mother's Day. 4x volume, mix premium, tolerância apertada.",
            is_system: true,
            config: {
                target_lbs_guest: 1.55, target_cost_guest: 13.50,
                lunch_price: 38.00, dinner_price: 62.00,
                serves_lamb_chops_rodizio: true,
                protein_targets: {
                    'Beef Ribs': 0.06, 'Filet Mignon': 0.25, 'Picanha': 0.22,
                    'Fraldinha': 0.08, 'Chicken': 0.04, 'Lamb Chops': 0.10,
                    'Sirloin': 0.07, 'Sausage': 0.02, 'Pork Ribs': 0.03, 'Pork Loin': 0.03
                }
            }
        }
    ];

    for (const tmpl of SYSTEM_TEMPLATES) {
        await prisma.storeTemplate.upsert({
            where: { company_id_name: { company_id: 'tdb-main', name: tmpl.name } },
            update: { description: tmpl.description, config: tmpl.config },
            create: { company_id: 'tdb-main', ...tmpl }
        });
    }
    console.log(`✅ ${SYSTEM_TEMPLATES.length} templates seeded.`);

    console.log('📦 Establishing Company Product Ledger (Alphabetized)...');

    const MASTER_PRODUCTS = [
        { name: 'Beef Ribs', protein_group: 'Beef Ribs', is_villain: true, is_dinner_only: true, include_in_delivery: false, target: 0.12 },
        { name: 'Chicken Breast', protein_group: 'Chicken', is_villain: false, is_dinner_only: false, include_in_delivery: false, target: 0.08 },
        { name: 'Chicken Drumstick', protein_group: 'Chicken', is_villain: false, is_dinner_only: false, include_in_delivery: true, target: 0.06 },
        { name: 'Filet Mignon', protein_group: 'Filet Mignon', is_villain: true, is_dinner_only: true, include_in_delivery: true, target: 0.15 },
        { name: 'Filet Mignon with Bacon', protein_group: 'Filet Mignon', is_villain: true, is_dinner_only: true, include_in_delivery: false, target: 0.10 },
        { name: 'Flap Steak', protein_group: 'Fraldinha', is_villain: true, is_dinner_only: false, include_in_delivery: false, target: 0.10 },
        { name: 'Fraldinha/Flank Steak', protein_group: 'Fraldinha', is_villain: true, is_dinner_only: false, include_in_delivery: true, target: 0.18 },
        { name: 'Lamb Chops', protein_group: 'Lamb Chops', is_villain: true, is_dinner_only: true, include_in_delivery: false, target: 0.14 },
        { name: 'Lamb Picanha', protein_group: 'Lamb', is_villain: true, is_dinner_only: false, include_in_delivery: false, target: 0.08 },
        { name: 'Lamb Sirloin', protein_group: 'Lamb', is_villain: true, is_dinner_only: false, include_in_delivery: false, target: 0.07 },
        { name: 'Leg of Lamb', protein_group: 'Leg of Lamb', is_villain: false, is_dinner_only: false, include_in_delivery: false, target: 0.09 },
        { name: 'Picanha', protein_group: 'Picanha', is_villain: true, is_dinner_only: false, include_in_delivery: true, target: 0.35 },
        { name: 'Picanha with Garlic', protein_group: 'Picanha', is_villain: true, is_dinner_only: false, include_in_delivery: false, target: 0.10 },
        { name: 'Pork Loin', protein_group: 'Pork Loin', is_villain: false, is_dinner_only: false, include_in_delivery: false, target: 0.08 },
        { name: 'Pork Ribs', protein_group: 'Pork Ribs', is_villain: false, is_dinner_only: false, include_in_delivery: false, target: 0.10 },
        { name: 'Sausage', protein_group: 'Sausage', is_villain: false, is_dinner_only: false, include_in_delivery: true, target: 0.10 },
        { name: 'Tri-Tip', protein_group: 'Sirloin', is_villain: false, is_dinner_only: false, include_in_delivery: true, target: 0.05 },
        { name: 'Spicy Sirloin', protein_group: 'Sirloin', is_villain: false, is_dinner_only: false, include_in_delivery: false, target: 0.05 },
    ].sort((a, b) => a.name.localeCompare(b.name));

    for (const p of MASTER_PRODUCTS) {
        await prisma.companyProduct.upsert({
            where: { company_id_name: { company_id: tdb.id, name: p.name } },
            update: {
                protein_group: p.protein_group || null,
                is_villain: p.is_villain || false,
                is_dinner_only: p.is_dinner_only || false,
                include_in_delivery: p.include_in_delivery || false,
                standard_target: p.target
            },
            create: {
                company_id: tdb.id,
                name: p.name,
                protein_group: p.protein_group || null,
                is_villain: p.is_villain || false,
                is_dinner_only: p.is_dinner_only || false,
                include_in_delivery: p.include_in_delivery || false,
                standard_target: p.target
            }
        });
    }

    // Specific Targets defined by User (Phase 12 - Derived from Batch 2-8 Raw Data Sums)
    const TARGET_OVERRIDES = {
        // Direct Matches & Primary Proxies
        'Addison': 1.23,
        'Dallas': 1.77,   // Dallas Uptown
        'Orlando': 1.89,
        'Vegas': 1.83,
        'SanAnt': 1.57,
        'Houston': 1.68,
        'Irvine': 1.78,
        'Denver': 1.71,
        'Pitt': 1.79,
        'MiamiB': 1.75,
        'Buffalo': 1.77,  // Proxy for Burlington
        'FairOak': 1.75,  // AVG for DC Metro (Baltimore/Reston/Tysons/Washington)
        'Jax': 1.77,
        'Omaha': 1.77,    // Proxy for Kansas City
        'Rich': 1.56,     // Proxy for Bethesda
        'Saw': 1.63,      // Proxy for Fort Lauderdale
        'Tacoma': 1.80,   // Proxy for PNW (Bellevue/Lynnwood/Portland)
        'Yonkers': 1.70,  // AVG for NY Metro (LI/NY/Paramus/Queens/White Plains)
        'Carls': 1.79,    // Proxy for San Diego
        'BRouge': 1.72,   // Proxy for New Orleans
        'Birming': 1.78,  // Proxy for Atlanta/Dunwoody
        'Fresno': 1.85,   // AVG for NorCal (Emeryville/SF/San Jose)
        'Milwauk': 1.72,  // Proxy for Minneapolis
        'Cucamon': 1.72,  // AVG for LA Metro (Bev Hills/El Segundo/LA/Pasadena)
        'Schaum': 1.76,   // AVG for Chicago Metro (Chicago/Naperville/Oak Brook)
        'WHart': 1.73,    // Proxy for New England (Boston/Providence)
        'Detroit': 1.72,  // Proxy for Troy

        // Manual / Geo Matches (Batch 1 & Geo)
        'Albuquerque': 1.77,
        'Atlanta': 1.84,
        'Austin': 1.80,
        'Baltimore': 1.90,
        'Bellevue': 1.80,
        'SanJuan': 1.95,
        'Honolulu': 1.95,
        'Phila': 1.82,
        'Wash': 1.82,        // Metro
        'Chicago': 1.82,     // Metro
        'New York': 1.82,    // Metro
        'Los Angeles': 1.82, // Metro
        'San Francisco': 1.82 // Metro
    };

    const TOURIST_CITIES = ['Orlando', 'Vegas', 'Miami', 'Anaheim', 'Fort Lauderdale', 'Hallandale', 'San Juan', 'Honolulu'];
    const METRO_CITIES = ['Dallas', 'Chicago', 'New York', 'Detroit', 'Houston', 'SanAnt', 'Denver', 'Wash', 'Phila', 'Boston', 'Los Angeles', 'San Francisco', 'Atlanta'];

    for (const [email, account] of Object.entries(ACCOUNTS)) {
        const hashedPassword = await bcrypt.hash(account.pass, 10);
        if (isNaN(parseInt(account.id))) {
            await prisma.user.upsert({
                where: { email: email },
                update: { password_hash: hashedPassword, force_change: false, last_password_change: new Date() },
                create: { email: email, password_hash: hashedPassword, role: account.role || 'viewer', store_id: null, force_change: false, last_password_change: new Date() }
            });
            continue;
        }

        const storeId = parseInt(account.id);
        const storeName = account.name;

        // Calculate Target
        let targetLbs = TARGET_OVERRIDES[storeName];
        if (!targetLbs) {
            // Heuristic Fallback
            if (TOURIST_CITIES.some(c => storeName.includes(c))) {
                targetLbs = 1.95;
            } else if (METRO_CITIES.some(c => storeName.includes(c))) {
                targetLbs = 1.82;
            } else {
                targetLbs = 1.76;
            }
        }

        const store = await prisma.store.upsert({
            where: {
                company_id_store_name: {
                    company_id: tdb.id,
                    store_name: storeName
                }
            },
            update: { target_lbs_guest: targetLbs },
            create: { id: storeId, company_id: tdb.id, store_name: storeName, location: 'USA', target_lbs_guest: targetLbs }
        });

        await prisma.user.upsert({
            where: { email: email },
            update: { store_id: store.id, password_hash: hashedPassword, force_change: false, last_password_change: new Date() },
            create: { email: email, password_hash: hashedPassword, role: 'manager', store_id: store.id, force_change: false, last_password_change: new Date() }
        });

        const now = new Date();
        const PROTEINS = ["Beef Ribs", "Chicken Breast", "Chicken Drumstick", "Filet Mignon", "Filet Mignon with Bacon", "Flap Steak", "Fraldinha/Flank Steak", "Lamb Chops", "Lamb Picanha", "Lamb Sirloin", "Leg of Lamb", "Picanha", "Picanha with Garlic", "Pork Loin", "Pork Ribs", "Sausage", "Tri-Tip"];
        const lastWeek = new Date(now);
        lastWeek.setDate(now.getDate() - 7);

        // Check for recent orders (last 30 days) to avoid stale data blocking new seed
        const recentDate = new Date();
        recentDate.setDate(recentDate.getDate() - 30);

        const existingOrder = await prisma.order.findFirst({
            where: {
                store_id: store.id,
                order_date: { gte: recentDate }
            }
        });

        if (!existingOrder || store.id === 180) {
            if (store.id === 180) {
                await prisma.orderItem.deleteMany({ where: { order: { store_id: 180 } } });
                await prisma.order.deleteMany({ where: { store_id: 180 } });
            }
            for (let i = 0; i < 5; i++) {
                const oDate = new Date();
                oDate.setDate(now.getDate() - i);
                await prisma.order.create({
                    data: {
                        store_id: store.id, source: 'OLO', order_date: oDate,
                        items: { create: PROTEINS.map(p => ({ item_name: p, protein_type: p.toLowerCase(), lbs: 50 + Math.random() * 50 })) }
                    }
                });
            }
        }

        const existingInv = await prisma.inventoryRecord.findFirst({ where: { store_id: store.id, date: lastWeek } });
        if (!existingInv || store.id === 180) {
            if (store.id === 180) {
                await prisma.inventoryRecord.deleteMany({ where: { store_id: 180 } });
                await prisma.purchaseRecord.deleteMany({ where: { store_id: 180 } });
            }
            for (const p of ['Picanha', 'Lamb Chops']) {
                const sInv = 200 + Math.random() * 100;
                await prisma.inventoryRecord.create({ data: { store_id: store.id, date: lastWeek, item_name: p, quantity: sInv } });
                const purc = 500 + Math.random() * 200;
                await prisma.purchaseRecord.create({
                    data: { store_id: store.id, date: new Date(now.getTime() - (3 * 24 * 60 * 60 * 1000)), item_name: p, quantity: purc, cost_total: purc * (5.50 + Math.random()) }
                });
                const gInv = 800 + Math.floor(Math.random() * 600);
                const rUse = gInv * 1.8 * (0.9 + Math.random() * 0.2);
                await prisma.inventoryRecord.create({ data: { store_id: store.id, date: now, item_name: p, quantity: Math.max(0, sInv + purc - rUse) } });
            }
        }

        const guestsNum = 800 + Math.floor(Math.random() * 600);
        const consVal = guestsNum * 1.8 * (0.9 + Math.random() * 0.2);
        const keys = ['2026-W9', '2026-W10', '2026-02-BI-WEEK'];
        for (const k of keys) {
            await prisma.report.upsert({
                where: { store_id_month: { store_id: store.id, month: k } },
                update: { total_lbs: consVal, extra_customers: guestsNum },
                create: { store_id: store.id, month: k, total_lbs: consVal, extra_customers: guestsNum }
            });
        }
        console.log(`Synced: ${storeName}`);
    }
    console.log('✅ Seed Complete!');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });


import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// --- 1. Raw Data from Prints (Batch 2) ---
const RAW_DATA: Record<string, Record<string, number>> = {
    'Bethesda': {
        'Beef Picanha (Top Butt Caps)': 0.35,
        'Beef Top Butt Sirloin (Alcatra)': 0.20,
        'Beef Flap Meat (Fraldinha)': 0.22,
        'Chicken Breast': 0.13,
        'Chicken Leg': 0.12,
        'Lamb Top Sirloin Caps': 0.09,
        'Beef "Bone-in-Ribeye", Export': 0.08,
        'Beef Short Ribs': 0.07,
        'Lamb Rack': 0.06,
        'Pork Belly': 0.04,
        'Beef Tenderloin': 0.09,
        'Pork Sausage': 0.06,
        'Pork Loin': 0.05
    },
    'Beverly Hills': {
        'Beef Picanha (Top Butt Caps)': 0.39,
        'Beef Top Butt Sirloin (Alcatra)': 0.23,
        'Beef Flap Meat (Fraldinha)': 0.24,
        'Chicken Leg': 0.13,
        'Chicken Breast': 0.14,
        'Beef Short Ribs': 0.08,
        'Lamb Top Sirloin Caps': 0.10,
        'Beef "Bone-in-Ribeye", Export': 0.09,
        'Lamb Rack': 0.07,
        'Beef Tenderloin': 0.10,
        'Pork Sausage': 0.06,
        'Pork Belly': 0.04,
        'Pork Loin': 0.06,
        'Pork Crown (Rack)': 0.04
    },
    'Boston': {
        'Beef Picanha (Top Butt Caps)': 0.36,
        'Beef Top Butt Sirloin (Alcatra)': 0.21,
        'Beef Flap Meat (Fraldinha)': 0.22,
        'Chicken Leg': 0.12,
        'Lamb Top Sirloin Caps': 0.10,
        'Chicken Breast': 0.13,
        'Pork Loin': 0.06,
        'Pork Sausage': 0.06,
        'Beef "Bone-in-Ribeye", Export': 0.09,
        'Beef Short Ribs': 0.08,
        'Beef Tenderloin': 0.10,
        'Lamb Rack': 0.07,
        'Pork Belly': 0.04,
        'Pork Crown (Rack)': 0.03
    },
    'Brea': {
        'Beef Picanha (Top Butt Caps)': 0.37,
        'Beef Flap Meat (Fraldinha)': 0.23,
        'Beef Top Butt Sirloin (Alcatra)': 0.21,
        'Beef Short Ribs': 0.08,
        'Chicken Breast': 0.13,
        'Beef "Bone-in-Ribeye", Export': 0.09,
        'Beef Tenderloin': 0.10,
        'Lamb Top Sirloin Caps': 0.10,
        'Lamb Rack': 0.07,
        'Chicken Leg': 0.13,
        'Pork Sausage': 0.06,
        'Pork Crown (Rack)': 0.03,
        'Pork Loin': 0.06,
        'Pork Belly': 0.04
    },
    'Burlington': {
        'Beef Picanha (Top Butt Caps)': 0.39,
        'Beef Flap Meat (Fraldinha)': 0.24,
        'Beef Top Butt Sirloin (Alcatra)': 0.23,
        'Beef Short Ribs': 0.08,
        'Chicken Breast': 0.14,
        'Lamb Top Sirloin Caps': 0.10,
        'Chicken Leg': 0.13,
        'Beef "Bone-in-Ribeye", Export': 0.09,
        'Lamb Rack': 0.07,
        'Beef Tenderloin': 0.10,
        'Pork Sausage': 0.06,
        'Pork Loin': 0.06,
        'Pork Crown (Rack)': 0.04,
        'Pork Belly': 0.04
    },
    'Chicago': {
        'Beef Picanha (Top Butt Caps)': 0.37,
        'Beef Flap Meat (Fraldinha)': 0.23,
        'Beef Top Butt Sirloin (Alcatra)': 0.22,
        'Chicken Leg': 0.13,
        'Chicken Breast': 0.14,
        'Lamb Top Sirloin Caps': 0.10,
        'Beef Tenderloin': 0.10,
        'Lamb Rack': 0.07,
        'Beef "Bone-in-Ribeye", Export': 0.09,
        'Beef Short Ribs': 0.08,
        'Pork Sausage': 0.06,
        'Pork Loin': 0.06,
        'Pork Belly': 0.04,
        'Pork Crown (Rack)': 0.03
    },
    'Coral Gables': {
        'Beef Picanha (Top Butt Caps)': 0.35,
        'Beef Flap Meat (Fraldinha)': 0.22,
        'Beef Top Butt Sirloin (Alcatra)': 0.20,
        'Beef "Bone-in-Ribeye", Export': 0.08,
        'Beef Short Ribs': 0.07,
        'Chicken Breast': 0.13,
        'Beef Tenderloin': 0.09,
        'Lamb Rack': 0.06,
        'Chicken Leg': 0.12,
        'Lamb Top Sirloin Caps': 0.09,
        'Pork Sausage': 0.06,
        'Pork Loin': 0.05,
        'Pork Crown (Rack)': 0.03,
        'Pork Belly': 0.04
    },
    'Dallas - Uptown': {
        'Beef Picanha (Top Butt Caps)': 0.39,
        'Beef Flap Meat (Fraldinha)': 0.24,
        'Beef Top Butt Sirloin (Alcatra)': 0.23,
        'Chicken Breast': 0.14,
        'Chicken Leg': 0.13,
        'Lamb Top Sirloin Caps': 0.10,
        'Beef "Bone-in-Ribeye", Export': 0.09,
        'Pork Belly': 0.04,
        'Beef Tenderloin': 0.10,
        'Pork Loin': 0.06,
        'Beef Short Ribs': 0.08,
        'Pork Sausage': 0.06,
        'Lamb Rack': 0.07,
        'Pork Crown (Rack)': 0.04
    }
};

// --- 2. Mapping Rules (Print Name -> DB Name) ---
const MEAT_MAPPING: Record<string, string> = {
    'Beef Picanha (Top Butt Caps)': 'Picanha',
    'Beef Top Butt Sirloin (Alcatra)': 'Alcatra',
    'Beef Flap Meat (Fraldinha)': 'Fraldinha/Flank Steak',
    'Beef Tenderloin': 'Filet Mignon',
    'Beef Short Ribs': 'Beef Ribs',
    'Pork Ribs': 'Pork Ribs',
    'Pork Loin': 'Pork Loin',
    'Chicken Leg': 'Chicken Drumstick',
    'Chicken Breast': 'Chicken Breast',
    'Lamb Rack': 'Lamb Chops',
    'Lamb Top Sirloin Caps': 'Lamb Picanha',
    'Pork Sausage': 'Sausage',
    'Beef "Bone-in-Ribeye", Export': 'Bone-in Ribeye',
    'Pork Belly': 'Pork Belly',
    'Lamb Leg': 'Leg of Lamb',
    'Beef Tri Tip': 'Tri-Tip',
    'Pork Crown (Rack)': 'Pork Ribs' // Mapping Pork Crown to Ribs
};

// --- 3. Store Proxies ---
const PROXY_MAP: Record<string, string> = {
    'Bethesda': 'Rich',      // Richmond VA
    'Beverly Hills': 'Cucamon', // Rancho Cucamonga CA
    'Boston': 'WHart',       // West Hartford CT
    'Brea': 'Irvine',        // Irvine CA
    'Burlington': 'Buffalo', // Buffalo NY (Proxy)
    'Chicago': 'Schaum',     // Schaumburg IL
    'Coral Gables': 'MiamiB', // Miami Beach FL
    'Dallas - Uptown': 'Dallas' // Dallas TX
};

async function main() {
    console.log('Starting Batch 2 Meat Target Injection...');

    for (const [sourceName, rawMeats] of Object.entries(RAW_DATA)) {
        const proxyPattern = PROXY_MAP[sourceName];
        if (!proxyPattern) continue;

        // 1. Find Store
        const store = await prisma.store.findFirst({
            where: { store_name: { contains: proxyPattern, mode: 'insensitive' } }
        });

        if (!store) {
            console.warn(`❌ Store not found for pattern "${proxyPattern}" (Source: ${sourceName})`);
            continue;
        }

        const TARGET_LBS = store.target_lbs_guest;
        const sumRaw = Object.values(rawMeats).reduce((a, b) => a + b, 0);
        const factor = TARGET_LBS / sumRaw;

        console.log(`\nProcessing ${sourceName} -> ${store.store_name} (ID: ${store.id})`);
        console.log(`Target: ${TARGET_LBS.toFixed(3)} | Sum Raw: ${sumRaw.toFixed(3)} | Factor: ${factor.toFixed(4)}`);

        // 2. Process Items
        for (const [printName, rawVal] of Object.entries(rawMeats)) {
            const dbName = MEAT_MAPPING[printName];
            if (!dbName) {
                if (rawVal > 0.00) console.warn(`   ⚠️ No mapping for "${printName}" (${rawVal})`);
                continue;
            }

            const adjustedVal = rawVal * factor;

            // Upsert
            await prisma.storeMeatTarget.upsert({
                where: {
                    store_id_protein: {
                        store_id: store.id,
                        protein: dbName
                    }
                },
                update: { target: adjustedVal },
                create: {
                    store_id: store.id,
                    protein: dbName,
                    target: adjustedVal
                }
            });
            console.log(`   - ${dbName}: ${rawVal.toFixed(2)} -> ${adjustedVal.toFixed(3)}`);
        }
    }
    console.log('\nBatch 2 Done.');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());

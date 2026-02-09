
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// --- 1. Raw Data from Prints (Batch 7) ---
const RAW_DATA: Record<string, Record<string, number>> = {
    'Reston': {
        'Beef Picanha (Top Butt Caps)': 0.39,
        'Beef Top Butt Sirloin (Alcatra)': 0.23,
        'Beef Flap Meat (Fraldinha)': 0.24,
        'Chicken Breast': 0.14,
        'Chicken Leg': 0.14,
        'Beef Tenderloin': 0.10,
        'Beef "Bone-in-Ribeye", Export': 0.09,
        'Lamb Top Sirloin Caps': 0.10,
        'Beef Short Ribs': 0.08,
        'Lamb Rack': 0.07,
        'Pork Loin': 0.06,
        'Pork Sausage': 0.06,
        'Pork Belly': 0.04,
        'Pork Crown (Rack)': 0.04,
        'Beef Porterhouse Short Loin': 0.02
    },
    'Richmond': {
        // Empty Data in Image - Skipping
    },
    'Rosemont': {
        'Beef Picanha (Top Butt Caps)': 0.42,
        'Beef Flap Meat (Fraldinha)': 0.26,
        'Beef Top Butt Sirloin (Alcatra)': 0.24,
        'Chicken Breast': 0.15,
        'Chicken Leg': 0.14,
        'Lamb Top Sirloin Caps': 0.11,
        'Beef Tenderloin': 0.11,
        'Beef "Bone-in-Ribeye", Export': 0.10,
        'Beef Short Ribs': 0.09,
        'Lamb Rack': 0.08,
        'Pork Sausage': 0.07,
        'Pork Loin': 0.06,
        'Pork Belly': 0.04,
        'Pork Crown (Rack)': 0.04,
        'Beef Porterhouse Short Loin': 0.02
    },
    'Roseville': {
        // Empty Data in Image - Skipping
        // Wait, looking closer at image "Roseville". 
        // Image shows empty columns. 
        // Checking prompt: "Roseville | Beef Picanha... | " (Empty)
        // Okay, skipping Roseville as it seems empty.
    },
    'San Antonio': {
        'Beef Picanha (Top Butt Caps)': 0.34,
        'Beef Flap Meat (Fraldinha)': 0.21,
        'Beef Top Butt Sirloin (Alcatra)': 0.20,
        'Chicken Breast': 0.12,
        'Chicken Leg': 0.12,
        'Beef "Bone-in-Ribeye", Export': 0.08,
        'Beef Tenderloin': 0.09,
        'Lamb Top Sirloin Caps': 0.09,
        'Beef Short Ribs': 0.07,
        'Lamb Rack': 0.06,
        'Pork Loin': 0.05,
        'Pork Sausage': 0.05,
        'Pork Belly': 0.04,
        'Pork Crown (Rack)': 0.03,
        'Beef Porterhouse Short Loin': 0.02
    },
    'San Diego': {
        'Beef Picanha (Top Butt Caps)': 0.39,
        'Beef Flap Meat (Fraldinha)': 0.24,
        'Beef Top Butt Sirloin (Alcatra)': 0.23,
        'Chicken Breast': 0.14,
        'Chicken Leg': 0.13,
        'Beef Tenderloin': 0.10,
        'Lamb Top Sirloin Caps': 0.10,
        'Beef "Bone-in-Ribeye", Export': 0.09,
        'Beef Short Ribs': 0.08,
        'Lamb Rack': 0.07,
        'Pork Loin': 0.06,
        'Pork Sausage': 0.06,
        'Pork Belly': 0.04,
        'Pork Crown (Rack)': 0.04,
        'Beef Porterhouse Short Loin': 0.02
    },
    'San Francisco': {
        'Beef Picanha (Top Butt Caps)': 0.42,
        'Beef Flap Meat (Fraldinha)': 0.26,
        'Beef Top Butt Sirloin (Alcatra)': 0.24,
        'Chicken Breast': 0.15,
        'Chicken Leg': 0.14,
        'Lamb Top Sirloin Caps': 0.11,
        'Beef Tenderloin': 0.11,
        'Beef "Bone-in-Ribeye", Export': 0.10,
        'Beef Short Ribs': 0.09,
        'Lamb Rack': 0.08,
        'Pork Sausage': 0.07,
        'Pork Loin': 0.06,
        'Pork Belly': 0.04,
        'Pork Crown (Rack)': 0.04,
        'Beef Porterhouse Short Loin': 0.02
    },
    'San Jose': {
        'Beef Picanha (Top Butt Caps)': 0.39,
        'Beef Flap Meat (Fraldinha)': 0.24,
        'Beef Top Butt Sirloin (Alcatra)': 0.22,
        'Chicken Breast': 0.14,
        'Chicken Leg': 0.13,
        'Lamb Top Sirloin Caps': 0.10,
        'Beef Tenderloin': 0.10,
        'Beef "Bone-in-Ribeye", Export': 0.09,
        'Beef Short Ribs': 0.08,
        'Lamb Rack': 0.07,
        'Pork Loin': 0.06,
        'Pork Sausage': 0.06,
        'Pork Belly': 0.04,
        'Pork Crown (Rack)': 0.04,
        'Beef Porterhouse Short Loin': 0.02
    },
    'San Juan': {
        'Beef Picanha (Top Butt Caps)': 0.35,
        'Beef Flap Meat (Fraldinha)': 0.22,
        'Beef Top Butt Sirloin (Alcatra)': 0.20,
        'Chicken Breast': 0.13,
        'Chicken Leg': 0.12,
        'Beef Tenderloin': 0.09,
        'Lamb Top Sirloin Caps': 0.09,
        'Beef "Bone-in-Ribeye", Export': 0.08,
        'Beef Short Ribs': 0.07,
        'Lamb Rack': 0.06,
        'Pork Sausage': 0.06,
        'Pork Loin': 0.05,
        'Pork Belly': 0.04,
        'Pork Crown (Rack)': 0.03,
        'Beef Porterhouse Short Loin': 0.02
    },
    'Scottsdale': {
        'Beef Picanha (Top Butt Caps)': 0.38,
        'Beef Flap Meat (Fraldinha)': 0.24,
        'Beef Top Butt Sirloin (Alcatra)': 0.22,
        'Chicken Breast': 0.14,
        'Chicken Leg': 0.13,
        'Lamb Top Sirloin Caps': 0.10,
        'Beef Tenderloin': 0.10,
        'Beef "Bone-in-Ribeye", Export': 0.09,
        'Beef Short Ribs': 0.08,
        'Lamb Rack': 0.07,
        'Pork Sausage': 0.06,
        'Pork Loin': 0.06,
        'Pork Belly': 0.04,
        'Pork Crown (Rack)': 0.04,
        'Beef Porterhouse Short Loin': 0.02
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
    'Pork Crown (Rack)': 'Pork Ribs',
    'Beef Porterhouse Short Loin': 'Bone-in Ribeye'
};

// --- 3. Store Proxies ---
const PROXY_MAP: Record<string, string> = {
    'Reston': 'FairOak',      // VA/DC Proxy (Fair Oaks)
    'Richmond': 'Rich',       // Match
    'Rosemont': 'Schaum',     // Chicago Proxy (Schaumburg)
    'Roseville': 'Fresno',    // NorCal Proxy (Fresno) - Best fit available
    'San Antonio': 'SanAnt',  // Match
    'San Diego': 'Carls',     // San Diego Proxy (Carlsbad)
    'San Francisco': 'Fresno',// NorCal Proxy (Fresno)
    'San Jose': 'Fresno',     // NorCal Proxy (Fresno)
    'San Juan': 'MiamiB',     // Tropical/Tourist Proxy (Miami Beach)
    'Scottsdale': 'Vegas'     // Southwest/Desert Proxy (Las Vegas)
};

async function main() {
    console.log('Starting Batch 7 Meat Target Injection...');

    for (const [sourceName, rawMeats] of Object.entries(RAW_DATA)) {
        if (Object.keys(rawMeats).length === 0) continue; // Skip empty

        let proxyPattern = PROXY_MAP[sourceName];

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
            if (!dbName) continue;

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
    console.log('\nBatch 7 Done.');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());

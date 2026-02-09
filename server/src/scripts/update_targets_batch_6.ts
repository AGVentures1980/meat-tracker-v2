
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// --- 1. Raw Data from Prints (Batch 6) ---
const RAW_DATA: Record<string, Record<string, number>> = {
    'Orlando': {
        'Beef Picanha (Top Butt Caps)': 0.41,
        'Beef Flap Meat (Fraldinha)': 0.25,
        'Beef Top Butt Sirloin (Alcatra)': 0.24,
        'Chicken Breast': 0.15,
        'Chicken Leg': 0.14,
        'Beef Tenderloin': 0.11,
        'Beef "Bone-in-Ribeye", Export': 0.10,
        'Beef Short Ribs': 0.09,
        'Lamb Top Sirloin Caps': 0.11,
        'Lamb Rack': 0.07,
        'Pork Loin': 0.06,
        'Pork Sausage': 0.06,
        'Pork Belly': 0.04,
        'Pork Crown (Rack)': 0.04,
        'Beef Porterhouse Short Loin': 0.02
    },
    'Orlando Vineland': {
        // Data appears empty in source table structure provided in prompt context
        // Skipping based on empty value interpretation
    },
    'Paramus': {
        'Beef Picanha (Top Butt Caps)': 0.38,
        'Beef Flap Meat (Fraldinha)': 0.23,
        'Beef Top Butt Sirloin (Alcatra)': 0.22,
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
        'Pork Crown (Rack)': 0.03,
        'Beef Porterhouse Short Loin': 0.02
    },
    'Pasadena': {
        'Beef Picanha (Top Butt Caps)': 0.37,
        'Beef Flap Meat (Fraldinha)': 0.23,
        'Beef Top Butt Sirloin (Alcatra)': 0.22,
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
        'Pork Crown (Rack)': 0.03,
        'Beef Porterhouse Short Loin': 0.02
    },
    'Philadelphia': {
        'Beef Picanha (Top Butt Caps)': 0.40,
        'Beef Flap Meat (Fraldinha)': 0.25,
        'Beef Top Butt Sirloin (Alcatra)': 0.23,
        'Chicken Breast': 0.15,
        'Chicken Leg': 0.14,
        'Beef Tenderloin': 0.11,
        'Lamb Top Sirloin Caps': 0.11,
        'Beef "Bone-in-Ribeye", Export': 0.09,
        'Beef Short Ribs': 0.08,
        'Lamb Rack': 0.07,
        'Pork Loin': 0.06,
        'Pork Sausage': 0.06,
        'Pork Belly': 0.04,
        'Pork Crown (Rack)': 0.04,
        'Beef Porterhouse Short Loin': 0.02
    },
    'Pittsburgh': {
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
    'Plano': {
        'Beef Picanha (Top Butt Caps)': 0.37,
        'Beef Flap Meat (Fraldinha)': 0.23,
        'Beef Top Butt Sirloin (Alcatra)': 0.21,
        'Chicken Breast': 0.13,
        'Chicken Leg': 0.13,
        'Beef Tenderloin': 0.10,
        'Lamb Top Sirloin Caps': 0.10,
        'Beef "Bone-in-Ribeye", Export': 0.09,
        'Beef Short Ribs': 0.08,
        'Lamb Rack': 0.07,
        'Pork Loin': 0.06,
        'Pork Sausage': 0.06,
        'Pork Belly': 0.04,
        'Pork Crown (Rack)': 0.03,
        'Beef Porterhouse Short Loin': 0.02
    },
    'Portland': {
        'Beef Picanha (Top Butt Caps)': 0.38,
        'Beef Flap Meat (Fraldinha)': 0.24,
        'Beef Top Butt Sirloin (Alcatra)': 0.22,
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
    'Providence': {
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
    'Queens': {
        'Beef Picanha (Top Butt Caps)': 0.38,
        'Beef Flap Meat (Fraldinha)': 0.24,
        'Beef Top Butt Sirloin (Alcatra)': 0.22,
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
    'Orlando': 'Orlando',          // Match (Assume 70: Orlando is correct)
    'Orlando Vineland': '',        // Skip (Empty Data)
    'Paramus': 'Yonkers',          // NY Metro Proxy (NJ side)
    'Pasadena': 'Cucamon',         // LA Metro Proxy (Rancho Cucamonga - '760: Cucamon')
    'Philadelphia': 'King',        // Philly Suburb Proxy (King of Prussia)
    'Pittsburgh': 'Pitt',          // Match
    'Plano': 'Dallas',             // DFW Proxy (Dallas)
    'Portland': 'Tacoma',          // WA Proxy (Tacoma)
    'Providence': 'WHart',         // New England Proxy (West Hartford)
    'Queens': 'Yonkers'            // NY Metro Proxy (Yonkers)
};

async function main() {
    console.log('Starting Batch 6 Meat Target Injection...');

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
    console.log('\nBatch 6 Done.');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());

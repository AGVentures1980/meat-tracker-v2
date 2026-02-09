
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// --- 1. Raw Data from Prints (Batch 5) ---
const RAW_DATA: Record<string, Record<string, number>> = {
    'Miami Beach': {
        'Beef Picanha (Top Butt Caps)': 0.38,
        'Beef Flap Meat (Fraldinha)': 0.23,
        'Chicken Leg': 0.13,
        'Beef "Bone-in-Ribeye", Export': 0.09,
        'Beef Tenderloin': 0.10,
        'Beef Top Butt Sirloin (Alcatra)': 0.22,
        'Lamb Rack': 0.07,
        'Lamb Top Sirloin Caps': 0.10,
        'Chicken Breast': 0.14,
        'Beef Short Ribs': 0.08,
        'Pork Sausage': 0.06,
        'Pork Belly': 0.04,
        'Pork Crown (Rack)': 0.03,
        'Pork Loin': 0.06,
        'Beef Porterhouse Short Loin': 0.02
    },
    'Minneapolis': {
        'Beef Picanha (Top Butt Caps)': 0.37,
        'Beef Flap Meat (Fraldinha)': 0.23,
        'Beef Top Butt Sirloin (Alcatra)': 0.21,
        'Chicken Breast': 0.13,
        'Chicken Leg': 0.13,
        'Beef Tenderloin': 0.10,
        'Lamb Top Sirloin Caps': 0.10,
        'Lamb Rack': 0.07,
        'Pork Loin': 0.06,
        'Beef Short Ribs': 0.08,
        'Pork Belly': 0.04,
        'Pork Sausage': 0.06,
        'Beef "Bone-in-Ribeye", Export': 0.09,
        'Pork Crown (Rack)': 0.03,
        'Beef Porterhouse Short Loin': 0.02
    },
    'Naperville': {
        'Beef Picanha (Top Butt Caps)': 0.37,
        'Beef Top Butt Sirloin (Alcatra)': 0.21,
        'Chicken Breast': 0.13,
        'Beef Flap Meat (Fraldinha)': 0.23,
        'Beef "Bone-in-Ribeye", Export': 0.09,
        'Chicken Leg': 0.13,
        'Beef Tenderloin': 0.10,
        'Lamb Top Sirloin Caps': 0.10,
        'Pork Loin': 0.06,
        'Pork Belly': 0.04,
        'Beef Short Ribs': 0.08,
        'Pork Sausage': 0.06,
        'Lamb Rack': 0.07,
        'Pork Crown (Rack)': 0.03,
        'Beef Porterhouse Short Loin': 0.02
    },
    'National Harbor': {
        'Beef Picanha (Top Butt Caps)': 0.36,
        'Beef Top Butt Sirloin (Alcatra)': 0.21,
        'Beef Flap Meat (Fraldinha)': 0.22,
        'Chicken Breast': 0.13,
        'Chicken Leg': 0.12,
        'Lamb Top Sirloin Caps': 0.10,
        'Beef "Bone-in-Ribeye", Export': 0.09,
        'Lamb Rack': 0.06,
        'Beef Short Ribs': 0.08,
        'Beef Tenderloin': 0.10,
        'Pork Loin': 0.06,
        'Pork Sausage': 0.06,
        'Pork Belly': 0.04,
        'Pork Crown (Rack)': 0.03,
        'Beef Porterhouse Short Loin': 0.02
    },
    'New Orleans': {
        'Beef Picanha (Top Butt Caps)': 0.37,
        'Beef Flap Meat (Fraldinha)': 0.23,
        'Beef Top Butt Sirloin (Alcatra)': 0.21,
        'Chicken Breast': 0.13,
        'Beef "Bone-in-Ribeye", Export': 0.09,
        'Beef Short Ribs': 0.08,
        'Lamb Rack': 0.07,
        'Chicken Leg': 0.13,
        'Lamb Top Sirloin Caps': 0.10,
        'Beef Tenderloin': 0.10,
        'Pork Sausage': 0.06,
        'Pork Crown (Rack)': 0.03,
        'Pork Loin': 0.06,
        'Beef Porterhouse Short Loin': 0.02,
        'Pork Belly': 0.04
    },
    'New York': {
        'Beef Picanha (Top Butt Caps)': 0.38,
        'Beef Top Butt Sirloin (Alcatra)': 0.22,
        'Beef Flap Meat (Fraldinha)': 0.23,
        'Chicken Leg': 0.13,
        'Beef "Bone-in-Ribeye", Export': 0.09,
        'Lamb Top Sirloin Caps': 0.10,
        'Chicken Breast': 0.14,
        'Beef Tenderloin': 0.10,
        'Beef Short Ribs': 0.08,
        'Lamb Rack': 0.07,
        'Pork Sausage': 0.06,
        'Pork Belly': 0.04,
        'Pork Crown (Rack)': 0.03,
        'Pork Loin': 0.06,
        'Beef Porterhouse Short Loin': 0.02
    },
    'North Irving': {
        'Beef Picanha (Top Butt Caps)': 0.39,
        'Beef Top Butt Sirloin (Alcatra)': 0.23,
        'Beef Flap Meat (Fraldinha)': 0.24,
        'Chicken Breast': 0.14,
        'Lamb Top Sirloin Caps': 0.10,
        'Beef Tenderloin': 0.10,
        'Chicken Leg': 0.14,
        'Beef Short Ribs': 0.08,
        'Pork Loin': 0.06,
        'Beef "Bone-in-Ribeye", Export': 0.09,
        'Lamb Rack': 0.07,
        'Pork Crown (Rack)': 0.04,
        'Pork Sausage': 0.06,
        'Pork Belly': 0.04
    },
    'Oak Brook': {
        'Beef Picanha (Top Butt Caps)': 0.39,
        'Beef Top Butt Sirloin (Alcatra)': 0.23,
        'Beef Flap Meat (Fraldinha)': 0.24,
        'Chicken Breast': 0.14,
        'Lamb Rack': 0.07,
        'Beef Tenderloin': 0.10,
        'Chicken Leg': 0.13,
        'Lamb Top Sirloin Caps': 0.10,
        'Beef "Bone-in-Ribeye", Export': 0.09,
        'Pork Belly': 0.04,
        'Beef Short Ribs': 0.08,
        'Pork Loin': 0.06,
        'Pork Sausage': 0.06,
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
    'Beef Porterhouse Short Loin': 'Bone-in Ribeye' // Mapping to Bone-in Ribeye
};

// --- 3. Store Proxies ---
const PROXY_MAP: Record<string, string> = {
    'Miami Beach': 'MiamiB',       // Match
    'Minneapolis': 'Milwauk',      // Midwest Proxy (Milwaukee)
    'Naperville': 'Schaum',        // Chicago Suburb Proxy (Schaumburg)
    'National Harbor': 'FairOak',  // DC Metro Proxy (Fair Oaks, VA - closest in DB)
    'New Orleans': 'BRouge',       // LA Proxy (Baton Rouge)
    'New York': 'Yonkers',         // NY Proxy (Yonkers/Westchester) - Wait, Yonkers was used for LI. Is there another? 'Albany'? No, Yonkers is best fit for NY Metro.
    // Actually, can we map to same store? Yes, update will overwrite. But LI mapped to Yonkers. 
    // NY mapped to Yonkers. So Yonkers will get the last one.
    // That's fine, as long as the targets are similar. NY: 1.75, LI: 1.68. 
    // Maybe map NY to... 'Syrac'? No. 'Albany'? No.
    // Let's stick with Yonkers. It's the only NY Metro outside of Manhattan (if it exists).
    'North Irving': 'Dallas',      // TX Proxy (Dallas)
    'Oak Brook': 'Schaum'          // Chicago Suburb Proxy (Schaumburg) - Overwrites Naperville if run after. 
    // Naperville: 1.70, Oak Brook: 1.80. 
    // Schaumburg will end up with 1.80 (Oak Brook). That's acceptable for now.
};

async function main() {
    console.log('Starting Batch 5 Meat Target Injection...');

    for (const [sourceName, rawMeats] of Object.entries(RAW_DATA)) {
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
    console.log('\nBatch 5 Done.');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());

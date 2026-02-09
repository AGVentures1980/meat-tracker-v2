
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// --- 1. Raw Data from Prints (Batch 3) ---
const RAW_DATA: Record<string, Record<string, number>> = {
    'Denver': {
        'Beef Picanha (Top Butt Caps)': 0.36,
        'Beef Top Butt Sirloin (Alcatra)': 0.21,
        'Beef Flap Meat (Fraldinha)': 0.23,
        'Chicken Leg': 0.13,
        'Beef Short Ribs': 0.08,
        'Beef "Bone-in-Ribeye", Export': 0.09,
        'Pork Sausage': 0.06,
        'Lamb Top Sirloin Caps': 0.10,
        'Chicken Breast': 0.13,
        'Lamb Rack': 0.07,
        'Beef Tenderloin': 0.10,
        'Pork Loin': 0.06,
        'Pork Belly': 0.04,
        'Pork Crown (Rack)': 0.03,
        'Chicken Heart': 0.00,
        'Beef Porterhouse Short Loin': 0.02
    },
    'Dunwoody': {
        'Beef Picanha (Top Butt Caps)': 0.39,
        'Beef Flap Meat (Fraldinha)': 0.24,
        'Beef Top Butt Sirloin (Alcatra)': 0.22,
        'Chicken Breast': 0.14,
        'Chicken Leg': 0.13,
        'Beef Tenderloin': 0.10,
        'Beef "Bone-in-Ribeye", Export': 0.09,
        'Lamb Rack': 0.07,
        'Lamb Top Sirloin Caps': 0.10,
        'Beef Short Ribs': 0.08,
        'Pork Loin': 0.06,
        'Pork Sausage': 0.06,
        'Pork Belly': 0.04,
        'Pork Crown (Rack)': 0.04,
        'Beef Porterhouse Short Loin': 0.02
    },
    'El Segundo': {
        'Beef Picanha (Top Butt Caps)': 0.37,
        'Beef Flap Meat (Fraldinha)': 0.23,
        'Beef Short Ribs': 0.08,
        'Beef Top Butt Sirloin (Alcatra)': 0.22,
        'Beef "Bone-in-Ribeye", Export': 0.09,
        'Beef Tenderloin': 0.10,
        'Chicken Breast': 0.14,
        'Lamb Rack': 0.07,
        'Lamb Top Sirloin Caps': 0.10,
        'Pork Sausage': 0.06,
        'Chicken Leg': 0.13,
        'Pork Belly': 0.04,
        'Pork Loin': 0.06,
        'Pork Crown (Rack)': 0.03,
        'Beef Porterhouse Short Loin': 0.02
    },
    'Emeryville': {
        'Beef Picanha (Top Butt Caps)': 0.40,
        'Beef Flap Meat (Fraldinha)': 0.25,
        'Chicken Leg': 0.14,
        'Beef Short Ribs': 0.08,
        'Beef Top Butt Sirloin (Alcatra)': 0.23,
        'Chicken Breast': 0.14,
        'Lamb Top Sirloin Caps': 0.11,
        'Beef "Bone-in-Ribeye", Export': 0.09,
        'Lamb Rack': 0.07,
        'Beef Tenderloin': 0.10,
        'Pork Belly': 0.04,
        'Pork Sausage': 0.06,
        'Pork Loin': 0.06,
        'Pork Crown (Rack)': 0.04,
        'Beef Porterhouse Short Loin': 0.02
    },
    'Fort Lauderdale': {
        'Beef Picanha (Top Butt Caps)': 0.36,
        'Beef Flap Meat (Fraldinha)': 0.22,
        'Beef Top Butt Sirloin (Alcatra)': 0.21,
        'Beef "Bone-in-Ribeye", Export': 0.08,
        'Beef Tenderloin': 0.09,
        'Chicken Leg': 0.12,
        'Chicken Breast': 0.13,
        'Beef Short Ribs': 0.07,
        'Lamb Rack': 0.06,
        'Lamb Top Sirloin Caps': 0.09,
        'Pork Sausage': 0.06,
        'Pork Belly': 0.04,
        'Pork Crown (Rack)': 0.03,
        'Pork Loin': 0.05,
        'Beef Porterhouse Short Loin': 0.02
    },
    'Friendswood': {
        'Beef Picanha (Top Butt Caps)': 0.38,
        'Beef Flap Meat (Fraldinha)': 0.23,
        'Beef "Bone-in-Ribeye", Export': 0.09,
        'Beef Top Butt Sirloin (Alcatra)': 0.22,
        'Chicken Breast': 0.14,
        'Lamb Top Sirloin Caps': 0.10,
        'Lamb Rack': 0.07,
        'Beef Tenderloin': 0.10,
        'Beef Short Ribs': 0.08,
        'Pork Sausage': 0.06,
        'Chicken Leg': 0.13,
        'Pork Loin': 0.06,
        'Pork Crown (Rack)': 0.03,
        'Beef Porterhouse Short Loin': 0.02,
        'Pork Belly': 0.04
    },
    'Houston': {
        'Beef Picanha (Top Butt Caps)': 0.36,
        'Beef Flap Meat (Fraldinha)': 0.22,
        'Beef Top Butt Sirloin (Alcatra)': 0.21,
        'Beef Tenderloin': 0.10,
        'Chicken Breast': 0.13,
        'Lamb Rack': 0.06,
        'Beef Short Ribs': 0.08,
        'Lamb Top Sirloin Caps': 0.10,
        'Chicken Leg': 0.12,
        'Beef "Bone-in-Ribeye", Export': 0.09,
        'Pork Loin': 0.06,
        'Pork Sausage': 0.06,
        'Pork Belly': 0.04,
        'Pork Crown (Rack)': 0.03,
        'Beef Porterhouse Short Loin': 0.02
    },
    'Huntington Beach': {
        'Beef Picanha (Top Butt Caps)': 0.38,
        'Beef Top Butt Sirloin (Alcatra)': 0.22,
        'Beef Flap Meat (Fraldinha)': 0.23,
        'Beef "Bone-in-Ribeye", Export': 0.09,
        'Beef Short Ribs': 0.08,
        'Chicken Breast': 0.14,
        'Chicken Leg': 0.13,
        'Lamb Top Sirloin Caps': 0.10,
        'Beef Tenderloin': 0.10,
        'Lamb Rack': 0.07,
        'Pork Sausage': 0.06,
        'Pork Loin': 0.06,
        'Pork Belly': 0.04,
        'Pork Crown (Rack)': 0.03,
        'Beef Porterhouse Short Loin': 0.02
    },
    'Huntington Station': {
        'Beef Picanha (Top Butt Caps)': 0.35,
        'Beef Top Butt Sirloin (Alcatra)': 0.20,
        'Beef Flap Meat (Fraldinha)': 0.22,
        'Beef "Bone-in-Ribeye", Export': 0.08,
        'Chicken Breast': 0.13,
        'Chicken Leg': 0.12,
        'Lamb Rack': 0.06,
        'Beef Tenderloin': 0.09,
        'Lamb Top Sirloin Caps': 0.09,
        'Beef Short Ribs': 0.07,
        'Pork Sausage': 0.06,
        'Pork Loin': 0.05,
        'Pork Crown (Rack)': 0.03,
        'Pork Belly': 0.04,
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
    'Beef Porterhouse Short Loin': 'Bone-in Ribeye' // Partial map? Or ignored? Let's map to Bone-in Ribeye or generic? 
    // Actually, T-Bone or Porterhouse isn't in our standard list, but 'Bone-in Ribeye' is close enough for High-Cost Steak category.
    // Or we can leave it unmapped and just let it be normalizer waste.
    // Let's map it to 'Filet Mignon' as high cost? No. 
    // Let's ignore it or map to 'Bone-in Ribeye' to inflate that category slightly.
};

// --- 3. Store Proxies ---
const PROXY_MAP: Record<string, string> = {
    'Denver': 'Denver',            // Match
    'Dunwoody': 'Birming',         // GA -> AL (Closest Southern Metro)
    'El Segundo': 'Cucamon',       // CA -> CA
    'Emeryville': 'Fresno',        // NorCal -> Central Cal (Fresno) or maybe Tacoma? Let's use Fresno as closest CA.
    'Fort Lauderdale': 'Saw',      // Sawgrass fits Fort Lauderdale area better than Miami Beach.
    'Friendswood': 'Houston',      // TX -> TX
    'Houston': 'Houston',          // Match
    'Huntington Beach': 'Irvine',  // CA -> CA
    'Huntington Station': 'Yonkers'// NY -> NY (Long Island -> Yonkers/Westchester)
};

async function main() {
    console.log('Starting Batch 3 Meat Target Injection...');

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
                // Skip unmapped low volume items
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
    console.log('\nBatch 3 Done.');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());

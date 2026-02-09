
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// --- 1. Raw Data from Prints (Batch 4) ---
const RAW_DATA: Record<string, Record<string, number>> = {
    'Indianapolis': {
        'Beef Picanha (Top Butt Caps)': 0.38,
        'Beef Flap Meat (Fraldinha)': 0.24,
        'Beef Top Butt Sirloin (Alcatra)': 0.22,
        'Chicken Breast': 0.14,
        'Chicken Leg': 0.13,
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
    'Irvine': {
        'Beef Picanha (Top Butt Caps)': 0.39,
        'Beef Flap Meat (Fraldinha)': 0.24,
        'Beef Top Butt Sirloin (Alcatra)': 0.22,
        'Chicken Breast': 0.14,
        'Chicken Leg': 0.13,
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
    'Jacksonville': {
        'Beef Picanha (Top Butt Caps)': 0.38,
        'Beef Flap Meat (Fraldinha)': 0.24,
        'Beef Top Butt Sirloin (Alcatra)': 0.22,
        'Chicken Breast': 0.14,
        'Chicken Leg': 0.13,
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
    'Kansas City': {
        'Beef Picanha (Top Butt Caps)': 0.38,
        'Beef Flap Meat (Fraldinha)': 0.24,
        'Beef Top Butt Sirloin (Alcatra)': 0.22,
        'Chicken Breast': 0.14,
        'Chicken Leg': 0.13,
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
    'King of Prussia': {
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
    'Las Vegas': {
        'Beef Picanha (Top Butt Caps)': 0.40,
        'Beef Flap Meat (Fraldinha)': 0.25,
        'Beef Top Butt Sirloin (Alcatra)': 0.23,
        'Chicken Breast': 0.14,
        'Chicken Leg': 0.14,
        'Lamb Top Sirloin Caps': 0.11,
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
    'Lone Tree': {
        'Beef Picanha (Top Butt Caps)': 0.37,
        'Beef Flap Meat (Fraldinha)': 0.23,
        'Beef Top Butt Sirloin (Alcatra)': 0.21,
        'Chicken Leg': 0.13,
        'Chicken Breast': 0.13,
        'Beef Tenderloin': 0.10,
        'Lamb Top Sirloin Caps': 0.10,
        'Beef "Bone-in-Ribeye", Export': 0.09,
        'Beef Short Ribs': 0.08,
        'Lamb Rack': 0.07,
        'Pork Sausage': 0.06,
        'Pork Loin': 0.06,
        'Pork Belly': 0.04,
        'Pork Crown (Rack)': 0.03,
        'Beef Porterhouse Short Loin': 0.02
    },
    'Long Island': {
        'Beef Picanha (Top Butt Caps)': 0.36,
        'Beef Flap Meat (Fraldinha)': 0.22,
        'Beef Top Butt Sirloin (Alcatra)': 0.21,
        'Chicken Breast': 0.13,
        'Chicken Leg': 0.12,
        'Lamb Top Sirloin Caps': 0.10,
        'Beef Tenderloin': 0.10,
        'Beef "Bone-in-Ribeye", Export': 0.09,
        'Beef Short Ribs': 0.08,
        'Lamb Rack': 0.06,
        'Pork Loin': 0.06,
        'Pork Sausage': 0.06,
        'Pork Belly': 0.04,
        'Pork Crown (Rack)': 0.03,
        'Beef Porterhouse Short Loin': 0.02
    },
    'Los Angeles': {
        'Beef Picanha (Top Butt Caps)': 0.43,
        'Beef Flap Meat (Fraldinha)': 0.27,
        'Beef Top Butt Sirloin (Alcatra)': 0.25,
        'Chicken Breast': 0.16,
        'Chicken Leg': 0.15,
        'Lamb Top Sirloin Caps': 0.12,
        'Beef Tenderloin': 0.11,
        'Beef "Bone-in-Ribeye", Export': 0.10,
        'Beef Short Ribs': 0.09,
        'Lamb Rack': 0.08,
        'Pork Sausage': 0.07,
        'Pork Loin': 0.07,
        'Pork Belly': 0.05,
        'Pork Crown (Rack)': 0.04,
        'Beef Porterhouse Short Loin': 0.02
    },
    'Lynnwood': {
        'Beef Picanha (Top Butt Caps)': 0.40,
        'Beef Flap Meat (Fraldinha)': 0.25,
        'Beef Top Butt Sirloin (Alcatra)': 0.23,
        'Chicken Breast': 0.15,
        'Chicken Leg': 0.14,
        'Lamb Top Sirloin Caps': 0.11,
        'Beef Tenderloin': 0.11,
        'Beef "Bone-in-Ribeye", Export': 0.10,
        'Lamb Rack': 0.07,
        'Beef Short Ribs': 0.08,
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
    'Indianapolis': 'Schaum',      // Midwest Proxy (Schaumburg IL)
    'Irvine': 'Irvine',            // Match
    'Jacksonville': 'Jax',         // Match
    'Kansas City': 'Omaha',        // Midwest Proxy (Omaha)
    'King of Prussia': 'King',     // Match
    'Las Vegas': 'Vegas',          // Match 
    'Lone Tree': 'Denver',         // CO Proxy
    'Long Island': 'Yonkers',      // NY Proxy (Yonkers/Westchester)
    'Los Angeles': 'Cucamon',      // LA Proxy (Rancho Cucamonga)
    'Lynnwood': 'Tacoma'           // WA Proxy
};

async function main() {
    console.log('Starting Batch 4 Meat Target Injection...');

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
    console.log('\nBatch 4 Done.');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());

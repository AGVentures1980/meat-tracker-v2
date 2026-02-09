
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// --- 1. Raw Data from Prints ---
const RAW_DATA: Record<string, Record<string, number>> = {
    'Addison': {
        'Beef Picanha (Top Butt Caps)': 0.35,
        'Beef Flap Meat (Fraldinha)': 0.22,
        'Beef Tenderloin': 0.09,
        'Chicken Leg': 0.12,
        'Beef Short Ribs': 0.07,
        'Chicken Breast': 0.13,
        'Lamb Top Sirloin Caps': 0.09,
        'Pork Loin': 0.05,
        'Pork Sausage': 0.05,
        'Lamb Rack': 0.06
    },
    'Albuquerque': {
        'Beef Picanha (Top Butt Caps)': 0.38,
        'Beef Top Butt Sirloin (Alcatra)': 0.22,
        'Chicken Leg': 0.13,
        'Beef Flap Meat (Fraldinha)': 0.24,
        'Lamb Top Sirloin Caps': 0.10,
        'Beef Tenderloin': 0.10,
        'Beef "Bone-in-Ribeye", Export': 0.09,
        'Pork Loin': 0.06,
        'Pork Sausage': 0.06,
        'Beef Short Ribs': 0.08,
        'Chicken Breast': 0.14,
        'Lamb Rack': 0.07,
        'Pork Belly': 0.04
    },
    'Atlanta': {
        'Beef Picanha (Top Butt Caps)': 0.40,
        'Beef Flap Meat (Fraldinha)': 0.25,
        'Beef Top Butt Sirloin (Alcatra)': 0.23,
        'Chicken Leg': 0.14,
        'Lamb Top Sirloin Caps': 0.11,
        'Chicken Breast': 0.14,
        'Beef Tenderloin': 0.10,
        'Beef "Bone-in-Ribeye", Export': 0.09,
        'Lamb Rack': 0.07,
        'Beef Short Ribs': 0.08,
        'Pork Belly': 0.04,
        'Pork Sausage': 0.06,
        'Pork Loin': 0.06
    },
    'Austin Congress': {
        'Beef Picanha (Top Butt Caps)': 0.39,
        'Beef Flap Meat (Fraldinha)': 0.24,
        'Beef Top Butt Sirloin (Alcatra)': 0.23,
        'Chicken Breast': 0.14,
        'Chicken Leg': 0.13,
        'Beef Tenderloin': 0.10,
        'Lamb Top Sirloin Caps': 0.10,
        'Beef Short Ribs': 0.08,
        'Beef "Bone-in-Ribeye", Export': 0.09,
        'Lamb Rack': 0.07,
        'Pork Loin': 0.06,
        'Pork Sausage': 0.06,
        'Pork Belly': 0.04
    },
    'Baltimore': {
        'Beef Top Butt Sirloin (Alcatra)': 0.24,
        'Beef Picanha (Top Butt Caps)': 0.41,
        'Chicken Breast': 0.15,
        'Chicken Leg': 0.14,
        'Beef Flap Meat (Fraldinha)': 0.25,
        'Beef Short Ribs': 0.09,
        'Lamb Top Sirloin Caps': 0.11,
        'Pork Loin': 0.06,
        'Lamb Rack': 0.07,
        'Beef "Bone-in-Ribeye", Export': 0.10,
        'Pork Belly': 0.04,
        'Beef Tenderloin': 0.11,
        'Pork Sausage': 0.06
    },
    'Bellevue': {
        'Beef Top Butt Sirloin (Alcatra)': 0.23,
        'Beef Flap Meat (Fraldinha)': 0.24,
        'Beef Picanha (Top Butt Caps)': 0.39,
        'Chicken Leg': 0.13,
        'Chicken Breast': 0.14,
        'Beef "Bone-in-Ribeye", Export': 0.09,
        'Lamb Top Sirloin Caps': 0.10,
        'Beef Tenderloin': 0.10,
        'Beef Short Ribs': 0.08,
        'Lamb Rack': 0.07,
        'Pork Loin': 0.06,
        'Pork Sausage': 0.06,
        'Pork Belly': 0.04
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
    'Beef Tri Tip': 'Tri-Tip'
};

// --- 3. Store Proxies ---
const PROXY_MAP: Record<string, string> = {
    'Addison': 'Addison',
    'Albuquerque': 'Denver',
    'Atlanta': 'Birming',
    'Austin Congress': 'SanAnt',
    'Baltimore': 'FairOak',
    'Bellevue': 'Tacoma'
};

async function main() {
    console.log('Starting Meat Target Injection & Normalization...');

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

        const TARGET_LBS = store.target_lbs_guest; // e.g., 1.76 or 1.23
        const sumRaw = Object.values(rawMeats).reduce((a, b) => a + b, 0);

        // 2. Normalization Factor
        const factor = TARGET_LBS / sumRaw;

        console.log(`\nProcessing ${sourceName} -> ${store.store_name} (ID: ${store.id})`);
        console.log(`Target: ${TARGET_LBS.toFixed(3)} | Sum Raw: ${sumRaw.toFixed(3)} | Factor: ${factor.toFixed(4)}`);

        // 3. Process Items
        for (const [printName, rawVal] of Object.entries(rawMeats)) {
            const dbName = MEAT_MAPPING[printName];
            if (!dbName) {
                // If it's 0.00 usually we skip, but for nonzero we should warn
                if (rawVal > 0) console.warn(`   ⚠️ No mapping for "${printName}" (${rawVal})`);
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
    console.log('\nDone.');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());

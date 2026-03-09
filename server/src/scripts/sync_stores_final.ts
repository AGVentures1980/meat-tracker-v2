import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const raw = `Addison	557000
Albany	438000
Ann Arbor	423000
Baton Rouge	456000
Birmingham	560000
Buffalo	405000
Carlsbad	385000
Cincinnati	456000
Cleveland	358000
Columbus	620000
Dadeland	332000
Dallas	390000
Denver	1000000
Detroit	568000
Fairfax	719000
Fresno	472000
Ft Worth	1009000
Grand Rapids	642000
Greenville	430000
Hallandale Beach	406000
Hartford	358000
Houston I	486000
Huntsville	433000
Irvine	640000
Jacksonville	390000
Las Vegas	1277000
Lexington	358000
Louisville	478000
McAllen	412000
Memphis	580000
Miami 	758000
Miami Beach	265000
Milwaukee	313000
OKC	358000
Omaha	287000
Orland Park	422000
Orlando 	1038000
Palm Beach	550000
Pittsburgh	555000
Rancho	853000
Richmond	646000
Rochester	392000
Rogers	320000
San Antonio	387000
Sawgrass	552000
Schaumburg	1009000
Smith Haven	224388
Syracuse	397000
Tacoma	647000
Tampa	935000
Tulsa	445000
Tyler	317000
Woodmere	489000
Westchester	470000`;

async function sync() {
    const lines = raw.split('\n');
    const existingStores = await prisma.store.findMany({
        where: { company_id: 'tdb-main' }
    });

    // Find highest ID to avoid collisions
    const maxIdRes = await prisma.store.aggregate({
        _max: { id: true }
    });
    let nextId = (maxIdRes._max.id || existingStores.length) + 10;

    let added = 0;

    for (const line of lines) {
        const p = line.split(/(\d+)/);
        if (p.length < 2) continue;

        const storeName = p[0].trim();

        // Exact match check first
        let exists = existingStores.find(s =>
            s.store_name.toLowerCase().trim() === storeName.toLowerCase().trim()
        );

        // Looser match check second
        if (!exists) {
            exists = existingStores.find(s =>
                s.store_name.toLowerCase().replace(/[\s-]/g, '') === storeName.toLowerCase().replace(/[\s-]/g, '')
            );
        }

        if (!exists) {
            console.log(`Missing DB Store: [${storeName}] - Adding as ID: ${nextId}`);
            try {
                await prisma.store.create({
                    data: {
                        id: nextId,
                        store_name: storeName,
                        company_id: 'tdb-main',
                        location: 'TBD'
                    }
                });
                added++;
                nextId++;
            } catch (e) {
                console.error("Failed to add:", storeName);
            }
        }
    }

    console.log(`Sync complete. Added ${added} explicitly.`);

    const count = await prisma.store.count({ where: { company_id: 'tdb-main' } });
    console.log(`Total TdB Stores in DB now: ${count}`);
}

sync().catch(console.error).finally(() => prisma.$disconnect());

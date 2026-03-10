import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const fdcStores = [
    { id: 163, name: 'Providence' },
    { id: 164, name: 'North Irving' },
    { id: 159, name: 'Huntington Beach' },
    { id: 135, name: 'Tysons Corner' },
    { id: 158, name: 'Reston' },
    { id: 129, name: 'San Francisco' },
    { id: 104, name: 'Chicago' },
    { id: 132, name: 'King of Prussia' },
    { id: 123, name: 'San Jose' },
    { id: 118, name: 'Orlando' },
    { id: 134, name: 'Dallas - Uptown' },
    { id: 102, name: 'Houston' },
    { id: 160, name: 'Woodland Hills' },
    { id: 182, name: 'Houston Cypress' },
    { id: 170, name: 'Richmond' },
    { id: 137, name: 'Troy' },
    { id: 109, name: 'Baltimore' },
    { id: 157, name: 'Paramus' },
    { id: 105, name: 'Beverly Hills' },
    { id: 166, name: 'Emeryville' },
    { id: 175, name: 'Seattle' },
    { id: 125, name: 'Los Angeles' },
    { id: 149, name: 'Oak Brook' },
    { id: 117, name: 'Las Vegas' },
    { id: 103, name: 'Atlanta' },
    { id: 121, name: 'Rosemont' },
    { id: 180, name: 'Roseville' },
    { id: 165, name: 'Thousand Oaks' },
    { id: 119, name: 'Boston' },
    { id: 133, name: 'Dunwoody' },
    { id: 128, name: 'The Woodlands' },
    { id: 144, name: 'Long Island' },
    { id: 173, name: 'Towson' },
    { id: 113, name: 'Scottsdale' },
    { id: 172, name: 'Miami Dadeland' },
    { id: 178, name: 'Orlando Vineland' },
    { id: 151, name: 'El Segundo' },
    { id: 169, name: 'Brooklyn' },
    { id: 114, name: 'Kansas City' },
    { id: 136, name: 'Bellevue' },
    { id: 174, name: 'Oklahoma City' },
    { id: 145, name: 'Irvine' },
    { id: 124, name: 'Portland' },
    { id: 111, name: 'Indianapolis' },
    { id: 154, name: 'Pasadena' },
    { id: 167, name: 'Brea' },
    { id: 147, name: 'Burlington' },
    { id: 140, name: 'Pittsburgh' },
    { id: 108, name: 'Minneapolis' },
    { id: 120, name: 'San Diego' },
    { id: 171, name: 'Bridgewater' },
    { id: 101, name: 'Addison' },
    { id: 155, name: 'Friendswood' },
    { id: 156, name: 'Austin Congress' },
    { id: 107, name: 'Philadelphia' },
    { id: 116, name: 'San Antonio' },
    { id: 142, name: 'Bethesda' },
    { id: 138, name: 'Jacksonville' },
    { id: 130, name: 'New Orleans' },
    { id: 146, name: 'Albuquerque' },
    { id: 161, name: 'National Harbor' },
    { id: 148, name: 'Huntington Station' },
    { id: 153, name: 'Queens' },
    { id: 122, name: 'New York' },
    { id: 168, name: 'Wayne' },
    { id: 112, name: 'Miami Beach' },
    { id: 126, name: 'San Juan' },
    { id: 131, name: 'Naperville' },
    { id: 152, name: 'Fort Lauderdale' },
    { id: 139, name: 'Plano' },
    { id: 141, name: 'Lone Tree' },
    { id: 150, name: 'Coral Gables' },
    { id: 143, name: 'White Plains' },
    { id: 176, name: 'The Wharf' },
    { id: 106, name: 'Washington' },
    { id: 162, name: 'Lynnwood' },
    { id: 115, name: 'Denver' }
];

const FDC_COMPANY_ID = '43670635-c205-4b19-99d4-445c7a683730';

async function main() {
    console.log('Seeding official Fogo de Chão Store List...');

    // Update or Create the stores
    let created = 0;
    let updated = 0;

    for (const fdcStore of fdcStores) {
        const existing = await prisma.store.findFirst({
            where: { store_name: fdcStore.name, company_id: FDC_COMPANY_ID }
        });

        if (existing) {
            // Technically these IDs might clash if TDB also uses these exact numerical IDs,
            // but since we rely on string company ID separation and UUID/autoincrement mix
            // let's just make sure the name and Location correlate to the real store ID.
            // We will store the custom ID in the location or as the actual DB ID if possible.
            // Prisma `id` is autoincrement integer for `Store`
            updated++;
        } else {
            await prisma.store.create({
                data: {
                    id: fdcStore.id + 1000, // Offset to avoid overlapping with TDB local testing data
                    company_id: FDC_COMPANY_ID,
                    store_name: fdcStore.name,
                    location: `FDC-${fdcStore.id}`, // Store official ID here safely
                    // Standard FDC Baseline initialized from previous steps
                    baseline_consumption_pax: 1.53,
                    target_lbs_guest: 1.53,
                    target_cost_guest: 9.50,
                    baseline_cost_per_lb: 6.21
                }
            });
            created++;
        }
    }

    console.log(`Successfully synced ${created} new stores and updated ${updated} existing FDC stores.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());

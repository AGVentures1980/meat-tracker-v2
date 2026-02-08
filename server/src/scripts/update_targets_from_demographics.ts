
import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import * as path from 'path';

const prisma = new PrismaClient();

const FILE_PATH = '/Users/alexandregarcia/Downloads/Fresh Back Office Transition - Texas de Brazil Login Details.xlsx';

// Demographic Tiers
const TIER_TOURIST = 1.95; // Vacation mode, high consumption
const TIER_METRO = 1.82;   // Urban, heavy dinners
const TIER_STANDARD = 1.76; // Default

// Keywords for auto-classification
const TOURIST_CITIES = ['Orlando', 'Las Vegas', 'Miami Beach', 'Anaheim', 'Fort Lauderdale', 'Hallandale Beach'];
const METRO_CITIES = ['Dallas', 'Chicago', 'New York', 'Detroit', 'Houston', 'San Antonio', 'Denver', 'Washington'];

function calculateTarget(city: string, state: string): number {
    const c = city.trim();
    if (TOURIST_CITIES.some(tc => c.includes(tc))) return TIER_TOURIST;
    if (METRO_CITIES.some(mc => c.includes(mc))) return TIER_METRO;
    return TIER_STANDARD;
}

async function main() {
    console.log('Reading Excel file...');
    const workbook = XLSX.readFile(FILE_PATH);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet);

    console.log(`Found ${rows.length} stores in file. Processing...`);

    let updatedCount = 0;

    for (const row of rows) {
        const storeIdStr = row['Store #'];
        const city = row['City'];
        const state = row['State']; // "United States - Ohio (OH)"

        if (!storeIdStr || !city) continue;

        const storeId = parseInt(storeIdStr);
        if (isNaN(storeId)) continue;

        const target = calculateTarget(city, state);

        // Log the decision logic
        console.log(`Store ${storeId} (${city}): Assigned Target ${target}`);

        try {
            await prisma.store.update({
                where: { id: storeId },
                data: { target_lbs_guest: target }
            });
            updatedCount++;
        } catch (error) {
            console.error(`Failed to update store ${storeId}:`, error);
        }
    }

    console.log(`\nSUCCESS: Updated ${updatedCount} stores with demographic targets.`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

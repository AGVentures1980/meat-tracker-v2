import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const FDC_COMPANY_ID = '43670635-c205-4b19-99d4-445c7a683730';

const fdc2025Targets: Record<string, number> = {
    // BEEF
    'Beef Picanha (Top Butt Caps)': 0.38,
    'Beef Flap Meat (Fraldinha)': 0.24,
    'Beef Top Butt Sirloin (Alcatra)': 0.22,
    'Beef "Bone-in-Ribeye", Export': 0.09,
    'Beef Tenderloin': 0.10,
    'Beef Short Ribs': 0.08,
    'Beef Strip': 0.00,
    'Beef Porterhouse Short Loin': 0.02,
    'Beef Ribeye': 0.00,

    // CHICKEN
    'Chicken Breast': 0.14,
    'Chicken Leg': 0.13,
    'Chicken Heart': 0.00,

    // PORK
    'Pork Sausage': 0.06,
    'Pork Loin': 0.06,
    'Pork Belly': 0.04,
    'Pork Crown (Rack)': 0.04,

    // LAMB
    'Lamb Top Sirloin Caps': 0.10,
    'Lamb Rack': 0.07,
    'Lamb Leg': 0.00,
};

async function main() {
    console.log('Calibrating FDC 2025 Target Metrics (Fiscal Week 8 Consolidation)...');

    // 1. Update all FDC Stores with new Corporate Baselines
    const storesUpdated = await prisma.store.updateMany({
        where: { company_id: FDC_COMPANY_ID },
        data: {
            baseline_consumption_pax: 1.79, // Actual YTD Lbs/Guest
            target_lbs_guest: 1.76,         // 2025 Plan Lbs/Guest
            target_cost_guest: 10.25,       // Target PTD Cost
            baseline_cost_per_lb: 5.78      // Average Blended Cost/Lb
        }
    });

    console.log(`Updated network baselines for ${storesUpdated.count} FDC stores.`);

    // 2. Update all specific cuts to the exact 2025 Plan Targets
    let cutsUpdated = 0;
    for (const [name, target] of Object.entries(fdc2025Targets)) {
        const updated = await prisma.companyProduct.updateMany({
            where: { company_id: FDC_COMPANY_ID, name: name },
            data: { standard_target: target }
        });
        cutsUpdated += updated.count;
    }

    console.log(`Successfully calibrated ${cutsUpdated} FDC meat cuts to 2025 fiscal targets. Bar Food protections untouched.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());

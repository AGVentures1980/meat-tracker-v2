import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const FDC_COMPANY_ID = '43670635-c205-4b19-99d4-445c7a683730';

const fdcMeats = [
    // BEEF
    { name: 'Beef Picanha (Top Butt Caps)', category: 'BEEF', protein_group: 'BEEF', is_villain: true, target: 0.42 },
    { name: 'Beef Flap Meat (Fraldinha)', category: 'BEEF', protein_group: 'BEEF', is_villain: true, target: 0.23 },
    { name: 'Beef Top Butt Sirloin (Alcatra)', category: 'BEEF', protein_group: 'BEEF', is_villain: false, target: 0.13 },
    { name: 'Beef "Bone-in-Ribeye", Export', category: 'BEEF', protein_group: 'BEEF', is_villain: true, target: 0.08 },
    { name: 'Beef Tenderloin', category: 'BEEF', protein_group: 'BEEF', is_villain: true, target: 0.10 },
    { name: 'Beef Short Ribs', category: 'BEEF', protein_group: 'BEEF', is_villain: true, target: 0.07 },
    { name: 'Beef Strip', category: 'BEEF', protein_group: 'BEEF', is_villain: false, target: 0.05 },
    { name: 'Beef Porterhouse Short Loin', category: 'BEEF', protein_group: 'BEEF', is_villain: false, target: 0.01 },
    { name: 'Beef Ribeye', category: 'BEEF', protein_group: 'BEEF', is_villain: true, target: 0.05 },

    // CHICKEN
    { name: 'Chicken Breast', category: 'CHICKEN', protein_group: 'POULTRY', is_villain: false, target: 0.07 },
    { name: 'Chicken Leg', category: 'CHICKEN', protein_group: 'POULTRY', is_villain: false, target: 0.05 },
    { name: 'Chicken Heart', category: 'CHICKEN', protein_group: 'POULTRY', is_villain: false, target: 0.01 },

    // PORK
    { name: 'Pork Sausage', category: 'PORK', protein_group: 'PORK', is_villain: false, target: 0.06 },
    { name: 'Pork Loin', category: 'PORK', protein_group: 'PORK', is_villain: false, target: 0.05 },
    { name: 'Pork Belly', category: 'PORK', protein_group: 'PORK', is_villain: false, target: 0.04 },
    { name: 'Pork Crown (Rack)', category: 'PORK', protein_group: 'PORK', is_villain: false, target: 0.02 },

    // LAMB
    { name: 'Lamb Top Sirloin Caps', category: 'LAMB', protein_group: 'LAMB', is_villain: false, target: 0.08 },
    { name: 'Lamb Rack', category: 'LAMB', protein_group: 'LAMB', is_villain: true, target: 0.07 },
    { name: 'Lamb Leg', category: 'LAMB', protein_group: 'LAMB', is_villain: false, target: 0.04 },

    // --- NEW: BAR FOGO (ISOLATED DEDUCTIONS) ---
    // We classify these as BAR FOOD so the Engine can isolate them from the Dining Room Lbs/Guest metric
    { name: 'Bar Fogo Picanha Burger (8oz)', category: 'BAR FOOD', protein_group: 'BEEF', is_villain: false, target: 0.00 },
    { name: 'Bar Fogo Beef Ribs (A La Carte)', category: 'BAR FOOD', protein_group: 'BEEF', is_villain: false, target: 0.00 },
    { name: 'Bar Fogo Filet Mignon (6oz)', category: 'BAR FOOD', protein_group: 'BEEF', is_villain: false, target: 0.00 },
    { name: 'Bar Fogo Lamb Chops (Single/4 Bones)', category: 'BAR FOOD', protein_group: 'LAMB', is_villain: false, target: 0.00 },
];

async function main() {
    console.log('Syncing Official FDC Meat Categories & Bar Food Isolation...');

    // Wipe existing products to avoid duplicates with old naming conventions
    await prisma.companyProduct.deleteMany({
        where: { company_id: FDC_COMPANY_ID }
    });

    let count = 0;
    for (const meat of fdcMeats) {
        await prisma.companyProduct.create({
            data: {
                company_id: FDC_COMPANY_ID,
                name: meat.name,
                category: meat.category,
                protein_group: meat.protein_group,
                is_villain: meat.is_villain,
                standard_target: meat.target,
                lbs_per_skewer: 2.0 // Generic default
            }
        });
        count++;
    }

    console.log(`Successfully synced ${count} FDC cuts, perfectly isolating the new Bar Food category.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());

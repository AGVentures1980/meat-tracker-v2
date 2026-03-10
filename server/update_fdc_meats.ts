import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const FDC_COMPANY_ID = '43670635-c205-4b19-99d4-445c7a683730';

const fdcMatrix = [
    { name: 'BEEF BONE IN RIBEYE', protein_group: 'BEEF', is_villain: true, target: 0.08 },
    { name: 'BEEF FLAP MEAT', protein_group: 'BEEF', is_villain: true, target: 0.23 },
    { name: 'BEEF PICANHA', protein_group: 'BEEF', is_villain: true, target: 0.42 },
    { name: 'BEEF PORTERHOUSE', protein_group: 'BEEF', is_villain: false, target: 0.01 },
    { name: 'BEEF SHORT RIBS', protein_group: 'BEEF', is_villain: true, target: 0.07 },
    { name: 'BEEF TENDERLOIN', protein_group: 'BEEF', is_villain: true, target: 0.10 },
    { name: 'BEEF TOP BUTT', protein_group: 'BEEF', is_villain: false, target: 0.13 },
    { name: 'CHICKEN BREAST', protein_group: 'POULTRY', is_villain: false, target: 0.07 },
    { name: 'CHICKEN DRUMSTICKS', protein_group: 'POULTRY', is_villain: false, target: 0.09 },
    { name: 'CHICKEN HEART', protein_group: 'POULTRY', is_villain: false, target: 0.01 },
    { name: 'LAMB RACK', protein_group: 'LAMB', is_villain: true, target: 0.07 },
    { name: 'LAMB TOP SIRLOIN', protein_group: 'LAMB', is_villain: false, target: 0.08 },
    { name: 'PORK BELLY', protein_group: 'PORK', is_villain: false, target: 0.04 },
    { name: 'PORK CROWN/CHOP', protein_group: 'PORK', is_villain: false, target: 0.02 },
    { name: 'PORK LOIN', protein_group: 'PORK', is_villain: false, target: 0.05 },
    { name: 'PORK SAUSAGE', protein_group: 'PORK', is_villain: false, target: 0.06 }
];

async function main() {
    console.log('Replacing FDC Meat Matrix with official Fogo Calculator...');

    // 1. Wipe existing FDC products
    await prisma.companyProduct.deleteMany({
        where: { company_id: FDC_COMPANY_ID }
    });

    // 2. Insert precise FDC metrics
    for (const item of fdcMatrix) {
        await prisma.companyProduct.create({
            data: {
                company_id: FDC_COMPANY_ID,
                name: item.name,
                protein_group: item.protein_group,
                is_villain: item.is_villain,
                standard_target: item.target,
                lbs_per_skewer: 2.0 // Setting a generic default
            }
        });
    }

    // 3. Update FDC Stores with new Baseline (Total 1.53 Lbs/Guest, Cost 9.50/Guest -> $6.21/lb)
    const costPerLb = 9.50 / 1.53; // ~6.21
    await prisma.store.updateMany({
        where: { company_id: FDC_COMPANY_ID },
        data: {
            baseline_consumption_pax: 1.53,
            target_lbs_guest: 1.53,
            target_cost_guest: 9.50,
            baseline_cost_per_lb: costPerLb
        }
    });

    console.log('Matrix successfully ingested.');
}

main().catch(console.error).finally(() => prisma.$disconnect());

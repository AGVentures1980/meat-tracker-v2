import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
    const specs = await prisma.corporateProteinSpec.findMany();
    console.log("All specs in DB:");
    specs.forEach((s: any) => console.log(s.company_id, s.protein_name, s.approved_item_code));
    const stores = await prisma.store.findMany();
    console.log("\nStores:");
    stores.forEach((s: any) => console.log(s.id, s.store_name, s.company_id));
}
run();

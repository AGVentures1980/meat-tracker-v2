import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const specs = await prisma.corporateProteinSpec.findMany();
    console.log(JSON.stringify(specs, null, 2));
}
main().finally(() => prisma.$disconnect());

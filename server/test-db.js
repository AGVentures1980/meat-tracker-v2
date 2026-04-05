const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const specs = await prisma.corporateProteinSpec.findMany();
    console.log(specs);
}
main();

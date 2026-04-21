import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
    const c = await prisma.company.findUnique({where:{id:'e112deec-8422-44df-be9e-d3925fd8f390'}});
    console.log(c);
}
run();

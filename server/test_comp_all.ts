import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
    const companies = await prisma.company.findMany();
    companies.forEach((c:any) => console.log(c.id, c.name, c.subdomain));
}
run();

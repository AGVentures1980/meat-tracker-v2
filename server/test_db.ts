import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const fdcCompany = await prisma.company.findMany({
        where: { name: { contains: 'Fogo', mode: 'insensitive' } }
    });
    console.log("FDC Company Record(s):", fdcCompany.map(c => c.name));
    
    const ams = await prisma.user.findMany({
        where: { role: 'area_manager' },
        select: { email: true, first_name: true, last_name: true }
    });
    console.log("All Area Managers globally:", ams);
}

main().finally(() => prisma.$disconnect());

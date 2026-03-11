const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const fdcCompany = await prisma.company.findFirst({
        where: { name: { contains: 'Fogo', mode: 'insensitive' } }
    });
    console.log("FDC Company Record:", fdcCompany?.name);
    
    const ams = await prisma.user.findMany({
        where: { role: 'area_manager' },
        select: { email: true, first_name: true }
    });
    console.log("All Area Managers globally:", ams);
}

main().finally(() => prisma.$disconnect());

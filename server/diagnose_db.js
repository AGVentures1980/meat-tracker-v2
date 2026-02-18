const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.findUnique({
        where: { email: 'dallas@texasdebrazil.com' },
        include: { store: true }
    });
    console.log('USER:', JSON.stringify(user, null, 2));

    const companies = await prisma.company.findMany({
        include: { _count: { select: { stores: true } } }
    });
    console.log('COMPANIES:', JSON.stringify(companies, null, 2));
}

main().finally(() => prisma.$disconnect());

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const user = await prisma.user.findFirst({ where: { email: { contains: 'alexandre' } } });
    console.log(user);
    const dallas = await prisma.user.findFirst({ where: { email: { contains: 'dallas' } } });
    console.log(dallas);
}
main().catch(console.error).finally(() => prisma.$disconnect());

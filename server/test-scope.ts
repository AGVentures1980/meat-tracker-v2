import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const u = await prisma.user.findUnique({where: {email: 'global.ceo@outback.com'}, include: {scope: true}});
    console.log(u?.scope);
}
main().finally(() => prisma.$disconnect());

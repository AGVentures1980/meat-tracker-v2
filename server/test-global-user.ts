import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const user = await prisma.user.findFirst({ where: { first_name: "Global" } });
    console.log(user);
}
main().finally(() => prisma.$disconnect());

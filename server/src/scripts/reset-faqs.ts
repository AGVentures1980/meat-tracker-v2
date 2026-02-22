import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    console.log("Deleting old Portuguese FAQs...");
    const result = await prisma.fAQ.deleteMany({});
    console.log(`Deleted ${result.count} FAQs.`);
}
main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());

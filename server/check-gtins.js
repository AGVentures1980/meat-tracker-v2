const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const specs = await prisma.corporateProteinSpec.findMany();
  console.log("All Registered Corporate GTINs:");
  console.log(specs.map(s => `ID: ${s.id} | Protein: ${s.protein_name} | Code: ${s.approved_item_code}`));
}
main().catch(console.error).finally(() => prisma.$disconnect());

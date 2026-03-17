const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const contract = await prisma.contractDocument.create({
    data: {
      company_name: 'DELETE TEST',
      signer_name: 'Test',
      signer_email: 'test@example.com',
      price: 100,
      locations_count: 1,
      status: 'DRAFT'
    }
  });
  console.log('Created:', contract.id);
  await prisma.contractDocument.delete({ where: { id: contract.id } });
  console.log('Deleted successfully!');
}
main().catch(console.error).finally(() => prisma.$disconnect());

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const fdcCompanyId = '43670635-c205-4b19-99d4-445c7a683730';
  
  // Remove Tri-Tip
  await prisma.companyProduct.deleteMany({
    where: { company_id: fdcCompanyId, name: { contains: 'Tri-Tip' } }
  });

  // Remove Fraldinha/Flap Meat
  await prisma.companyProduct.deleteMany({
    where: { company_id: fdcCompanyId, name: { contains: 'Beef Flap Meat (Fraldinha)' } }
  });

  // Add Ribeye if it doesn't exist
  const existingRibeye = await prisma.companyProduct.findFirst({
      where: { company_id: fdcCompanyId, name: { contains: 'Ribeye' } }
  });
  if (!existingRibeye) {
      await prisma.companyProduct.create({
          data: {
              company_id: fdcCompanyId,
              name: 'Ribeye',
              category: 'BEEF',
              unit_of_measure: 'Lbs',
              cost_per_unit: 14.50,
              is_active: true,
              include_in_waste: true,
              include_in_prep: true,
              include_in_delivery: true
          }
      });
  }
}
main().then(() => console.log('Done')).catch(console.error);

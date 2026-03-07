const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const translations = {
    'Template em Branco': { name: 'Blank Template', desc: 'Starting point to create a custom template from scratch.' },
    'Rodízio Padrão': { name: 'Standard Rodizio', desc: 'Baseline for normal weeks. All standard values calibrated.' },
    'Volume Alto': { name: 'High Volume', desc: 'Busy weekends, holidays. +20% on LBS target.' },
    'Ribs-Heavy': { name: 'Ribs-Heavy', desc: 'Summer / grilling season. High demand for ribs.' },
    'Premium Mix': { name: 'Premium Mix', desc: 'Corporate events, high ticket nights. More Filet and Picanha.' },
    'Evento Especial': { name: 'Special Event', desc: "Valentine's Day, NYE, Mother's Day. 4x volume, premium mix, tight tolerance." }
  };
  
  for (const [oldName, newVals] of Object.entries(translations)) {
    const updated = await prisma.storeTemplate.updateMany({
      where: { name: oldName },
      data: { name: newVals.name, description: newVals.desc }
    });
    console.log(`Updated ${updated.count} templates named ${oldName}`);
  }
  console.log('Database templates translated.');
}
main().finally(() => prisma.$disconnect());

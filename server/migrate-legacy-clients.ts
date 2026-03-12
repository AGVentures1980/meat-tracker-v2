import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateLegacyClients() {
  console.log('🛡️ Starting Legacy Client Migration (Protecting FDC & TDB from Stripe Defaults)...');

  try {
    // Fogo de Chão and Texas de Brazil should never be automatically charged or suspended by Stripe
    const updatedCount = await prisma.company.updateMany({
      where: {
        name: {
          in: ['Texas de Brazil', 'Fogo de Chao'] // We can't use just 'Fogo de Chao' since it might have accents in some DB copies, but usually seed uses no accents.
        }
      },
      data: {
        billing_type: 'MANUAL_INVOICE',
        company_status: 'Active' // Ensure they are active
      }
    });

    // Let's also try with accent just in case
    const updatedCountAccented = await prisma.company.updateMany({
        where: {
          name: {
            in: ['Fogo de Chão'] 
          }
        },
        data: {
          billing_type: 'MANUAL_INVOICE',
          company_status: 'Active'
        }
    });

    console.log(`✅ Shielded ${updatedCount.count + updatedCountAccented.count} Legacy Companies from Stripe Automation.`);
    console.log('Legacy Accounts marked as MANUAL_INVOICE.');

  } catch (error) {
    console.error('❌ Failed to run migration:', error);
  } finally {
    await prisma.$disconnect();
    console.log('Migration Complete.');
  }
}

migrateLegacyClients();

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { subDays, startOfDay, addDays } from 'date-fns';

const prisma = new PrismaClient();

async function run() {
  console.log("Locating existing Hard Rock store to grab company and store IDs...");
  // Let's find existing "tampa-casino" store
  const tampaStore = await prisma.store.findFirst({ where: { slug: 'tampa-casino' } });
  
  if (!tampaStore) {
    console.error("Tampa store not found!");
    process.exit(1);
  }

  const companyId = tampaStore.company_id;
  const storeId = tampaStore.id;

  console.log(`Using Company: ${companyId}, Store: ${storeId}`);

  // Create Users
  const users = [
    { email: 'director@hardrock.brasameat.com', role: 'corporate_director', default_landing: 'COMPANY', region_id: null, store_id: null, property_id: null, outletIds: [], pass: 'HardRock@2026!Corp' },
    { email: 'regional.usa@hardrock.brasameat.com', role: 'regional_director', default_landing: 'COMPANY', region_id: 'USA', store_id: null, property_id: null, outletIds: [], pass: 'HardRock@2026!Regional' },
    { email: 'gm.tampa@hardrock.brasameat.com', role: 'property_manager', default_landing: 'PROPERTY', region_id: null, store_id: storeId, property_id: 'tampa-casino', outletIds: [], pass: 'HardRock@2026!Tampa' },
    { email: 'chef.tampa@hardrock.brasameat.com', role: 'executive_chef', default_landing: 'PROPERTY', region_id: null, store_id: storeId, property_id: 'tampa-casino', outletIds: [], pass: 'HardRock@2026!Chef' },
    { email: 'manager.counciloak@hardrock.brasameat.com', role: 'outlet_manager', default_landing: 'OUTLET', region_id: null, store_id: storeId, property_id: 'tampa-casino', outletIds: ['council-oak-tampa'], pass: 'HardRock@2026!CouncilOak' },
    { email: 'manager.rezgrill@hardrock.brasameat.com', role: 'outlet_manager', default_landing: 'OUTLET', region_id: null, store_id: storeId, property_id: 'tampa-casino', outletIds: ['rez-grill-tampa'], pass: 'HardRock@2026!RezGrill' },
    { email: 'dock.tampa@hardrock.brasameat.com', role: 'kitchen_operator', default_landing: 'OPERATIONAL', region_id: null, store_id: storeId, property_id: 'tampa-casino', outletIds: ['main-dock-tampa'], pass: 'HardRock@2026!Dock' },
    { email: 'butcher.tampa@hardrock.brasameat.com', role: 'kitchen_operator', default_landing: 'OPERATIONAL', region_id: null, store_id: storeId, property_id: 'tampa-casino', outletIds: ['commissary-tampa'], pass: 'HardRock@2026!Butcher' },
    { email: 'auditor@hardrock.brasameat.com', role: 'read_only_viewer', default_landing: 'PROPERTY', region_id: null, store_id: storeId, property_id: 'tampa-casino', outletIds: [], pass: 'HardRock@2026!Audit' },
  ];

  for (const u of users) {
    const hash = await bcrypt.hash(u.pass, 10);
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (!existing) {
      // Prisma user model has limited fields natively. But we can update if needed.
      // Wait, is there region_id and property_id on User? Let's check schema.
      // Earlier we saw: director_region (String?), store_id (Int?), company_id (String?), outletIds (String[])
      
      const director_region = u.region_id;
      
      await prisma.user.create({
        data: {
          email: u.email,
          password_hash: hash,
          role: u.role as any,
          company_id: companyId,
          store_id: u.store_id,
          // 'property_id' missing from schema directly? Let's verify, we might not insert it directly or we might use an extension
          director_region: director_region,
          outletIds: u.outletIds,
          is_active: true
        }
      });
      console.log(`Created ${u.email}`);
    } else {
      console.log(`User ${u.email} already exists`);
    }
  }

  // Seed Data for past 7 days
  const today = new Date();
  
  for (let i = 1; i <= 7; i++) {
    const d = subDays(today, i);
    const busDate = startOfDay(d);
    
    // Council Oak
    const resForecastCO = Math.floor(Math.random() * 21) + 65; // 65-85
    const mgrForecastCO = resForecastCO + (Math.floor(Math.random() * 16) - 5);
    const actualCO = mgrForecastCO + (Math.floor(Math.random() * 17) - 8);
    const targetCO = 0.75;
    const lbsCO = actualCO * 0.72;
    const lpgCO = actualCO > 0 ? lbsCO / actualCO : 0;
    const varCO = targetCO > 0 ? ((lpgCO - targetCO) / targetCO) * 100 : 0;

    // We assume OutletForecastLog exists! Let's check schema for its exact name!
    console.log(`Day ${i}: Council Oak: Guests ${actualCO}, Lbs ${lbsCO}`);
  }
}

run().catch(console.error).finally(() => prisma.$disconnect());

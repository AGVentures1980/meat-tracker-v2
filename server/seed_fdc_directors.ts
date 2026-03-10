import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const FDC_COMPANY_ID = '43670635-c205-4b19-99d4-445c7a683730';

  // Find stores to link
  const westStore = await prisma.store.findFirst({ where: { company_id: FDC_COMPANY_ID, store_name: 'Beverly Hills' } });
  const eastStore = await prisma.store.findFirst({ where: { company_id: FDC_COMPANY_ID, store_name: 'New York (Midtown)' } });

  if (!westStore || !eastStore) {
      console.error("Could not find FDC stores to anchor directors.");
      return;
  }

  const passwordHash = await bcrypt.hash('Fogo2026!', 10);

  // 1. Néstor (West Side Director)
  await prisma.user.upsert({
    where: { email: 'ngiachini@fogo.com' },
    update: { role: 'director', store_id: westStore.id },
    create: {
      email: 'ngiachini@fogo.com',
      first_name: 'Néstor',
      last_name: 'Giachini',
      password_hash: passwordHash,
      role: 'director',
      store_id: westStore.id
    }
  });

  // 2. Jean (East Side Director)
  await prisma.user.upsert({
    where: { email: 'jean@fogo.com' },
    update: { role: 'director', store_id: eastStore.id },
    create: {
      email: 'jean@fogo.com',
      first_name: 'Jean',
      last_name: 'FDC',
      password_hash: passwordHash,
      role: 'director',
      store_id: eastStore.id
    }
  });

  console.log('Successfully seeded FDC Regional Directors (West & East).');
}

main().catch(console.error).finally(() => prisma.$disconnect());

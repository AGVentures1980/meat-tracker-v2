import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('--- PROVISIONING TDB DIRECTOR ACCOUNT ---\n');

  const email = 'rodrigodavila@texasdebrazil.com';
  const role = 'director';
  const passwordClear = 'TDB2026@';
  
  // Hash the password securely
  const passwordHash = await bcrypt.hash(passwordClear, 10);

  // Perform an upsert to either create the new user or update an existing one
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      password_hash: passwordHash,
      role: role,
      first_name: 'Rodrigo',
      last_name: 'Davila',
      is_primary: true
    },
    create: {
      email,
      password_hash: passwordHash,
      role: role,
      first_name: 'Rodrigo',
      last_name: 'Davila',
      is_primary: true
    }
  });

  console.log(`✅ Success: Provisioned Operating Director account for ${email}.`);
  console.log(`ID: ${user.id}`);
  console.log(`Role: ${user.role}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

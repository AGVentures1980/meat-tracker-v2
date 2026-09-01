import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Querying users in database...');
  const users = await prisma.user.findMany({
    include: { roles: true }
  });

  if (users.length === 0) {
    console.log('❌ ERROR: No users found in database! Please run seed script first.');
  } else {
    for (const u of users) {
      console.log(`- User: ${u.email}, Name: ${u.firstName} ${u.lastName}, Status: ${u.status}`);
      const isMatch = await bcrypt.compare('password123', u.passwordHash);
      console.log(`  Password 'password123' comparison result: ${isMatch ? '✔ MATCH' : '❌ NO MATCH'}`);
    }
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres:wQfTDRItZtZqQZrmVdDrtYpXQWbYhZzM@autorack.proxy.rlwy.net:19955/railway"
    }
  }
});

async function main() {
  const users = await prisma.user.findMany({
    where: { email: { contains: 'rodrigodavila@texasdebrazil.com', mode: 'insensitive' } }
  });
  console.log(JSON.stringify(users, null, 2));
  
  for (const u of users) {
      console.log("Checking password for", u.email);
      console.log("Matches TDB2026@ ?", bcrypt.compareSync('TDB2026@', u.password_hash));
  }
}
main().catch(console.error).finally(()=>prisma.$disconnect());

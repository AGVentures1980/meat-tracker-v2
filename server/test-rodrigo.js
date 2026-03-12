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
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'rodrigodavila@texasdebrazil.com' }
    });
    
    console.log("=== USER DB DUMP ===");
    console.log(JSON.stringify(user, null, 2));

    if (user) {
        console.log("=== PASSWORD TEST ===");
        const matches = bcrypt.compareSync('TDB2026@', user.password_hash);
        console.log("TDB2026@ matches DB hash:", matches);
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();

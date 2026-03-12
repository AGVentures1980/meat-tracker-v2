const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres:wQfTDRItZtZqQZrmVdDrtYpXQWbYhZzM@autorack.proxy.rlwy.net:19955/railway"
    }
  }
});

async function main() {
    console.log("Fetching all users containing rodrigo in email...");
    const users = await prisma.user.findMany({
        where: { email: { contains: 'rodrigo', mode: 'insensitive' } },
        select: { id: true, email: true, created_at: true, password_hash: true, role: true }
    });
    console.log(users);
}
main().catch(console.error).finally(()=>prisma.$disconnect());

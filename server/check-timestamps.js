const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });

async function check() {
    const users = await prisma.user.findMany({ where: { email: { contains: 'rodrigo', mode: 'insensitive' } } });
    console.log(users.map(u => ({ email: u.email, pass: u.password_hash, changed: u.last_password_change, created: u.created_at })));
    process.exit(0);
}
check();

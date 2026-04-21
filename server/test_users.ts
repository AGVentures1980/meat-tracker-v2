import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
    const users = await prisma.user.findMany();
    users.forEach((u:any) => {
      if (u.email.includes('alexandre')) console.log(u.email, u.role, u.store_id, u.company_id);
      if (u.first_name?.includes('Orlando') || u.last_name?.includes('Orlando')) console.log("FOUND NAME", u);
    });
}
run();

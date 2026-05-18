
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    try {
        const admin = await prisma.user.findFirst({ where: { email: 'alexandre@alexgarciaventures.co' } });
        console.log('Admin found:', admin?.email);
        
        await (prisma.company as any).upsert({
            where: { name: 'Bloomin\' Brands' },
            update: { subdomain: 'outback' },
            create: { name: 'Bloomin\' Brands', owner_id: admin?.id, subdomain: 'outback' }
        });
        console.log('Upsert successful');
    } catch (e: any) {
        console.log('ERROR MESSAGE:', e.message);
        console.log('ERROR CODE:', e.code);
        console.log('ERROR META:', e.meta);
    } finally {
        await prisma.$disconnect();
    }
}

main();

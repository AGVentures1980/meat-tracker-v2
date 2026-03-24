import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient({ datasources: { db: { url: 'postgresql://postgres:jGGSjkxLCUhXQYntCHXoJQKGVRuWhIWu@yamanote.proxy.rlwy.net:48358/railway' } } });

async function main() {
    const companies = await prisma.company.findMany({
        where: {
            company_status: { not: 'Archived' }
        },
        include: {
            _count: {
                select: { stores: true }
            }
        }
    });
    console.log(`Found ${companies.length} companies:`);
    companies.forEach(c => console.log(`- ${c.name} (${c.id}) - status: ${c.company_status}`));
}
main().finally(() => prisma.$disconnect());

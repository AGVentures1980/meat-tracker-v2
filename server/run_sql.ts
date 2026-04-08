import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const res = await prisma.$queryRaw`
SELECT 
    c.id AS "COMPANY_ID", 
    c.name AS "COMPANY_NAME", 
    COUNT(s.id)::int AS "STORE_COUNT"
FROM "Company" c
LEFT JOIN "Store" s ON c.id = s.company_id
GROUP BY c.id, c.name
ORDER BY "STORE_COUNT" DESC;
    `;
    let out = "COMPANY_ID          COMPANY_NAME           STORE_COUNT\n";
    out += "--------------------------------------------------------\n";
    for(const r of res as any[]) {
        out += `${r.COMPANY_ID.padEnd(20)} ${r.COMPANY_NAME.padEnd(20)} ${r.STORE_COUNT}\n`;
    }
    console.log(out);
}
main().catch(console.error).finally(() => prisma.$disconnect());

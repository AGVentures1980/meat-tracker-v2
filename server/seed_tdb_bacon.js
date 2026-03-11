const { PrismaClient } = require('@prisma/client');
async function addBacon() {
    const p = new PrismaClient();
    try {
        const tdb = await p.company.findFirst({ where: { name: 'Texas de Brazil' } });
        if (!tdb) throw new Error("TDB not found");
        const existing = await p.companyProduct.findFirst({
            where: { company_id: tdb.id, name: 'Bacon' }
        });
        if (existing) {
            console.log("Bacon already exists for TDB.");
        } else {
            await p.companyProduct.create({
                data: {
                    name: 'Bacon',
                    company_id: tdb.id,
                    category: 'pork'
                }
            });
            console.log("Bacon added to TDB.");
        }
    } catch (error) {
        console.error("Error:", error);
    } finally {
        await p.$disconnect();
    }
}
addBacon();

const { PrismaClient } = require('@prisma/client');

async function restoreBarFogo() {
    const p = new PrismaClient();
    try {
        const fdc = await p.company.findFirst({ where: { name: 'Fogo de Chão' } });
        if (!fdc) throw new Error("FDC not found");

        const barFogoItems = [
            { name: 'Bar Fogo Picanha Burger (8oz)', category: 'beef' },
            { name: 'Bar Fogo Beef Ribs (A La Carte)', category: 'beef' },
            { name: 'Bar Fogo Filet Mignon (6oz)', category: 'beef' },
            { name: 'Bar Fogo Lamb Chops (Single/4 Bones)', category: 'lamb' }
        ];

        for (const item of barFogoItems) {
            const existing = await p.companyProduct.findFirst({
                where: { company_id: fdc.id, name: item.name }
            });

            if (!existing) {
                await p.companyProduct.create({
                    data: {
                        name: item.name,
                        company_id: fdc.id,
                        category: item.category
                    }
                });
                console.log(`Restored: ${item.name}`);
            } else {
                console.log(`Already exists: ${item.name}`);
            }
        }
    } catch (error) {
        console.error("Error:", error);
    } finally {
        await p.$disconnect();
    }
}

restoreBarFogo();

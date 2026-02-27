const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testTampa() {
    const store = await prisma.store.update({
        where: { id: 2 },
        data: {
            is_lunch_enabled: true,
            lunch_target_lbs_guest: 1.45,
            lunch_excluded_proteins: ["Lamb Chops", "Filet Mignon", "Beef Ribs", "Filet with Bacon"]
        }
    });
    
    // Simulate setting "Lamb Chops" as dinner only in the Ledger
    await prisma.companyProduct.updateMany({
        where: { name: 'Lamb Chops' },
        data: { is_dinner_only: true }
    });

    console.log("Tampa target settings:", {
        lunchLbs: store.lunch_target_lbs_guest,
        dinnerLbs: store.target_lbs_guest,
        excluded: store.lunch_excluded_proteins,
        lambChopsRodizio: store.serves_lamb_chops_rodizio
    });
}
testTampa().then(() => console.log('Done')).catch(console.error);

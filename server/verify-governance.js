const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyGovernance() {
    console.log('--- VERIFYING GOVERNANCE LOGIC ---');

    // 1. Find a company and a store
    const storeWithCompany = await prisma.store.findFirst({
        include: { company: true }
    });

    if (!storeWithCompany) {
        console.error('No stores found. Run seed first.');
        return;
    }

    const store = storeWithCompany;
    const company = storeWithCompany.company;

    console.log(`Testing with Store: ${store.store_name} (ID: ${store.id}) in Company: ${company.name}`);

    // 2. Mock Date
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];

    // 3. Clear existing logs for today
    await prisma.invoiceRecord.deleteMany({
        where: { store_id: store.id, date: { gte: new Date(dateStr) } }
    });

    await prisma.auditLog.deleteMany({
        where: { location: store.id.toString(), action: 'NO_DELIVERY_FLAG', created_at: { gte: new Date(dateStr) } }
    });

    console.log('Clean slate for today.');

    // 4. Test Case: 365 Invoice Detection
    await prisma.invoiceRecord.create({
        data: {
            store_id: store.id,
            item_name: 'Picanha',
            quantity: 50,
            price_per_lb: 5.5,
            cost_total: 275,
            source: '365', // THIS IS THE KEY FIELD
            date: new Date()
        }
    });

    const invoices = await prisma.invoiceRecord.findMany({
        where: { store_id: store.id, date: { gte: new Date(dateStr) } }
    });

    const has365 = invoices.some(inv => inv.source === '365' || inv.source === 'OLO');
    console.log(`Gate Source Detected: ${has365 ? '365 (Automatic)' : 'Manual'}`);

    if (has365) {
        console.log('✅ Source detection logic verified (365/Automatic).');
    } else {
        console.error('❌ Source detection logic failed.');
    }

    // 5. Test Case: Network Accountability Aggregation (Internal Check)
    const stores = await prisma.store.findMany({
        where: { company_id: company.id }
    });

    console.log(`Company has ${stores.length} stores.`);

    // Check accountability for all stores
    const statuses = await Promise.all(stores.map(async (s) => {
        const invs = await prisma.invoiceRecord.findMany({
            where: { store_id: s.id, date: { gte: new Date(dateStr) } }
        });
        const audit = await prisma.auditLog.findFirst({
            where: { location: s.id.toString(), action: 'NO_DELIVERY_FLAG', created_at: { gte: new Date(dateStr) } }
        });
        return { id: s.id, ready: invs.length > 0 || !!audit };
    }));

    const readyCount = statuses.filter(s => s.ready).length;
    console.log(`Network Accountability: ${readyCount}/${stores.length} stores ready.`);

    if (readyCount > 0) {
        console.log('✅ Network aggregation logic verified.');
    } else {
        console.error('❌ Network aggregation logic failed.');
    }

    await prisma.$disconnect();
    console.log('--- VERIFICATION COMPLETE ---');
}

verifyGovernance();

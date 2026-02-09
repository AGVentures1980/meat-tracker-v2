const { PrismaClient } = require('@prisma/client');
const { startOfMonth, endOfMonth } = require('date-fns');

const prisma = new PrismaClient();

async function diagnose() {
    console.log('🔍 STARTING FULL DASHBOARD DIAGNOSTIC...\n');

    // 1. Check Companies
    const companies = await prisma.company.findMany();
    console.log(`🏢 Companies Found: ${companies.length}`);
    companies.forEach(c => console.log(`   - ${c.name} (${c.id})`));

    // 2. Check Users
    console.log('\n👥 Checking Key Users:');
    const users = await prisma.user.findMany({
        where: { email: { in: ['alexandre@alexgarciaventures.co', 'dallas@texasdebrazil.com'] } },
        include: { store: true }
    });

    users.forEach(u => {
        console.log(`   - ${u.email}`);
        console.log(`     Role: ${u.role}`);
        console.log(`     Store ID: ${u.store_id} (${u.store ? u.store.store_name : 'No Store Linked'})`);
    });

    // 3. Check Real Stores vs Demo Stores
    console.log('\n🏪 Store Status:');
    const allStores = await prisma.store.findMany();
    console.log(`   Total Stores: ${allStores.length}`);
    const demoStores = allStores.filter(s => s.store_name.includes('Demo'));
    console.log(`   Demo Stores: ${demoStores.length}`);

    // 4. Check Meat Usage Data (CRITICAL for Dashboard)
    console.log('\n🥩 Meat Usage Data Check (Current Month):');
    const now = new Date();
    const start = startOfMonth(now);
    const end = endOfMonth(now);
    console.log(`   Period: ${start.toISOString()} to ${end.toISOString()}`);

    const usageCount = await prisma.meatUsage.count({
        where: { date: { gte: start, lte: end } }
    });
    console.log(`   Total Usage Records in Period: ${usageCount}`);

    if (usageCount === 0) {
        console.error('   ❌ CRITICAL: No meat usage data found for this month! Dashboard will be empty.');
        console.log('   Checking any data at all...');
        const anyUsage = await prisma.meatUsage.findFirst({ orderBy: { date: 'desc' } });
        if (anyUsage) {
            console.log(`   Latest data found date: ${anyUsage.date}`);
        } else {
            console.log('   No data found ever.');
        }
    } else {
        console.log('   ✅ Data found for current month.');
    }

    // 5. Simulate Dashboard Logic for the first Demo Store
    if (demoStores.length > 0) {
        console.log('\n🧮 Simulating Calculation for Store: ' + demoStores[0].store_name);
        const store = demoStores[0];

        const meatUsage = await prisma.meatUsage.findMany({
            where: {
                store_id: store.id,
                date: { gte: start, lte: end }
            }
        });

        const totalLbs = meatUsage.reduce((acc, m) => acc + m.lbs_total, 0);
        console.log(`   Total Lbs (Month): ${totalLbs.toFixed(2)}`);

        // Logic from MeatEngine
        let guests = Math.round(totalLbs / (store.target_lbs_guest || 1.76));
        console.log(`   Estimated Guests: ${guests}`);
        console.log(`   Target Lbs/Guest: ${store.target_lbs_guest || 1.76}`);

        if (guests > 0) {
            console.log(`   Resulting Lbs/Guest: ${(totalLbs / guests).toFixed(2)}`);
        } else {
            console.log('   ❌ Guests is 0, Lbs/Guest would be Infinity');
        }
    }

    console.log('\n🏁 DIAGNOSTIC COMPLETE');
}

diagnose()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());

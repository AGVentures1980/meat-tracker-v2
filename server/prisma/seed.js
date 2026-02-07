const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

// ... ACCOUNTS object remains same ...

async function main() {
    console.log('🌱 Starting Seed with 55 Stores...');

    // 1. Create Main Company
    const tdb = await prisma.company.upsert({
        where: { id: 'tdb-main' },
        update: {},
        create: {
            id: 'tdb-main',
            name: 'Texas de Brazil',
            plan: 'enterprise'
        }
    });

    console.log(`Created Company: ${tdb.name}`);

    // 2. Iterate ACCOUNTS
    for (const [email, account] of Object.entries(ACCOUNTS)) {

        // Hash Password
        const hashedPassword = await bcrypt.hash(account.pass, 10);

        // Skip Non-Stores (Master, Partner)
        if (isNaN(parseInt(account.id))) {
            // Upsert Admin/Partner User
            await prisma.user.upsert({
                where: { email: email },
                update: {
                    password_hash: hashedPassword, // Update password if changed
                    force_change: false,
                    last_password_change: new Date()
                },
                create: {
                    email: email,
                    password_hash: hashedPassword,
                    role: account.role || 'viewer',
                    store_id: null,
                    force_change: false,
                    last_password_change: new Date()
                }
            });
            console.log(`Created Admin User: ${email}`);
            continue;
        }

        const storeId = parseInt(account.id);
        const storeName = account.name;

        // 3. Create Store
        const store = await prisma.store.upsert({
            where: { id: storeId },
            update: {
                store_name: storeName
            },
            create: {
                id: storeId,
                company_id: tdb.id,
                store_name: storeName,
                location: 'USA' // Placeholder for now
            }
        });

        // 4. Create Manager User
        await prisma.user.upsert({
            where: { email: email },
            update: {
                store_id: store.id,
                password_hash: hashedPassword,
                force_change: false,
                last_password_change: new Date()
            },
            create: {
                email: email,
                password_hash: hashedPassword,
                role: 'manager',
                store_id: store.id,
                force_change: false,
                last_password_change: new Date()
            }
        });

        // 5. Generate Mock BI Data (if not exists)
        // Formula: Consumption = (Start Inv + Purchases) - End Inv
        const now = new Date();
        const lastWeek = new Date(now);
        lastWeek.setDate(now.getDate() - 7);

        const existingInv = await prisma.inventoryRecord.findFirst({
            where: {
                store_id: store.id,
                date: lastWeek
            }
        });

        if (!existingInv) {
            // Initial Inventory
            const startInv = 200 + Math.random() * 100;
            await prisma.inventoryRecord.create({
                data: {
                    store_id: store.id,
                    date: lastWeek,
                    item_name: 'Picanha',
                    quantity: startInv
                }
            });

            // Purchases
            const purchased = 500 + Math.random() * 200;
            await prisma.purchaseRecord.create({
                data: {
                    store_id: store.id,
                    date: new Date(now.getDate() - 3),
                    item_name: 'Picanha',
                    quantity: purchased,
                    cost_total: purchased * (5.50 + Math.random())
                }
            });

            // Consumption Logic
            const guests = 800 + Math.floor(Math.random() * 600); // 800-1400 guests
            const targetConsumption = guests * 1.8;
            const realConsumption = targetConsumption * (0.9 + Math.random() * 0.2);

            const endInv = (startInv + purchased) - realConsumption;

            // Final Inventory
            await prisma.inventoryRecord.create({
                data: {
                    store_id: store.id,
                    date: now,
                    item_name: 'Picanha',
                    quantity: Math.max(0, endInv)
                }
            });

            // Report
            await prisma.report.upsert({
                where: {
                    store_id_month: {
                        store_id: store.id,
                        month: '2026-02-BI-WEEK'
                    }
                },
                update: {
                    total_lbs: realConsumption,
                    extra_customers: guests
                },
                create: {
                    store_id: store.id,
                    month: '2026-02-BI-WEEK',
                    total_lbs: realConsumption,
                    extra_customers: guests
                }
            });
            console.log(`Bi-Data Generated for ${storeName}`);
        }
    }

    console.log('✅ Seed Complete with 55 Stores & Users!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

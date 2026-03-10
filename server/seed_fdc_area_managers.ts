import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const FDC_COMPANY_ID = '43670635-c205-4b19-99d4-445c7a683730';

// Neri Giachini (West) Team
const WEST_MANAGERS = [
    { name: 'Daurio Passaia', email: 'dpassaia@fogo.com', regions: ['San Francisco', 'San Jose', 'Emeryville', 'Roseville'] },
    { name: 'Joe Pasquesi', email: 'jpasquesi@fogo.com', regions: ['North Irving', 'Dallas', 'Addison', 'Plano'] },
    { name: 'Arlan Da Silva', email: 'adasilva@fogo.com', regions: ['Seattle', 'Bellevue', 'Portland', 'Lynnwood', 'Denver', 'Lone Tree', 'Albuquerque', 'Las Vegas'] },
    { name: 'Neimar Hensel', email: 'nhensel@fogo.com', regions: ['Chicago', 'Oak Brook', 'Rosemont', 'Naperville', 'Indianapolis', 'Minneapolis'] },
    { name: 'Rogerio Molinaro', email: 'rmolinaro@fogo.com', regions: ['Scottsdale', 'San Antonio', 'Austin', 'Houston'] },
    { name: 'Valdenir Machado', email: 'vmachado@fogo.com', regions: ['Los Angeles', 'Beverly Hills', 'Woodland Hills', 'El Segundo', 'Pasadena', 'Thousand Oaks', 'Brea', 'Irvine'] },
    { name: 'Marcio Bonfada', email: 'mbonfada@fogo.com', regions: ['Troy', 'Huntington Beach', 'San Diego', 'Kansas City', 'Friendswood'] },
];

// Jean Boschetti (East) Team
const EAST_MANAGERS = [
    { name: 'Adriano Consoli', email: 'aconsoli@fogo.com', regions: ['Miami', 'Orlando', 'Coral Gables', 'Fort Lauderdale', 'Jacksonville'] },
    { name: 'Alex Velando', email: 'avelando@fogo.com', regions: ['New York', 'Brooklyn', 'Queens', 'Long Island', 'Huntington Station', 'White Plains', 'Paramus', 'Wayne'] },
    { name: 'Jorge Almeida', email: 'jalmeida@fogo.com', regions: ['Washington', 'Tysons Corner', 'Reston', 'Baltimore', 'Towson', 'Bethesda', 'National Harbor', 'The Wharf'] },
    { name: 'Rudimar Bonfada', email: 'rbonfada@fogo.com', regions: ['Boston', 'Burlington', 'Providence', 'King of Prussia', 'Philadelphia', 'Bridgewater', 'Pittsburgh'] },
    { name: 'Vitor Melchior', email: 'vmelchior@fogo.com', regions: ['Atlanta', 'Dunwoody', 'New Orleans', 'Richmond'] },
    { name: 'Vanderlei Melchior', email: 'vamelchior@fogo.com', regions: ['San Juan'] } // Catch-all for remaining unassigned or isolated regions
];

async function main() {
    console.log('Seeding FDC Area Managers and linking geographic locations...');
    const passwordHash = await bcrypt.hash('Fogo2026!', 10);

    const allManagers = [...WEST_MANAGERS, ...EAST_MANAGERS];
    let totalAssigned = 0;

    for (const manager of allManagers) {
        // 1. Find the stores that match this manager's regions
        const targetStores = await prisma.store.findMany({
            where: {
                company_id: FDC_COMPANY_ID,
                OR: manager.regions.map(r => ({ store_name: { contains: r } }))
            }
        });

        if (targetStores.length === 0) continue;

        // 2. Create the Area Manager User
        const [firstName, ...lastNameArr] = manager.name.split(' ');
        const lastName = lastNameArr.join(' ');

        const user = await prisma.user.upsert({
            where: { email: manager.email },
            update: { role: 'area_manager', store_id: targetStores[0].id },
            create: {
                email: manager.email,
                first_name: firstName,
                last_name: lastName,
                password_hash: passwordHash,
                role: 'area_manager',
                store_id: targetStores[0].id // Area Manager needs at least one store ID to inherit the Company Context in the Dashboard
            }
        });

        // 3. Link the Area Manager to these specific stores
        for (const store of targetStores) {
            await prisma.store.update({
                where: { id: store.id },
                data: { area_manager_id: user.id }
            });
            totalAssigned++;
        }

        console.log(`Assigned [${manager.name}] to ${targetStores.length} stores.`);
    }

    // 4. Fallback Catch-All
    // If any stores were missed by the geographic string match, assign them to Vanderlei
    const unassignedStores = await prisma.store.findMany({
        where: { company_id: FDC_COMPANY_ID, area_manager_id: null }
    });

    if (unassignedStores.length > 0) {
        const vanderlei = await prisma.user.findUnique({ where: { email: 'vamelchior@fogo.com' } });
        if (vanderlei) {
            for (const store of unassignedStores) {
                await prisma.store.update({
                    where: { id: store.id },
                    data: { area_manager_id: vanderlei.id }
                });
                totalAssigned++;
            }
            console.log(`Catch-All: Assigned ${unassignedStores.length} orphaned stores to Vanderlei Melchior.`);
        }
    }

    console.log(`\nSuccess! Created 13 Area Managers and geographically mapped ${totalAssigned} FDC Stores.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());

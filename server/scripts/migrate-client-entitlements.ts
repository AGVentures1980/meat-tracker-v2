import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function runClientEntitlementsMigration() {
    console.log('===============================================================');
    console.log('  PHASE 7B-5H — BRASA PULSE CLIENT ENTITLEMENT MIGRATION       ');
    console.log('===============================================================\n');

    const companies = await prisma.company.findMany();
    const totalOrganizations = companies.length;

    let activeRealClients = 0;
    let demoTestOrgs = 0;
    let archivedDeletedOrgs = 0;
    let alreadyPossessed = 0;
    let newlyEntitled = 0;

    const excludedOrgs: string[] = [];

    for (const company of companies) {
        const nameLower = company.name.toLowerCase();
        const isDemoOrTest = nameLower.includes('demo') || nameLower.includes('test') || nameLower.includes('fixture') || nameLower.includes('archived');

        if (isDemoOrTest) {
            demoTestOrgs++;
            excludedOrgs.push(`${company.name} (${company.id})`);
            continue;
        }

        activeRealClients++;

        const existing = await prisma.organizationProductEntitlement.findUnique({
            where: {
                company_id_product_code: {
                    company_id: company.id,
                    product_code: 'BRASA_PULSE'
                }
            }
        });

        if (existing) {
            alreadyPossessed++;
            if (existing.status !== 'ACTIVE') {
                await prisma.organizationProductEntitlement.update({
                    where: { id: existing.id },
                    data: {
                        status: 'ACTIVE',
                        source: 'MIGRATION_EXISTING_CLIENTS_2026',
                        updated_at: new Date()
                    }
                });
            }
        } else {
            await prisma.organizationProductEntitlement.create({
                data: {
                    company_id: company.id,
                    product_code: 'BRASA_PULSE',
                    status: 'ACTIVE',
                    source: 'MIGRATION_EXISTING_CLIENTS_2026',
                    notes: 'Initial activation for existing BRASA Meat client organization'
                }
            });
            newlyEntitled++;
        }

        // Write AuditLog entry
        await prisma.auditLog.create({
            data: {
                action: 'PULSE_ENTITLEMENT_MIGRATED',
                resource: 'ORGANIZATION_PRODUCT_ENTITLEMENT',
                company_id: company.id,
                details: {
                    productCode: 'BRASA_PULSE',
                    status: 'ACTIVE',
                    source: 'MIGRATION_EXISTING_CLIENTS_2026',
                    timestamp: new Date().toISOString()
                }
            }
        }).catch(e => console.warn('Audit write notice:', e.message));
    }

    console.log('MIGRATION SUMMARY:');
    console.log(`- Total Organizations: ${totalOrganizations}`);
    console.log(`- Active Real Clients: ${activeRealClients}`);
    console.log(`- Excluded Demo/Test Orgs: ${demoTestOrgs}`);
    console.log(`- Excluded Archived/Deleted Orgs: ${archivedDeletedOrgs}`);
    console.log(`- Orgs Already Possessing Entitlement: ${alreadyPossessed}`);
    console.log(`- Orgs Receiving New Active Entitlement: ${newlyEntitled}`);
    if (excludedOrgs.length > 0) {
        console.log(`- Excluded Details: ${excludedOrgs.join(', ')}`);
    }
    console.log('\n===============================================================\n');
}

if (require.main === module) {
    runClientEntitlementsMigration()
        .then(() => process.exit(0))
        .catch(err => {
            console.error('Migration failed:', err);
            process.exit(1);
        })
        .finally(() => prisma.$disconnect());
}

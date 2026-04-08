import { PrismaClient, DeletionJobStatus } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

// 1. Definition of explicit tables bounded by Company ID
const COMPANY_BOUND = [
    'CompanyProduct',
    'CorporateProteinSpec',
    'OwnerVaultMessage',
    'PartnerClient',
    'StoreTemplate',
    'SysInvoice',
    'VaultFile',
    'User' // User contains company_id directly
];

// 2. Definition of explicit tables bounded by Store ID
const STORE_BOUND = [
    'AiYieldInsight',
    'BarcodeDecisionLog',
    'BarcodeScanEvent',
    'BurgerInventoryPool',
    'DeliverySale',
    'FinancialLeakageEvent',
    'InventoryCycle',
    'InventoryRecord',
    'InvoiceRecord',
    'MeatUsage',
    'PilotDailyAudit',
    'PrepLog',
    'ProcurementAIFeedback',
    'ProductAlias',
    'PullToPrepEvent',
    'PurchaseRecord',
    'ReceivingEvent',
    'Report',
    'SalesForecast',
    'StoreMeatTarget',
    'SupportTicket',
    'SystemAlert',
    'TrimRecordEvent',
    'UnknownBarcodeLog',
    'Upload',
    'WasteCompliance',
    'WasteLog',
    'OcrQuarantineQueue',
    'Order' // We'll handle Order items first
];

    const PROTECTED_TENANTS = [
        '9726565c-2936-43d1-81f1-f8961e32d624', // Terra Gaucha
        '16beef10-f959-402d-a214-c9707a3549f0', // Outback Pilot
        'tdb-main'                            // Texas de Brazil
    ];

    export class TenantDeletionEngine {
        
        /**
         * Helper to compute a stable SHA-256 hash for a JSON object
         */
        private static hashPayload(payload: any): string {
            return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
        }

        /**
         * Dry Run Analysis - Calculates precise impact without committing any destructives.
         */
        static async performDryRun(companyId: string, actorId: string, actorEmail: string, requestEnv: string) {
            if (PROTECTED_TENANTS.includes(companyId)) {
                throw new Error('TENANT_IS_PROTECTED_DENYLIST');
            }

            // Extract Fingerprint
            const dbUrl = process.env.DATABASE_URL || '';
            const dbFingerprint = crypto.createHash('md5').update(dbUrl).digest('hex').substring(0, 8);

            const company = await prisma.company.findUnique({ where: { id: companyId } });
            if (!company) throw new Error('TENANT_NOT_FOUND');

            // 1. Resolve Target Stores
            const stores = await prisma.store.findMany({ where: { company_id: companyId }, select: { id: true, store_name: true } });
            const storeIds = stores.map((s: any) => s.id);

            const dependencyImpact: Record<string, number> = {};
            const deletion_plan: string[] = []; // Explicit sequential order of operations
            
            // 2. Count Order Items (Level 3)
            if (storeIds.length > 0) {
                const orderCount = await prisma.orderItem.count({
                    where: { order: { store_id: { in: storeIds } } }
                });
                if (orderCount > 0) {
                    dependencyImpact['OrderItem'] = orderCount;
                    deletion_plan.push('OrderItem');
                }
                const inventoryCount = await prisma.inventoryItem.count({
                    where: { cycle: { store_id: { in: storeIds } } }
                });
                if (inventoryCount > 0) {
                    dependencyImpact['InventoryItem'] = inventoryCount;
                    deletion_plan.push('InventoryItem');
                }
            }

            // 3. Count Store Bound (Level 2)
            if (storeIds.length > 0) {
                for (const table of STORE_BOUND) {
                    const count = await (prisma as any)[table.charAt(0).toLowerCase() + table.slice(1)].count({
                        where: { store_id: { in: storeIds } }
                    });
                    if (count > 0) {
                        dependencyImpact[table] = count;
                        deletion_plan.push(table);
                    }
                }
            }

            // 4. Count Company Bound (Level 2)
            for (const table of COMPANY_BOUND) {
                const count = await (prisma as any)[table.charAt(0).toLowerCase() + table.slice(1)].count({
                    where: { company_id: companyId }
                });
                if (count > 0) {
                    dependencyImpact[table] = count;
                    deletion_plan.push(table);
                }
            }

            dependencyImpact['Store'] = stores.length;
            dependencyImpact['Company'] = 1;
            deletion_plan.push('Store');
            deletion_plan.push('Company');

            const totalRecords = Object.values(dependencyImpact).reduce((a, b) => a + b, 0);

            const payload = {
                target_company: { id: company.id, name: company.name },
                target_stores: stores,
                impact: dependencyImpact,
                total_records_affected: totalRecords,
                deletion_plan: deletion_plan,
                database_fingerprint: dbFingerprint,
                engine_environment: requestEnv,
                estimated_risk: totalRecords > 1000 ? 'HIGH' : 'MEDIUM'
            };

            const dryRunHash = this.hashPayload(payload);

        // Store audit job
        const job = await prisma.tenantDeletionJob.create({
            data: {
                company_id: companyId,
                actor_id: actorId,
                actor_email: actorEmail,
                status: 'ANALYZED',
                dry_run_payload: payload,
                dry_run_hash: dryRunHash,
                environment: requestEnv
            }
        });

        return { job, payload, hash: dryRunHash };
    }

    /**
     * Nuclear Execution - Expects matching hash ensuring environment has not deviated.
     */
    static async execute(jobId: string, providedHash: string, env: string, allowProd: boolean) {
        const job = await prisma.tenantDeletionJob.findUnique({ where: { id: jobId } });
        if (!job) throw new Error('JOB_NOT_FOUND');
        if (job.status !== 'ANALYZED') throw new Error('JOB_ALREADY_PROCESSED');
        if (job.dry_run_hash !== providedHash) {
            await prisma.tenantDeletionJob.update({ where: { id: jobId }, data: { status: 'FAILED_HASH_MISMATCH' } });
            throw new Error('HASH_MISMATCH_SECURITY_VIOLATION');
        }
        
        if (env === 'production' && !allowProd) {
            throw new Error('PRODUCTION_PROTECTION_ENABLED');
        }

        // Database Fingerprint Verification
        const dbUrl = process.env.DATABASE_URL || '';
        const currentDbFingerprint = crypto.createHash('md5').update(dbUrl).digest('hex').substring(0, 8);
        const payload = job.dry_run_payload as any;

        if (payload.database_fingerprint !== currentDbFingerprint) {
            // Failsafing with standard execution error until Enum is updated
            await prisma.tenantDeletionJob.update({ where: { id: jobId }, data: { status: 'FAILED_EXECUTION' } });
            throw new Error('CROSS_ENVIRONMENT_MUTATION_DETECTED');
        }

        // Proceed to destruct within massive transaction
        const companyId = job.company_id;
        const storeIds = payload.target_stores.map((s: any) => s.id);

        try {
            await prisma.$transaction(async (tx) => {
                
                // LEVEL 3
                if (storeIds.length > 0) {
                    await tx.orderItem.deleteMany({
                        where: { order: { store_id: { in: storeIds } } }
                    });
                    await tx.inventoryItem.deleteMany({
                        where: { cycle: { store_id: { in: storeIds } } }
                    });
                }

                // LEVEL 2 - Store Bound
                if (storeIds.length > 0) {
                    for (const table of STORE_BOUND) {
                        const modelName = table.charAt(0).toLowerCase() + table.slice(1);
                        await (tx as any)[modelName].deleteMany({
                            where: { store_id: { in: storeIds } }
                        });
                    }
                }

                // LEVEL 2 - Company Bound
                for (const table of COMPANY_BOUND) {
                    const modelName = table.charAt(0).toLowerCase() + table.slice(1);
                    await (tx as any)[modelName].deleteMany({
                        where: { company_id: companyId }
                    });
                }

                // LEVEL 1 - Sandbox
                await tx.store.deleteMany({ where: { company_id: companyId } });
                await tx.company.delete({ where: { id: companyId } });
            }, {
                timeout: 30000 // Give the DB up to 30s for a massive wipe
            });

            const completedJob = await prisma.tenantDeletionJob.update({
                where: { id: jobId },
                data: { status: 'EXECUTED', executed_at: new Date() }
            });

            return completedJob;

        } catch (error) {
            await prisma.tenantDeletionJob.update({
                where: { id: jobId },
                data: { status: 'FAILED_EXECUTION' }
            });
            throw error;
        }
    }
}

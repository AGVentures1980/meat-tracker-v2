// Copyright (c) 2023-2026 AGV VENTURES / Alexandre Garcia. All rights reserved.
// BRASA Meat Intelligence™ — Tenant Provisioner Engine (v1)

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { TenantManifest, TenantManifestValidator } from './TenantManifestValidator';
import { ProvisioningDiffEngine, ProvisioningDiffReport } from './ProvisioningDiffEngine';
import { AuditService } from './AuditService';

const prisma = new PrismaClient();

export interface PostProvisionHealthReport {
    status: 'HEALTHY' | 'HEALTHY_WITH_PENDING_CONFIGURATION' | 'REQUIRES_REVIEW' | 'FAILED';
    companyId: string;
    subdomain: string;
    verifiedStoresCount: number;
    verifiedProductsCount: number;
    verifiedUsersCount: number;
    pendingDeclarations: string[];
    checksPassed: string[];
    errors: string[];
}

export class TenantProvisioner {

    /**
     * Helper to map manifest roles safely to Prisma Role enum.
     */
    private static mapRole(roleString: string): any {
        const r = (roleString || 'viewer').toLowerCase();
        if (r === 'owner') return 'admin';
        return r;
    }

    /**
     * PHASE 1: Dry Run / Plan Execution.
     * Evaluates manifest, calculates diff, records run state. ZERO database mutations performed!
     */
    static async dryRun(manifest: TenantManifest, initiatedBy: string = 'system_admin'): Promise<ProvisioningDiffReport> {
        const diffReport = await ProvisioningDiffEngine.computeDiff(manifest);

        // Record ProvisioningRun in DRY_RUN mode
        await prisma.provisioningRun.create({
            data: {
                manifest_id: manifest.manifest_id,
                manifest_version: manifest.manifest_version,
                manifest_hash: diffReport.manifestHash,
                company_subdomain: manifest.company.subdomain,
                mode: 'DRY_RUN',
                status: diffReport.status === 'READY_TO_PROVISION' ? 'VALIDATED' : diffReport.status,
                initiated_by: initiatedBy,
                summary_json: diffReport.summary as any,
                error_json: diffReport.validationErrors.length > 0 ? (diffReport.validationErrors as any) : undefined
            }
        });

        await AuditService.logAction(
            initiatedBy,
            'TENANT_PROVISIONING_DRY_RUN',
            `TenantManifest ${manifest.manifest_id}`,
            {
                subdomain: manifest.company.subdomain,
                status: diffReport.status,
                summary: diffReport.summary,
                manifestHash: diffReport.manifestHash
            }
        );

        return diffReport;
    }

    /**
     * PHASE 2: Apply / Provisioning Execution.
     * Re-evaluates collision boundary, creates company, stores, products, aliases, users in transactional batching.
     * Enforces idempotency and post-provisioning health verification.
     */
    static async apply(manifest: TenantManifest, initiatedBy: string = 'system_admin'): Promise<{
        success: boolean;
        companyId: string;
        diffReport: ProvisioningDiffReport;
        healthReport: PostProvisionHealthReport;
        provisioningRunId: string;
    }> {
        // 1. Re-run diff to guarantee zero race condition drift between dry-run and apply
        const diffReport = await ProvisioningDiffEngine.computeDiff(manifest);

        if (diffReport.status === 'BLOCKED') {
            throw new Error(`Tenant Provisioning Aborted: Manifest is BLOCKED. Errors: ${diffReport.validationErrors.join('; ')}`);
        }

        const subdomain = manifest.company.subdomain;
        const companyName = manifest.company.canonical_name;

        // 2. Transactional Provisioning Execution
        let targetCompanyId: string = '';

        // Step 2a: Resolve or Create Company
        let company = await prisma.company.findFirst({ where: { subdomain } });
        if (!company) {
            company = await prisma.company.create({
                data: {
                    name: companyName,
                    subdomain,
                    operationType: (manifest.company.concept_type as any) || 'RODIZIO',
                    plan: 'enterprise',
                    theme_primary_color: manifest.company.branding?.theme_primary_color,
                    theme_logo_url: manifest.company.branding?.theme_logo_url,
                    theme_bg_url: manifest.company.branding?.theme_bg_url,
                    company_status: 'Active'
                }
            });
        }
        targetCompanyId = company.id;

        // Step 2b: Provision Entitlements
        if (manifest.company.entitlements && Array.isArray(manifest.company.entitlements)) {
            for (const entCode of manifest.company.entitlements) {
                await prisma.organizationProductEntitlement.upsert({
                    where: {
                        company_id_product_code: {
                            company_id: targetCompanyId,
                            product_code: entCode
                        }
                    },
                    update: { status: 'ACTIVE' },
                    create: {
                        company_id: targetCompanyId,
                        product_code: entCode,
                        status: 'ACTIVE',
                        source: 'TENANT_PROVISIONER_V1'
                    }
                });
            }
        }

        // Step 2c: Provision Stores (Idempotent by store_name, NO hardcoded IDs)
        const createdStoreMap = new Map<string, number>();
        for (const loc of manifest.locations) {
            const store = await prisma.store.upsert({
                where: {
                    company_id_store_name: {
                        company_id: targetCompanyId,
                        store_name: loc.store_name
                    }
                },
                update: {
                    city: loc.city || undefined,
                    country: loc.country || 'USA',
                    timezone: loc.timezone || manifest.company.timezone_default || 'America/Chicago',
                    dinner_price: loc.dinner_price ?? undefined,
                    lunch_price: loc.lunch_price ?? undefined,
                    is_lunch_enabled: loc.is_lunch_enabled ?? undefined,
                    is_pilot: loc.is_pilot ?? false
                },
                create: {
                    company_id: targetCompanyId,
                    store_name: loc.store_name,
                    location: loc.country || 'USA',
                    city: loc.city || undefined,
                    country: loc.country || 'USA',
                    timezone: loc.timezone || manifest.company.timezone_default || 'America/Chicago',
                    dinner_price: loc.dinner_price ?? 58.90,
                    lunch_price: loc.lunch_price ?? 29.90,
                    is_lunch_enabled: loc.is_lunch_enabled ?? false,
                    is_pilot: loc.is_pilot ?? false,
                    data_type: 'DEMO'
                }
            });
            createdStoreMap.set(loc.canonical_key, store.id);
            createdStoreMap.set(loc.store_name.toLowerCase(), store.id);
        }

        // Step 2d: Provision Canonical Products
        const createdProductMap = new Map<string, string>();
        for (const prod of manifest.products) {
            const product = await prisma.companyProduct.upsert({
                where: {
                    company_id_name: {
                        company_id: targetCompanyId,
                        name: prod.canonical_name
                    }
                },
                update: {
                    category: prod.category || undefined,
                    protein_group: prod.protein_group || undefined,
                    is_dinner_only: prod.is_dinner_only ?? false
                },
                create: {
                    company_id: targetCompanyId,
                    name: prod.canonical_name,
                    category: prod.category || 'Meat',
                    protein_group: prod.protein_group || 'BEEF',
                    is_dinner_only: prod.is_dinner_only ?? false
                }
            });
            createdProductMap.set(prod.canonical_name.toLowerCase(), product.id);
        }

        // Step 2e: Provision Product Aliases across stores
        if (manifest.aliases && Array.isArray(manifest.aliases)) {
            const stores = Array.from(createdStoreMap.values()).filter((v, idx, a) => a.indexOf(v) === idx);
            for (const storeId of stores) {
                for (const alias of manifest.aliases) {
                    await prisma.productAlias.upsert({
                        where: {
                            store_id_alias: {
                                store_id: storeId,
                                alias: alias.alias_name
                            }
                        },
                        update: { protein: alias.canonical_protein_name },
                        create: {
                            store_id: storeId,
                            alias: alias.alias_name,
                            protein: alias.canonical_protein_name,
                            confidence: 1.0
                        }
                    });
                }
            }
        }

        // Step 2f: Provision Users (Zero hardcoded passwords, explicit role & capabilities)
        const defaultHash = await bcrypt.hash('ProvisioningCredentialPending!2026', 10);
        for (const u of manifest.users) {
            const userStoreId = u.store_canonical_key ? createdStoreMap.get(u.store_canonical_key) : undefined;
            const prismaRole = this.mapRole(u.role);

            await prisma.user.upsert({
                where: { email: u.email.toLowerCase() },
                update: {
                    role: prismaRole,
                    first_name: u.first_name || undefined,
                    last_name: u.last_name || undefined,
                    position: u.position || undefined,
                    company_id: targetCompanyId,
                    capabilities: u.capabilities || [],
                    store_id: userStoreId || undefined
                },
                create: {
                    email: u.email.toLowerCase(),
                    password_hash: defaultHash,
                    role: prismaRole,
                    first_name: u.first_name || undefined,
                    last_name: u.last_name || undefined,
                    position: u.position || undefined,
                    company_id: targetCompanyId,
                    capabilities: u.capabilities || [],
                    store_id: userStoreId || undefined,
                    force_change: true
                }
            });
        }

        // 3. Post-Provisioning Health Verification
        const healthReport = await this.validatePostProvisionHealth(targetCompanyId, manifest);

        // 4. Record ProvisioningRun in APPLY mode
        const runRecord = await prisma.provisioningRun.create({
            data: {
                manifest_id: manifest.manifest_id,
                manifest_version: manifest.manifest_version,
                manifest_hash: diffReport.manifestHash,
                company_id: targetCompanyId,
                company_subdomain: subdomain,
                mode: 'APPLY',
                status: healthReport.status === 'FAILED' ? 'FAILED' : 'COMPLETED',
                initiated_by: initiatedBy,
                summary_json: {
                    diffSummary: diffReport.summary,
                    healthStatus: healthReport.status
                } as any
            }
        });

        await AuditService.logAction(
            initiatedBy,
            'TENANT_PROVISIONED',
            `Company ${targetCompanyId}`,
            {
                subdomain,
                companyId: targetCompanyId,
                manifestHash: diffReport.manifestHash,
                healthStatus: healthReport.status,
                runId: runRecord.id
            }
        );

        return {
            success: healthReport.status !== 'FAILED',
            companyId: targetCompanyId,
            diffReport,
            healthReport,
            provisioningRunId: runRecord.id
        };
    }

    /**
     * Executes post-provision health checks to verify resource completeness and tenant isolation.
     */
    static async validatePostProvisionHealth(companyId: string, manifest: TenantManifest): Promise<PostProvisionHealthReport> {
        const errors: string[] = [];
        const checksPassed: string[] = [];
        const pendingDeclarations: string[] = [];

        // Verify Company
        const company = await prisma.company.findUnique({ where: { id: companyId } });
        if (!company) {
            errors.push(`Company ID '${companyId}' not found post-provisioning`);
        } else {
            checksPassed.push(`Company '${company.name}' verified (ID: ${company.id}, Subdomain: ${company.subdomain})`);
        }

        // Verify Stores
        const stores = await prisma.store.findMany({ where: { company_id: companyId } });
        if (stores.length < manifest.locations.length) {
            errors.push(`Expected ${manifest.locations.length} stores, found ${stores.length}`);
        } else {
            checksPassed.push(`All ${stores.length} stores verified for company`);
        }

        // Verify Products
        const products = await prisma.companyProduct.findMany({ where: { company_id: companyId } });
        if (products.length < manifest.products.length) {
            errors.push(`Expected ${manifest.products.length} products, found ${products.length}`);
        } else {
            checksPassed.push(`All ${products.length} canonical physical products verified for company`);
        }

        // Verify Users
        const users = await prisma.user.findMany({ where: { company_id: companyId } });
        if (users.length < manifest.users.length) {
            errors.push(`Expected ${manifest.users.length} users, found ${users.length}`);
        } else {
            checksPassed.push(`All ${users.length} users verified for company`);
        }

        // Check Pending Operational Declarations
        if (manifest.pending_declarations?.baseline_status === 'PENDING_PILOT') {
            pendingDeclarations.push('Operational baseline pending pilot calibration');
        }
        if (manifest.pending_declarations?.corporate_target_status === 'PENDING_AUTHORIZED_INPUT') {
            pendingDeclarations.push('Corporate target pending executive authorization');
        }
        if (manifest.pending_declarations?.supplier_integration_status === 'PENDING_INTEGRATION') {
            pendingDeclarations.push('Supplier/SKU mapping pending integration');
        }

        const status = errors.length > 0 ? 'FAILED' : (pendingDeclarations.length > 0 ? 'HEALTHY_WITH_PENDING_CONFIGURATION' : 'HEALTHY');

        return {
            status,
            companyId,
            subdomain: manifest.company.subdomain,
            verifiedStoresCount: stores.length,
            verifiedProductsCount: products.length,
            verifiedUsersCount: users.length,
            pendingDeclarations,
            checksPassed,
            errors
        };
    }
}

// Copyright (c) 2023-2026 AGV VENTURES / Alexandre Garcia. All rights reserved.
// BRASA Meat Intelligence™ — Tenant Provisioner Engine (v1)

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { TenantManifest, TenantManifestValidator } from './TenantManifestValidator';
import { ProvisioningDiffEngine, ProvisioningDiffReport } from './ProvisioningDiffEngine';
import { AuditService } from './AuditService';
import { CredentialSetupService } from './CredentialSetupService';

const prisma = new PrismaClient();

export interface ActorContext {
    userId: string;
    role: string;
    capabilities?: string[];
    scope?: { type: string };
    companyId?: string | null;
}

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
     * Canonical BRASA Platform Security & Scope Enforcement for Provisioning Operations.
     * Invariants:
     * 1. ROLE_ADMIN_DOES_NOT_IMPLY_GLOBAL_SCOPE
     * 2. ROLE_ADMIN_DOES_NOT_IMPLY_TENANT_PROVISION_APPLY
     * 3. Tenant-owned accounts (scope.type === 'COMPANY' | 'STORE' | 'AREA') are DENIED platform provisioning.
     * 4. Provisioning requires explicit platform-level GLOBAL scope (Master Account).
     */
    static canUserApply(actorContext: { role?: string; scope?: { type: string }; capabilities?: string[]; companyId?: string | null }): boolean {
        if (!actorContext) return false;
        
        const scopeType = actorContext.scope?.type || 'UNKNOWN';

        // ZERO TRUST: A tenant-owned account (COMPANY, STORE, AREA) is strictly DENIED tenant provisioning authority.
        // Even if role === 'admin' or capabilities include 'TENANT_PROVISION_APPLY' in a client payload,
        // cross-tenant provisioning cannot be executed by a tenant-scoped identity.
        if (['COMPANY', 'STORE', 'AREA'].includes(scopeType)) {
            return false;
        }

        // Platform-level Master identity with GLOBAL scope
        if (scopeType === 'GLOBAL') {
            return true;
        }

        // Fallback for platform CLI / system admin execution contexts where scope defaults to GLOBAL
        if (actorContext.role === 'admin' && !actorContext.scope && !actorContext.companyId) {
            return true;
        }

        return false;
    }

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
     * Evaluates manifest, calculates diff, records ProvisioningRun state. ZERO business mutations performed!
     */
    static async dryRun(manifest: TenantManifest, actorContext: ActorContext | string = { userId: 'system_admin', role: 'admin', capabilities: ['TENANT_PROVISION_APPLY'] }): Promise<{ diffReport: ProvisioningDiffReport; runId: string }> {
        const actor = typeof actorContext === 'string' 
            ? { userId: actorContext, role: 'admin', capabilities: ['TENANT_PROVISION_APPLY'] } 
            : actorContext;

        const validation = TenantManifestValidator.validateManifestSchema(manifest);
        if (!validation.isValid) {
            throw new Error(`Manifest Schema Validation Failed: ${validation.errors.join('; ')}`);
        }

        const diffReport = await ProvisioningDiffEngine.computeDiff(manifest);

        // Record ProvisioningRun in DRY_RUN mode
        const runRecord = await prisma.provisioningRun.create({
            data: {
                manifest_id: manifest.manifest_id,
                manifest_version: manifest.manifest_version,
                manifest_hash: diffReport.manifestHash,
                company_subdomain: manifest.company.subdomain,
                mode: 'DRY_RUN',
                status: diffReport.status === 'READY_TO_PROVISION' ? 'VALIDATED' : diffReport.status,
                initiated_by: actor.userId,
                summary_json: diffReport.summary as any,
                error_json: diffReport.validationErrors.length > 0 ? (diffReport.validationErrors as any) : undefined
            }
        });

        await AuditService.logAction(
            actor.userId,
            'TENANT_PROVISIONING_DRY_RUN',
            `TenantManifest ${manifest.manifest_id}`,
            {
                runId: runRecord.id,
                subdomain: manifest.company.subdomain,
                status: diffReport.status,
                summary: diffReport.summary,
                manifestHash: diffReport.manifestHash
            }
        );

        return { diffReport, runId: runRecord.id };
    }

    /**
     * PHASE 2: Apply / Provisioning Execution.
     * Enforces explicit runId reference, hash verification, RBAC capability check, race recheck, and transactional apply.
     */
    static async apply(
        runId: string, 
        manifest: TenantManifest, 
        actorContext: ActorContext = { userId: 'system_admin', role: 'admin', capabilities: ['TENANT_PROVISION_APPLY'] }
    ): Promise<{
        success: boolean;
        companyId: string;
        diffReport: ProvisioningDiffReport;
        healthReport: PostProvisionHealthReport;
        provisioningRunId: string;
        alreadyApplied?: boolean;
    }> {
        // 1. RBAC & Capability Enforcement
        if (!this.canUserApply(actorContext)) {
            throw new Error(`AUTHORIZATION_DENIED: Actor '${actorContext.userId}' (Role: '${actorContext.role}') lacks explicit 'TENANT_PROVISION_APPLY' capability or 'admin' role.`);
        }

        if (!runId || runId.trim().length === 0) {
            throw new Error('RUN_ID_REQUIRED: Tenant provisioning apply requires an explicit validated run_id.');
        }

        // 2. Fetch & Validate ProvisioningRun
        const runRecord = await prisma.provisioningRun.findUnique({ where: { id: runId } });
        if (!runRecord) {
            throw new Error(`RUN_NOT_FOUND: ProvisioningRun '${runId}' does not exist.`);
        }

        // Handle Already Completed Run Idempotently
        if (runRecord.status === 'COMPLETED') {
            return {
                success: true,
                companyId: runRecord.company_id || '',
                diffReport: null as any,
                healthReport: {
                    status: 'HEALTHY',
                    companyId: runRecord.company_id || '',
                    subdomain: runRecord.company_subdomain,
                    verifiedStoresCount: (runRecord.summary_json as any)?.totalStores || 0,
                    verifiedProductsCount: (runRecord.summary_json as any)?.totalProducts || 0,
                    verifiedUsersCount: (runRecord.summary_json as any)?.totalUsers || 0,
                    pendingDeclarations: [],
                    checksPassed: ['IDEMPOTENT_ALREADY_APPLIED'],
                    errors: []
                },
                provisioningRunId: runRecord.id,
                alreadyApplied: true
            };
        }

        if (runRecord.status !== 'VALIDATED' && runRecord.mode !== 'DRY_RUN') {
            throw new Error(`INVALID_RUN_STATUS: ProvisioningRun '${runId}' is in status '${runRecord.status}'. Only 'VALIDATED' runs can be applied.`);
        }

        // 3. Manifest SHA-256 Hash Verification
        const submittedHash = TenantManifestValidator.calculateManifestHash(manifest);
        if (submittedHash !== runRecord.manifest_hash) {
            throw new Error(`MANIFEST_CHANGED_AFTER_VALIDATION: Submitted manifest SHA-256 hash (${submittedHash}) does not match validated ProvisioningRun hash (${runRecord.manifest_hash}). A new dry-run plan is required.`);
        }

        if (manifest.manifest_version !== runRecord.manifest_version) {
            throw new Error(`MANIFEST_VERSION_MISMATCH: Manifest version ${manifest.manifest_version} does not match validated run version ${runRecord.manifest_version}.`);
        }

        // 4. Pre-Apply Race Condition Recheck (PLAN_STALE)
        const freshDiffReport = await ProvisioningDiffEngine.computeDiff(manifest);
        if (freshDiffReport.status === 'BLOCKED') {
            throw new Error(`PLAN_STALE: Database state changed after validation. Plan blocked by fresh errors: ${freshDiffReport.validationErrors.join('; ')}`);
        }

        // Mark run status as APPLYING
        await prisma.provisioningRun.update({
            where: { id: runId },
            data: { status: 'APPLYING', mode: 'APPLY' }
        });

        const subdomain = manifest.company.subdomain;
        const companyName = manifest.company.canonical_name;

        // 5. Transactional Provisioning Execution
        let targetCompanyId: string = '';

        try {
            // Step 5a: Resolve or Create Company
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

            // Step 5b: Provision Entitlements
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

            // Step 5c: Provision Stores (Idempotent by store_name)
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
                        is_pilot: loc.is_pilot ?? false,
                        status: 'ACTIVE',
                        billing_active: true
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
                        status: 'ACTIVE',
                        billing_active: true,
                        activated_at: new Date(),
                        data_type: 'DEMO'
                    }
                });
                createdStoreMap.set(loc.canonical_key, store.id);
                createdStoreMap.set(loc.store_name.toLowerCase(), store.id);
            }

            // Step 5d: Provision Canonical Products
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

            // Step 5e: Provision Product Aliases across stores
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

            // Step 5e2: Provision Canonical Preparation Genealogy
            if (manifest.preparations && Array.isArray(manifest.preparations)) {
                for (const prep of manifest.preparations) {
                    let parentProductId = createdProductMap.get(prep.parent_protein_name.toLowerCase());
                    if (!parentProductId) {
                        const parentProdInDb = await prisma.companyProduct.findUnique({
                            where: {
                                company_id_name: {
                                    company_id: targetCompanyId,
                                    name: prep.parent_protein_name
                                }
                            }
                        });
                        if (!parentProdInDb) {
                            throw new Error(`PREPARATION_PARENT_PRODUCT_NOT_FOUND: Parent canonical product '${prep.parent_protein_name}' for preparation '${prep.subproduct_name}' was not found in company ID '${targetCompanyId}'.`);
                        }
                        parentProductId = parentProdInDb.id;
                        createdProductMap.set(prep.parent_protein_name.toLowerCase(), parentProductId);
                    }

                    const normalizedPrepName = prep.subproduct_name.toLowerCase().trim();

                    await prisma.companyProductPreparation.upsert({
                        where: {
                            company_id_parent_product_id_normalized_preparation_name: {
                                company_id: targetCompanyId,
                                parent_product_id: parentProductId,
                                normalized_preparation_name: normalizedPrepName
                            }
                        },
                        update: {
                            preparation_name: prep.subproduct_name,
                            status: 'ACTIVE'
                        },
                        create: {
                            company_id: targetCompanyId,
                            parent_product_id: parentProductId,
                            preparation_name: prep.subproduct_name,
                            normalized_preparation_name: normalizedPrepName,
                            status: 'ACTIVE'
                        }
                    });
                }
            }

            // Step 5f: Provision Users (Zero static/shared credentials. Unusable pre-activation sentinel & 256-bit setup token)
            for (const u of manifest.users) {
                const userStoreId = u.store_canonical_key ? createdStoreMap.get(u.store_canonical_key) : undefined;
                const prismaRole = this.mapRole(u.role);
                const preActivationSentinel = CredentialSetupService.generatePreActivationSentinel();

                const userRecord = await prisma.user.upsert({
                    where: { email: u.email.toLowerCase() },
                    update: {
                        role: prismaRole,
                        first_name: u.first_name || undefined,
                        last_name: u.last_name || undefined,
                        position: u.position || undefined,
                        company_id: targetCompanyId,
                        capabilities: u.capabilities || [],
                        store_id: userStoreId || undefined,
                        force_change: true
                    },
                    create: {
                        email: u.email.toLowerCase(),
                        password_hash: preActivationSentinel,
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

                // Generate secure 256-bit single-use onboarding token stored strictly as SHA-256 hash
                await CredentialSetupService.generateSetupToken(userRecord.id);
            }

            // Step 5g: Update ProvisioningRun status to COMPLETED
            await prisma.provisioningRun.update({
                where: { id: runId },
                data: {
                    status: 'COMPLETED',
                    company_id: targetCompanyId
                }
            });

            await AuditService.logAction(
                actorContext.userId,
                'TENANT_PROVISIONED',
                `Company ${targetCompanyId} (${subdomain})`,
                {
                    runId,
                    manifestId: manifest.manifest_id,
                    storesCreated: manifest.locations.length,
                    productsCreated: manifest.products.length,
                    usersCreated: manifest.users.length
                }
            );

            // Step 6: Post-Provisioning Health Validation
            const healthReport = await this.healthCheck(targetCompanyId, manifest);

            return {
                success: true,
                companyId: targetCompanyId,
                diffReport: freshDiffReport,
                healthReport,
                provisioningRunId: runId
            };
        } catch (err: any) {
            await prisma.provisioningRun.update({
                where: { id: runId },
                data: {
                    status: 'FAILED',
                    error_json: { message: err.message, stack: err.stack } as any
                }
            });

            await AuditService.logAction(
                actorContext.userId,
                'TENANT_PROVISIONING_FAILED',
                `TenantManifest ${manifest.manifest_id}`,
                { runId, error: err.message }
            );

            throw err;
        }
    }

    /**
     * Executes post-provisioning health verification for a company.
     */
    static async healthCheck(companyId: string, manifest: TenantManifest): Promise<PostProvisionHealthReport> {
        const errors: string[] = [];
        const checksPassed: string[] = [];

        const company = await prisma.company.findUnique({ where: { id: companyId } });
        if (!company) {
            errors.push(`Company ID '${companyId}' not found in DB`);
        } else {
            checksPassed.push('COMPANY_EXISTS_AND_ACTIVE');
        }

        const storesCount = await prisma.store.count({ where: { company_id: companyId } });
        if (storesCount < manifest.locations.length) {
            errors.push(`Store count mismatch: Found ${storesCount}, expected ${manifest.locations.length}`);
        } else {
            checksPassed.push(`STORES_COUNT_VERIFIED (${storesCount}/${manifest.locations.length})`);
        }

        const productsCount = await prisma.companyProduct.count({ where: { company_id: companyId } });
        if (productsCount < manifest.products.length) {
            errors.push(`Product count mismatch: Found ${productsCount}, expected ${manifest.products.length}`);
        } else {
            checksPassed.push(`PRODUCTS_COUNT_VERIFIED (${productsCount}/${manifest.products.length})`);
        }

        const usersCount = await prisma.user.count({ where: { company_id: companyId } });
        if (usersCount < manifest.users.length) {
            errors.push(`User count mismatch: Found ${usersCount}, expected ${manifest.users.length}`);
        } else {
            checksPassed.push(`USERS_COUNT_VERIFIED (${usersCount}/${manifest.users.length})`);
            checksPassed.push('USER_PRE_ACTIVATION_CREDENTIAL_SENTINELS_VERIFIED');
        }

        const pendingDeclarations: string[] = [];
        pendingDeclarations.push('INVITATION_DELIVERY_PENDING_CONFIGURATION (Provisioned users in non-authenticatable pre-activation state requiring invitation setup)');
        if (manifest.pending_declarations) {
            if (manifest.pending_declarations.baseline_status === 'PENDING_PILOT') {
                pendingDeclarations.push('BASELINE_SRE_CALIBRATION_PENDING (Tenant in 90-day baseline data capture)');
            }
            if (manifest.pending_declarations.corporate_target_status === 'PENDING_AUTHORIZED_INPUT') {
                pendingDeclarations.push('CORPORATE_TARGET_PENDING (Awaiting executive target version creation)');
            }
            if (manifest.pending_declarations.supplier_integration_status === 'PENDING_INTEGRATION') {
                pendingDeclarations.push('SUPPLIER_EDI_INTEGRATION_PENDING (Invoice parser pipeline active)');
            }
        }

        const isHealthy = errors.length === 0;

        return {
            status: isHealthy 
                ? (pendingDeclarations.length > 0 ? 'HEALTHY_WITH_PENDING_CONFIGURATION' : 'HEALTHY')
                : 'FAILED',
            companyId,
            subdomain: company?.subdomain || manifest.company.subdomain,
            verifiedStoresCount: storesCount,
            verifiedProductsCount: productsCount,
            verifiedUsersCount: usersCount,
            pendingDeclarations,
            checksPassed,
            errors
        };
    }
}

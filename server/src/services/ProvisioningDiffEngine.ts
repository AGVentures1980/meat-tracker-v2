// Copyright (c) 2023-2026 AGV VENTURES / Alexandre Garcia. All rights reserved.
// BRASA Meat Intelligence™ — Provisioning Diff Engine

import { PrismaClient } from '@prisma/client';
import { TenantManifest, TenantManifestValidator } from './TenantManifestValidator';
import { ProteinTaxonomyService } from './ProteinTaxonomyService';

const prisma = new PrismaClient();

export type DiffAction = 'CREATE' | 'UPDATE' | 'UNCHANGED' | 'CONFLICT' | 'REQUIRES_REVIEW' | 'BLOCKED';

export interface EntityDiff {
    entityType: 'COMPANY' | 'LOCATION' | 'PRODUCT' | 'PREPARATION' | 'ALIAS' | 'USER' | 'ENTITLEMENT' | 'DECLARATION';
    entityKey: string;
    action: DiffAction;
    reason: string;
    details?: any;
}

export interface ProvisioningDiffReport {
    manifestId: string;
    manifestVersion: number;
    manifestHash: string;
    companySubdomain: string;
    companyName: string;
    status: 'READY_TO_PROVISION' | 'REQUIRES_REVIEW' | 'BLOCKED';
    summary: {
        createCount: number;
        updateCount: number;
        unchangedCount: number;
        conflictCount: number;
        requiresReviewCount: number;
        blockedCount: number;
        totalEntities: number;
    };
    diffs: EntityDiff[];
    validationErrors: string[];
    validationWarnings: string[];
}

export class ProvisioningDiffEngine {

    /**
     * Computes the desired-state diff report between a TenantManifest and current production database.
     */
    static async computeDiff(manifest: TenantManifest): Promise<ProvisioningDiffReport> {
        const schemaValidation = TenantManifestValidator.validateManifestSchema(manifest);
        const manifestHash = TenantManifestValidator.calculateManifestHash(manifest);

        const diffs: EntityDiff[] = [];
        const validationErrors = [...schemaValidation.errors];
        const validationWarnings = [...schemaValidation.warnings];

        if (!schemaValidation.isValid) {
            return {
                manifestId: manifest.manifest_id,
                manifestVersion: manifest.manifest_version,
                manifestHash,
                companySubdomain: manifest.company?.subdomain || 'unknown',
                companyName: manifest.company?.canonical_name || 'unknown',
                status: 'BLOCKED',
                summary: {
                    createCount: 0,
                    updateCount: 0,
                    unchangedCount: 0,
                    conflictCount: 0,
                    requiresReviewCount: 0,
                    blockedCount: validationErrors.length,
                    totalEntities: 0
                },
                diffs: [],
                validationErrors,
                validationWarnings
            };
        }

        const subdomain = manifest.company.subdomain;
        const companyName = manifest.company.canonical_name;

        // 1. Evaluate Company Identity & Subdomain Collision Boundaries
        let existingCompanyBySubdomain = await prisma.company.findFirst({
            where: { subdomain }
        });

        let existingCompanyByName = await prisma.company.findFirst({
            where: { name: { equals: companyName, mode: 'insensitive' } }
        });

        let targetCompanyId: string | null = null;

        if (existingCompanyBySubdomain) {
            targetCompanyId = existingCompanyBySubdomain.id;
            // Check if subdomain belongs to another company
            if (existingCompanyBySubdomain.name.toLowerCase() !== companyName.toLowerCase()) {
                diffs.push({
                    entityType: 'COMPANY',
                    entityKey: subdomain,
                    action: 'CONFLICT',
                    reason: `Subdomain collision: Subdomain '${subdomain}' is already assigned to existing company '${existingCompanyBySubdomain.name}' (ID: ${existingCompanyBySubdomain.id})`
                });
            } else {
                diffs.push({
                    entityType: 'COMPANY',
                    entityKey: subdomain,
                    action: 'UNCHANGED',
                    reason: `Company '${companyName}' already exists (ID: ${existingCompanyBySubdomain.id})`
                });
            }
        } else if (existingCompanyByName) {
            targetCompanyId = existingCompanyByName.id;
            diffs.push({
                entityType: 'COMPANY',
                entityKey: companyName,
                action: 'REQUIRES_REVIEW',
                reason: `Company name '${companyName}' matches existing company (ID: ${existingCompanyByName.id}), but subdomain '${subdomain}' differs. Review required before merging.`
            });
        } else {
            diffs.push({
                entityType: 'COMPANY',
                entityKey: companyName,
                action: 'CREATE',
                reason: `New company '${companyName}' will be created with subdomain '${subdomain}'`
            });
        }

        // 2. Evaluate Location Entities
        const existingStores = targetCompanyId ? await prisma.store.findMany({
            where: { company_id: targetCompanyId }
        }) : [];

        const existingStoreMap = new Map(existingStores.map(s => [s.store_name.toLowerCase(), s]));

        for (const loc of manifest.locations) {
            const existingStore = existingStoreMap.get(loc.store_name.toLowerCase());
            if (existingStore) {
                const needsUpdate = (loc.city && existingStore.city !== loc.city) ||
                                    (loc.timezone && existingStore.timezone !== loc.timezone) ||
                                    (loc.dinner_price && existingStore.dinner_price !== loc.dinner_price);

                diffs.push({
                    entityType: 'LOCATION',
                    entityKey: `${loc.canonical_key}:${loc.store_name}`,
                    action: needsUpdate ? 'UPDATE' : 'UNCHANGED',
                    reason: needsUpdate ? `Store '${loc.store_name}' metadata requires update` : `Store '${loc.store_name}' exists and matches desired state`
                });
            } else {
                diffs.push({
                    entityType: 'LOCATION',
                    entityKey: `${loc.canonical_key}:${loc.store_name}`,
                    action: 'CREATE',
                    reason: `New store '${loc.store_name}' will be provisioned`
                });
            }
        }

        // 3. Evaluate Product Entities & Taxonomy Rules
        const existingProducts = targetCompanyId ? await prisma.companyProduct.findMany({
            where: { company_id: targetCompanyId }
        }) : [];

        const existingProdMap = new Map(existingProducts.map(p => [p.name.toLowerCase(), p]));

        for (const prod of manifest.products) {
            const existingProd = existingProdMap.get(prod.canonical_name.toLowerCase());
            if (existingProd) {
                diffs.push({
                    entityType: 'PRODUCT',
                    entityKey: prod.canonical_name,
                    action: 'UNCHANGED',
                    reason: `Canonical product '${prod.canonical_name}' already exists`
                });
            } else {
                diffs.push({
                    entityType: 'PRODUCT',
                    entityKey: prod.canonical_name,
                    action: 'CREATE',
                    reason: `New canonical receiving product '${prod.canonical_name}' will be created`
                });
            }
        }

        // 4. Evaluate Product Aliases
        if (manifest.aliases && Array.isArray(manifest.aliases)) {
            for (const alias of manifest.aliases) {
                const check = ProteinTaxonomyService.validateAliasMapping(alias.canonical_protein_name, alias.alias_name);
                if (!check.isValid) {
                    diffs.push({
                        entityType: 'ALIAS',
                        entityKey: `${alias.alias_name}->${alias.canonical_protein_name}`,
                        action: 'CONFLICT',
                        reason: `Taxonomy contradiction: ${check.reason}`
                    });
                } else {
                    diffs.push({
                        entityType: 'ALIAS',
                        entityKey: `${alias.alias_name}->${alias.canonical_protein_name}`,
                        action: 'CREATE',
                        reason: `Valid product alias mapping '${alias.alias_name}' -> '${alias.canonical_protein_name}' will be provisioned`
                    });
                }
            }
        }

        // 5. Evaluate Preparations
        if (manifest.preparations && Array.isArray(manifest.preparations)) {
            for (const prep of manifest.preparations) {
                diffs.push({
                    entityType: 'PREPARATION',
                    entityKey: `${prep.subproduct_name}->${prep.parent_protein_name}`,
                    action: 'CREATE',
                    reason: `Subproduct relationship '${prep.subproduct_name}' under parent '${prep.parent_protein_name}' will be registered`
                });
            }
        }

        // 6. Evaluate User Accounts & Cross-Tenant Email Collisions
        for (const user of manifest.users) {
            const existingUser = await prisma.user.findUnique({
                where: { email: user.email.toLowerCase() }
            });

            if (existingUser) {
                if (existingUser.company_id && existingUser.company_id !== targetCompanyId) {
                    diffs.push({
                        entityType: 'USER',
                        entityKey: user.email,
                        action: 'CONFLICT',
                        reason: `Cross-Tenant User Collision: Email '${user.email}' is already registered to company ID '${existingUser.company_id}'. Cannot reassign cross-tenant user!`
                    });
                } else {
                    diffs.push({
                        entityType: 'USER',
                        entityKey: user.email,
                        action: 'UNCHANGED',
                        reason: `User '${user.email}' already exists for company`
                    });
                }
            } else {
                diffs.push({
                    entityType: 'USER',
                    entityKey: user.email,
                    action: 'CREATE',
                    reason: `New user account '${user.email}' (${user.role}) will be provisioned`
                });
            }
        }

        // 7. Evaluate Pending Declarations
        if (manifest.pending_declarations) {
            diffs.push({
                entityType: 'DECLARATION',
                entityKey: 'operational_baseline',
                action: 'UNCHANGED',
                reason: `Baseline declared as ${manifest.pending_declarations.baseline_status || 'PENDING_PILOT'}. Zero fake baseline seeding.`
            });
            diffs.push({
                entityType: 'DECLARATION',
                entityKey: 'corporate_target',
                action: 'UNCHANGED',
                reason: `Corporate target declared as ${manifest.pending_declarations.corporate_target_status || 'PENDING_AUTHORIZED_INPUT'}. Zero fake target creation.`
            });
        }

        // Compute summary counts
        const createCount = diffs.filter(d => d.action === 'CREATE').length;
        const updateCount = diffs.filter(d => d.action === 'UPDATE').length;
        const unchangedCount = diffs.filter(d => d.action === 'UNCHANGED').length;
        const conflictCount = diffs.filter(d => d.action === 'CONFLICT').length;
        const requiresReviewCount = diffs.filter(d => d.action === 'REQUIRES_REVIEW').length;
        const blockedCount = diffs.filter(d => d.action === 'BLOCKED').length;

        let status: 'READY_TO_PROVISION' | 'REQUIRES_REVIEW' | 'BLOCKED' = 'READY_TO_PROVISION';
        if (conflictCount > 0 || blockedCount > 0) {
            status = 'BLOCKED';
        } else if (requiresReviewCount > 0) {
            status = 'REQUIRES_REVIEW';
        }

        return {
            manifestId: manifest.manifest_id,
            manifestVersion: manifest.manifest_version,
            manifestHash,
            companySubdomain: subdomain,
            companyName,
            status,
            summary: {
                createCount,
                updateCount,
                unchangedCount,
                conflictCount,
                requiresReviewCount,
                blockedCount,
                totalEntities: diffs.length
            },
            diffs,
            validationErrors,
            validationWarnings
        };
    }
}

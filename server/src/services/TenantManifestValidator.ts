// Copyright (c) 2023-2026 AGV VENTURES / Alexandre Garcia. All rights reserved.
// BRASA Meat Intelligence™ — Tenant Manifest Validator

import crypto from 'crypto';
import { ProteinTaxonomyService } from './ProteinTaxonomyService';

export interface LocationManifest {
    canonical_key: string;
    store_name: string;
    store_code?: string;
    city?: string;
    state?: string;
    country?: string;
    timezone?: string;
    status?: 'ACTIVE' | 'INACTIVE' | 'CLOSED';
    is_pilot?: boolean;
    dinner_price?: number;
    lunch_price?: number;
    is_lunch_enabled?: boolean;
}

export interface ProductManifest {
    canonical_name: string;
    category?: string;
    protein_group?: string;
    is_dinner_only?: boolean;
    standard_target?: number;
}

export interface PreparationManifest {
    parent_protein_name: string;
    subproduct_name: string;
    is_independently_purchased?: boolean;
}

export interface AliasManifest {
    alias_name: string;
    canonical_protein_name: string;
}

export interface UserManifest {
    email: string;
    role: 'owner' | 'director' | 'area_manager' | 'manager' | 'viewer';
    first_name?: string;
    last_name?: string;
    position?: string;
    is_primary?: boolean;
    store_canonical_key?: string;
    capabilities?: string[];
}

export interface PendingDeclarationsManifest {
    baseline_status?: 'PENDING_PILOT' | 'CALIBRATED';
    corporate_target_status?: 'PENDING_AUTHORIZED_INPUT' | 'APPROVED';
    supplier_integration_status?: 'PENDING_INTEGRATION' | 'INTEGRATED';
}

export interface TenantManifest {
    manifest_id: string;
    manifest_version: number; // Must be 1
    company: {
        canonical_name: string;
        display_name: string;
        subdomain: string;
        concept_type?: string;
        timezone_default?: string;
        country?: string;
        status?: string;
        branding?: {
            theme_primary_color?: string;
            theme_logo_url?: string;
            theme_bg_url?: string;
        };
        entitlements?: string[];
        pilot_config?: {
            is_pilot: boolean;
            pilot_start_date?: string;
        };
    };
    locations: LocationManifest[];
    products: ProductManifest[];
    preparations?: PreparationManifest[];
    aliases?: AliasManifest[];
    users: UserManifest[];
    pending_declarations?: PendingDeclarationsManifest;
}

export class TenantManifestValidator {

    /**
     * Calculates deterministic SHA-256 hash over normalized manifest JSON.
     */
    static calculateManifestHash(manifest: TenantManifest): string {
        const canonicalString = JSON.stringify(manifest, Object.keys(manifest).sort());
        return crypto.createHash('sha256').update(canonicalString).digest('hex');
    }

    /**
     * Validates manifest structure, version, taxonomy rules, and safety boundaries.
     */
    static validateManifestSchema(manifest: TenantManifest): { isValid: boolean; errors: string[]; warnings: string[] } {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!manifest) {
            return { isValid: false, errors: ['Manifest is required'], warnings: [] };
        }

        if (manifest.manifest_version !== 1) {
            errors.push(`Unsupported manifest_version: ${manifest.manifest_version}. Expected 1.`);
        }

        if (!manifest.manifest_id || manifest.manifest_id.trim().length === 0) {
            errors.push('manifest_id is required');
        }

        if (!manifest.company || !manifest.company.canonical_name || !manifest.company.subdomain) {
            errors.push('Company canonical_name and subdomain are required');
        }

        // Subdomain formatting check
        if (manifest.company && manifest.company.subdomain) {
            const sub = manifest.company.subdomain;
            if (!/^[a-z0-9-]+$/.test(sub)) {
                errors.push(`Invalid subdomain format: '${sub}'. Subdomain must contain only lowercase letters, numbers, and hyphens.`);
            }
        }

        // Validate Locations
        if (!manifest.locations || !Array.isArray(manifest.locations) || manifest.locations.length === 0) {
            errors.push('Locations array must contain at least one location');
        } else {
            const keys = new Set<string>();
            manifest.locations.forEach((loc, idx) => {
                if (!loc.canonical_key || !loc.store_name) {
                    errors.push(`Location at index ${idx} missing canonical_key or store_name`);
                }
                if (keys.has(loc.canonical_key)) {
                    errors.push(`Duplicate location canonical_key in manifest: '${loc.canonical_key}'`);
                }
                keys.add(loc.canonical_key);
            });
        }

        // Validate Products & Physical Taxonomy Rules
        if (manifest.products && Array.isArray(manifest.products)) {
            manifest.products.forEach(p => {
                if (!p.canonical_name) {
                    errors.push('Product missing canonical_name');
                }
            });
        }

        // Validate Product Aliases against Taxonomy Invariants
        if (manifest.aliases && Array.isArray(manifest.aliases)) {
            manifest.aliases.forEach(alias => {
                const check = ProteinTaxonomyService.validateAliasMapping(alias.canonical_protein_name, alias.alias_name);
                if (!check.isValid) {
                    errors.push(`Taxonomy Violation in manifest alias: '${alias.alias_name}' -> '${alias.canonical_protein_name}': ${check.reason}`);
                }
            });
        }

        // Validate Flank / Flap Meat ambiguity rule
        if (manifest.aliases && Array.isArray(manifest.aliases)) {
            manifest.aliases.forEach(a => {
                const normAlias = a.alias_name.toLowerCase();
                const normCanonical = a.canonical_protein_name.toLowerCase();
                if ((normAlias.includes('flank') && normCanonical.includes('flap')) || (normAlias.includes('flap') && normCanonical.includes('flank'))) {
                    warnings.push(`PROCUREMENT_REVIEW_REQUIRED: Alias '${a.alias_name}' -> '${a.canonical_protein_name}' bridges Flank/Flap Meat identity. Verify tenant SKU evidence.`);
                }
            });
        }

        // Validate Users
        if (!manifest.users || !Array.isArray(manifest.users) || manifest.users.length === 0) {
            errors.push('Users array must contain at least one user account');
        } else {
            const emails = new Set<string>();
            manifest.users.forEach((u, idx) => {
                if (!u.email || !u.role) {
                    errors.push(`User at index ${idx} missing email or role`);
                }
                if (emails.has(u.email.toLowerCase())) {
                    errors.push(`Duplicate user email in manifest: '${u.email}'`);
                }
                emails.add(u.email.toLowerCase());
            });
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }
}

// Copyright (c) 2023-2026 AGV VENTURES / Alexandre Garcia. All rights reserved.
// BRASA Meat Intelligence™ — Canonical Protein Taxonomy Service

export interface CanonicalProteinDefinition {
    name: string;
    proteinGroup: string;
    isVillain: boolean;
    isDinnerOnly: boolean;
    standardTarget: number | null;
    lbsPerSkewer?: number;
}

export class ProteinTaxonomyService {
    /**
     * Canonical Physical Product Definitions across BRASA Core.
     * Enforces physical cut identity overspecies/culinary convenience groupings.
     */
    public static readonly CANONICAL_PROTEIN_CATALOG: CanonicalProteinDefinition[] = [
        // BEEF GROUP
        { name: 'Picanha', proteinGroup: 'Sirloin', isVillain: true, isDinnerOnly: false, standardTarget: 0.39 },
        { name: 'Filet Mignon', proteinGroup: 'Filet', isVillain: true, isDinnerOnly: false, standardTarget: 0.10 },
        { name: 'Fraldinha', proteinGroup: 'Flank', isVillain: true, isDinnerOnly: false, standardTarget: 0.24 },
        { name: 'Ribeye', proteinGroup: 'Ribeye', isVillain: false, isDinnerOnly: false, standardTarget: 0.08 },
        { name: 'Beef Ribs', proteinGroup: 'Beef Ribs', isVillain: false, isDinnerOnly: false, standardTarget: 0.08 },

        // LAMB GROUP
        { name: 'Rack of Lamb', proteinGroup: 'Lamb', isVillain: false, isDinnerOnly: false, standardTarget: 0.08 },
        { name: 'Lamb Picanha', proteinGroup: 'Lamb', isVillain: false, isDinnerOnly: false, standardTarget: null }, // Target Pending Validation

        // CHICKEN GROUP
        { name: 'Chicken Thighs', proteinGroup: 'Chicken', isVillain: false, isDinnerOnly: false, standardTarget: null }, // Target Pending Validation
        { name: 'Chicken Drumsticks', proteinGroup: 'Chicken', isVillain: false, isDinnerOnly: false, standardTarget: null }, // Target Pending Validation

        // SAUSAGE GROUP
        { name: 'Brazilian Sausage', proteinGroup: 'Sausage', isVillain: false, isDinnerOnly: false, standardTarget: null }, // Target Pending Validation
        { name: 'Cheddar Sausage', proteinGroup: 'Sausage', isVillain: false, isDinnerOnly: false, standardTarget: null }, // Target Pending Validation

        // SEAFOOD GROUP
        { name: 'Salmon', proteinGroup: 'Seafood', isVillain: false, isDinnerOnly: false, standardTarget: null },
        { name: 'Shrimp', proteinGroup: 'Seafood', isVillain: false, isDinnerOnly: false, standardTarget: null }
    ];

    /**
     * Enforces mandatory taxonomy separation rules:
     * - Ribeye != Beef Ribs
     * - Rack of Lamb != Lamb Picanha
     * - Chicken Thighs != Chicken Drumsticks
     * - Brazilian Sausage != Cheddar Sausage
     */
    public static validateAliasMapping(canonicalName: string, aliasName: string): { isValid: boolean; reason?: string } {
        const canonical = canonicalName.trim().toLowerCase();
        const alias = aliasName.trim().toLowerCase();

        // Rule 1: Cajun Ribeye maps to Ribeye, NOT Beef Ribs
        if (alias.includes('ribeye') && canonical === 'beef ribs') {
            return { isValid: false, reason: 'TAXONOMY_VIOLATION: Cajun Ribeye must resolve to Ribeye, not Beef Ribs.' };
        }

        // Rule 2: Lamb Picanha must NOT be collapsed into Rack of Lamb
        if (alias.includes('picanha') && alias.includes('lamb') && canonical === 'rack of lamb') {
            return { isValid: false, reason: 'TAXONOMY_VIOLATION: Lamb Picanha is a distinct cut from Rack of Lamb.' };
        }

        // Rule 3: Drumsticks vs Thighs
        if (alias.includes('drumstick') && canonical === 'chicken thighs') {
            return { isValid: false, reason: 'TAXONOMY_VIOLATION: Chicken Drumsticks must not be mapped to Chicken Thighs.' };
        }

        // Rule 4: Cheddar vs Brazilian Sausage
        if (alias.includes('cheddar') && canonical === 'brazilian sausage') {
            return { isValid: false, reason: 'TAXONOMY_VIOLATION: Cheddar Sausage is a distinct SKU from Brazilian Sausage.' };
        }

        return { isValid: true };
    }
}

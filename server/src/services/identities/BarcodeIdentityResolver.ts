import { PrismaClient, CorporateProteinSpec, CanonicalBarcodeIdentity, OperationalFamily, FamilySpecBinding } from '@prisma/client';
import { CanonicalIdentityCandidate } from '../CanonicalIdentityGenerator';
import { OperationalFamilyResolver } from './OperationalFamilyResolver';

const prisma = new PrismaClient();

export interface ResolvedCanonicalMatch {
    canonicalIdentity: CanonicalBarcodeIdentity | null;
    operationalFamily: OperationalFamily | null;
    familyBinding: FamilySpecBinding | null;
    corporateSpec: CorporateProteinSpec | null;
    matchType: 'EXACT_IDENTITY' | 'ALIAS_MAPPED' | 'NONE';
}

export class BarcodeIdentityResolver {
    
    /**
     * Resolves a barcode scan strictly through the canonical ecosystem hierarchy.
     */
    public static async resolve(
        candidate: CanonicalIdentityCandidate,
        companyId: string
    ): Promise<ResolvedCanonicalMatch> {
        
        let corporateSpec: CorporateProteinSpec | null = null;
        let operationalFamily: OperationalFamily | null = null;
        let familyBinding: FamilySpecBinding | null = null;
        let matchType: 'EXACT_IDENTITY' | 'ALIAS_MAPPED' | 'NONE' = 'NONE';
        let identity: CanonicalBarcodeIdentity | null = null;
        
        const identityHash = candidate.identityHash;
        
        // 1. Try Alias Resolution FIRST
        // Priority 1: Family-Level Alias
        let aliasMatch = null;
        
        if (candidate.familyStableSignature) {
            aliasMatch = await prisma.supplierProductAlias.findFirst({
                where: {
                    alias_value: candidate.familyStableSignature,
                    status: 'ACTIVE',
                    canonical_identity: {
                        company_id: companyId
                    }
                },
                include: { canonical_identity: true }
            });
        }

        // Priority 2: Item-Level Alias (Fallback if no family match, or if it's RAW)
        if (!aliasMatch) {
            aliasMatch = await prisma.supplierProductAlias.findFirst({
                where: {
                    alias_value: candidate.itemStableSignature,
                    status: 'ACTIVE',
                    canonical_identity: {
                        company_id: companyId
                    }
                },
                include: { canonical_identity: true }
            });
        }

        if (aliasMatch && aliasMatch.canonical_identity) {
            identity = aliasMatch.canonical_identity;
            matchType = 'ALIAS_MAPPED';
        } else {
            // 2. Fallback to direct identity by hash (EXACT canonical hit)
            identity = await prisma.canonicalBarcodeIdentity.findUnique({
                where: { identity_hash: identityHash }
            });

            if (identity) {
                matchType = 'EXACT_IDENTITY';
            }
        }

        // 3. Resolve Operational Family Binding
        if (identity && identity.operational_family_id) {
            const familyResolution = await OperationalFamilyResolver.resolveFamilyById(identity.operational_family_id);
            if (familyResolution) {
                operationalFamily = familyResolution.family;
                
                // For V1, we naively grab the first active corporate binding (usually 1:1 legacy fallback)
                if (familyResolution.specBindings && familyResolution.specBindings.length > 0) {
                    familyBinding = familyResolution.specBindings[0];
                    corporateSpec = (familyBinding as any).protein_spec;
                }
            }
        }

        return {
            canonicalIdentity: identity,
            operationalFamily,
            familyBinding,
            corporateSpec,
            matchType
        };
    }
}

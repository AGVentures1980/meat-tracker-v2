import { PrismaClient, SupplierProductAlias, CanonicalBarcodeIdentity } from '@prisma/client';

const prisma = new PrismaClient();

export class SupplierAliasResolver {
    
    /**
     * Finds an approved alias and its associated Canonical Identity
     */
    public static async resolveBySignature(
        stableSignature: string,
        companyId: string
    ): Promise<SupplierProductAlias & { canonical_identity: CanonicalBarcodeIdentity } | null> {
        
        const aliasMatch = await prisma.supplierProductAlias.findFirst({
            where: {
                alias_value: stableSignature,
                status: 'ACTIVE',
                canonical_identity: {
                    company_id: companyId,
                    status: 'ACTIVE'
                }
            },
            include: { canonical_identity: true }
        });

        if (process.env.ENABLE_BARCODE_RUNTIME_TRACE === 'true') {
            console.log(`[EXECUTION DEBUG - SupplierAliasResolver]`);
            console.log(` -> Stable Signature buscada: ${stableSignature}`);
            console.log(` -> Resultado encontrado: ${aliasMatch !== null}`);
            if (aliasMatch) console.log(` -> AliasId: ${aliasMatch.id}\n`);
            else console.log('\n');
        }

        return aliasMatch;
    }

    /**
     * Creates a new Alias Mapping for an existing Canonical Identity
     */
    public static async createAlias(
        canonicalIdentityId: string,
        aliasValue: string,
        aliasType: string,
        confidence: number,
        createdBy: string,
        supplierId?: string
    ): Promise<SupplierProductAlias> {
        
        return await prisma.supplierProductAlias.create({
            data: {
                canonical_identity_id: canonicalIdentityId,
                alias_value: aliasValue,
                alias_type: aliasType,
                confidence,
                created_by: createdBy,
                supplier_id: supplierId || null,
                status: 'ACTIVE'
            }
        });
    }
}

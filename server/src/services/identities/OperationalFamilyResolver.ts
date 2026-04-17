import { PrismaClient, OperationalFamily, FamilySpecBinding, CorporateProteinSpec } from '@prisma/client';

const prisma = new PrismaClient();

export interface ResolvedFamily {
    family: OperationalFamily;
    specBindings: (FamilySpecBinding & { protein_spec: CorporateProteinSpec })[];
}

export class OperationalFamilyResolver {
    
    /**
     * Resolves the Family and its mapped original Corporate Specs given a Family ID.
     */
    public static async resolveFamilyById(
        familyId: string
    ): Promise<ResolvedFamily | null> {
        
        const family = await prisma.operationalFamily.findUnique({
            where: { id: familyId },
            include: {
                bindings: {
                    where: { binding_status: 'ACTIVE' },
                    include: { protein_spec: true }
                }
            }
        });

        if (!family || !family.active) return null;

        if (process.env.ENABLE_BARCODE_RUNTIME_TRACE === 'true') {
            console.log(`[EXECUTION DEBUG - OperationalFamilyResolver]`);
            console.log(` -> CanonicalID pesquisado/vinculado: Resolvido internamente pra FamilyId=${family.id}`);
            console.log(` -> Family Encontrada: ${family.family_code} / ${family.family_name}`);
            console.log(` -> SpecBindings Ativos Associados: ${family.bindings.length}`);
            if (family.bindings.length > 0) {
                console.log(` -> Primary SpecID vinculado: ${family.bindings[0].corporate_protein_spec_id}\n`);
            } else {
                console.log('\n');
            }
        }

        return {
            family: family,
            specBindings: family.bindings as (FamilySpecBinding & { protein_spec: CorporateProteinSpec })[]
        };
    }

    /**
     * Finds active families containing the provided Code or Name, or creates it.
     */
    public static async findOrCreateFamily(
        companyId: string,
        familyCode: string,
        familyName: string
    ): Promise<OperationalFamily> {
        
        let family = await prisma.operationalFamily.findUnique({
            where: { company_id_family_code: { company_id: companyId, family_code: familyCode } }
        });

        if (!family) {
            family = await prisma.operationalFamily.create({
                data: {
                    company_id: companyId,
                    family_code: familyCode,
                    family_name: familyName,
                    active: true
                }
            });
        }

        return family;
    }

    /**
     * Secures a binding towards the legacy CorporateProteinSpec.
     */
    public static async bindSpecToFamily(
        familyId: string,
        corporateSpecId: string,
        createdBy: string
    ): Promise<FamilySpecBinding> {
        // Find existing
        let binding = await prisma.familySpecBinding.findUnique({
            where: {
                operational_family_id_corporate_protein_spec_id: {
                    operational_family_id: familyId,
                    corporate_protein_spec_id: corporateSpecId
                }
            }
        });

        if (!binding) {
            binding = await prisma.familySpecBinding.create({
                data: {
                    operational_family_id: familyId,
                    corporate_protein_spec_id: corporateSpecId,
                    binding_status: 'ACTIVE',
                    created_by: createdBy
                }
            });
        } else if (binding.binding_status !== 'ACTIVE') {
            binding = await prisma.familySpecBinding.update({
                where: { id: binding.id },
                data: { binding_status: 'ACTIVE' }
            });
        }

        return binding;
    }
}

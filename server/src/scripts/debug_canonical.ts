import { PrismaClient } from '@prisma/client';
import { BarcodeParserRouter } from '../services/LabelDataFusionEngine';
import { LabelDataFusionEngine } from '../services/LabelDataFusionEngine';
import { ComplianceEngine } from '../services/ComplianceEngine';
import { CanonicalIdentityGenerator } from '../services/CanonicalIdentityGenerator';
import { OperationalFamilyResolver } from '../services/identities/OperationalFamilyResolver';
import { SupplierAliasResolver } from '../services/identities/SupplierAliasResolver';

const prisma = new PrismaClient();

async function run() {
    process.env.ENABLE_BARCODE_RUNTIME_TRACE = 'true';
    
    // Pegando a primeira empresa
    const company = await prisma.company.findFirst();
    if (!company) {
        throw new Error("No companies in DB!");
    }
    const companyId = company.id;
    const supplierId = 'debug-supplier-123'; // Fake supplier to simulate behavior

    // Cleanup aliases for stable run
    await prisma.supplierProductAlias.deleteMany({});
    await prisma.canonicalBarcodeIdentity.deleteMany({});
    await prisma.operationalFamily.deleteMany({ where: { family_name: { contains: 'DEBUG_F' } } });
    await prisma.corporateProteinSpec.upsert({
        where: { id: 'debug-spec-99' },
        update: {},
        create: {
             id: 'debug-spec-99',
             company_id: companyId,
             protein_name: 'Picanha Choice',
             approved_brand: 'Texas de Brazil',
             approved_item_code: 'PIC_CH',
             expected_weight_min: 2.0,
             expected_weight_max: 90.0,
             created_by: 'system'
        }
    });

    const barcodes = [
        "0190076338888514320100070811260313210201003800",
        "0190076338888477320100081811260310210201001625",
        "0190076338879475320100083511260312210201000787",
        "0190076338712321320100056711260219210201000274"
    ];

    for (let i = 0; i < barcodes.length; i++) {
        const b = barcodes[i];
        console.log(`\n\n======================================================`);
        console.log(`[START] TESTING BARCODE ${i + 1}: ${b}`);
        console.log(`======================================================\n`);

        const parsed = await BarcodeParserRouter.parse([b], companyId, supplierId);
        const rules = await prisma.supplierBarcodeRule.findMany({ where: { companyId }});
        
        const { fusedData, conflicts } = LabelDataFusionEngine.fuse(parsed, null, rules);
        
        const result = await ComplianceEngine.evaluate(fusedData, companyId, supplierId, conflicts);
        console.log(`[VEREDICT ${i + 1}] Result: ${result.status} | Reason: ${result.reason_code}`);

        // SIMULATE MAPPING ONLY FOR THE FIRST BARCODE
        if (i === 0 && result.status === 'REJECTED' && result.reason_code === 'UNMAPPED_GTIN') {
             console.log(`\n>>> SIMULATING USER MAPPING IN REVIEW QUEUE FOR BARCODE 1 <<<`);
             const parsedMock = {
                 rawBarcodes: [b],
                 gtin: fusedData.gtin.value || undefined,
                 product_code: fusedData.productCodeBase.value || undefined,
                 serial: fusedData.serial?.value || undefined,
                 symbology: 'UNKNOWN',
                 source_parser: fusedData.gtin.source === 'GS1_AI' ? 'GS1_AI' : 'EAN_VARIABLE'
             };
             const candidate = CanonicalIdentityGenerator.generate(parsedMock as any, supplierId);
             
             const identity = await prisma.canonicalBarcodeIdentity.create({
                 data: {
                     company_id: companyId,
                     identity_hash: candidate.identityHash,
                     identity_basis: candidate.identityBasis,
                     identity_input_type: candidate.identityInputType,
                     stable_signature: candidate.itemStableSignature,
                     supplier_context_id: candidate.supplierContextUsed ? supplierId : 'NO_SUPPLIER_CONTEXT',
                     source_integrity: candidate.sourceIntegrity,
                     status: 'ACTIVE'
                 }
             });

             const family = await OperationalFamilyResolver.findOrCreateFamily(companyId, `F-PIC_CH`, `DEBUG_F PICANHA`);
             
             await prisma.canonicalBarcodeIdentity.update({
                  where: { id: identity.id },
                  data: { operational_family_id: family.id }
             });

             await SupplierAliasResolver.createAlias(identity.id, candidate.itemStableSignature, candidate.identityBasis, 1.0, 'debug-user', supplierId);
             if (candidate.familyStableSignature) {
                 await SupplierAliasResolver.createAlias(identity.id, candidate.familyStableSignature, candidate.identityBasis, 1.0, 'debug-user', supplierId);
             }

             await OperationalFamilyResolver.bindSpecToFamily(family.id, 'debug-spec-99', 'debug-user');
             console.log(`>>> MAPPING COMPLETED. ALIASS SAVED (Item: ${candidate.itemStableSignature}, Family: ${candidate.familyStableSignature}). <<<\n`);
        }
    }
}

run().catch(console.error).finally(() => prisma.$disconnect());
